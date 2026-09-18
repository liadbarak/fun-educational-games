/* Drag/drop, click/tap and keyboard controller for the turn-based Blocks rules. */
class BlocksGame {
  constructor(root, { scores, analytics = () => {}, random = Math.random } = {}) {
    this.root = root;
    this.scores = scores;
    this.analytics = analytics;
    this.game = new BlocksRules.Game(random);
    this.selected = null;
    this.startedAt = null;
    try { this.best = Math.max(0, Number(scores?.read('blocks')) || 0); } catch { this.best = 0; }
    this.build();
    this.bind();
    this.render();
    this.say('Drag a piece onto the board, or tap a piece then a cell.');
  }

  build() {
    this.root.innerHTML = `
      <div class="blocks-toolbar">
        <dl class="blocks-stats">
          <div><dt>Score</dt><dd data-score>0</dd></div>
          <div><dt>Best</dt><dd data-best>0</dd></div>
          <div><dt>Lines</dt><dd data-lines>0</dd></div>
        </dl>
        <button class="blocks-button" data-restart type="button">New game</button>
      </div>
      <div class="blocks-board" role="group" aria-label="8 by 8 board" aria-describedby="blocks-status">
        ${Array.from({ length: 64 }, (_, i) => `<button class="blocks-cell" type="button" data-index="${i}" tabindex="${i === 0 ? 0 : -1}"></button>`).join('')}
      </div>
      <p class="blocks-status" id="blocks-status" role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="blocks-hand" role="group" aria-label="Choose a piece">
        ${Array.from({ length: 3 }, (_, slot) => `<button class="blocks-piece" type="button" data-slot="${slot}" data-color="${slot + 1}" aria-pressed="false"></button>`).join('')}
      </div>
      <div class="blocks-over" hidden>
        <h2>No more room</h2>
        <p data-result></p>
        <button class="blocks-button blocks-primary" data-again type="button">Play again</button>
      </div>
      <dialog class="blocks-dialog" aria-labelledby="blocks-restart-title">
        <h2 id="blocks-restart-title">Start a new game?</h2>
        <p>This clears your current board. Your best score stays saved.</p>
        <form method="dialog">
          <button class="blocks-button" value="cancel" autofocus>Keep playing</button>
          <button class="blocks-button blocks-primary" value="restart">Start new game</button>
        </form>
      </dialog>`;
    this.cells = [...this.root.querySelectorAll('.blocks-cell')];
    this.pieces = [...this.root.querySelectorAll('.blocks-piece')];
    this.board = this.root.querySelector('.blocks-board');
    this.dialog = this.root.querySelector('dialog');
    this.status = this.root.querySelector('.blocks-status');
    this.overPanel = this.root.querySelector('.blocks-over');
  }

  bind() {
    this.drag = null;
    this.suppressClick = false;
    this.root.addEventListener('click', event => {
      // A completed/cancelled drag must not become a second tap placement.
      if (this.suppressClick && event.detail !== 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.suppressClick = false;
      }
    }, true);
    this.pieces.forEach((button, slot) => {
      button.addEventListener('pointerdown', event => this.beginDrag(event, slot));
      button.addEventListener('pointermove', event => this.moveDrag(event));
      button.addEventListener('pointerup', event => this.endDrag(event));
      button.addEventListener('pointercancel', event => this.cancelDrag(event));
      button.addEventListener('lostpointercapture', event => this.cancelDrag(event));
      button.addEventListener('dragstart', event => event.preventDefault());
    });
    this.pieces.forEach((button, slot) => button.addEventListener('click', event => {
      if (this.game.over || this.game.hand[slot] === null) return;
      this.selected = this.selected === slot ? null : slot;
      this.clearPreview();
      this.renderHand();
      if (this.selected === null) this.say('Piece deselected. Choose another piece.');
      else {
        const id = this.game.hand[slot];
        const shape = BlocksRules.SHAPES[id];
        this.say(this.game.hasSpace(id)
          ? `${shape.name} selected. Tap a board cell for its dotted block.`
          : `${shape.name} does not fit yet. Try another piece to make space.`);
        if (event.detail === 0) this.focusCell(this.cells.findIndex(cell => cell.tabIndex === 0));
      }
    }));
    this.cells.forEach((button, index) => {
      button.addEventListener('click', () => this.place(index));
      button.addEventListener('pointerenter', event => {
        if (!this.drag && event.pointerType !== 'touch') this.preview(index);
      });
      button.addEventListener('focus', () => this.preview(index));
      button.addEventListener('blur', () => this.clearPreview());
      button.addEventListener('keydown', event => {
        const row = Math.floor(index / 8), col = index % 8;
        const next = {
          ArrowLeft: row * 8 + Math.max(0, col - 1),
          ArrowRight: row * 8 + Math.min(7, col + 1),
          ArrowUp: Math.max(0, row - 1) * 8 + col,
          ArrowDown: Math.min(7, row + 1) * 8 + col,
          Home: row * 8,
          End: row * 8 + 7,
        }[event.key];
        if (next !== undefined) {
          event.preventDefault();
          this.focusCell(next);
        }
      });
    });
    this.board.addEventListener('pointerleave', () => { if (!this.drag) this.clearPreview(); });
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !this.dialog.open) {
        this.cancelDrag();
        this.selected = null;
        this.clearPreview();
        this.renderHand();
        this.say('Piece deselected. Choose a piece to continue.');
      }
    });
    this.root.querySelector('[data-restart]').addEventListener('click', () => {
      if (this.game.moves && !this.game.over) {
        this.dialog.returnValue = '';
        this.dialog.showModal();
      } else this.reset();
    });
    this.dialog.addEventListener('close', () => {
      if (this.dialog.returnValue === 'restart') this.reset();
    });
    this.root.querySelector('[data-again]').addEventListener('click', () => this.reset());
  }

  beginDrag(event, slot) {
    if (this.drag || this.game.over || this.game.hand[slot] === null ||
        event.button !== 0 || event.isPrimary === false) return;
    this.suppressClick = false;
    const mini = event.target.closest('.blocks-mini');
    const bounds = mini?.getBoundingClientRect();
    this.drag = {
      pointerId: event.pointerId, slot, button: this.pieces[slot],
      startX: event.clientX, startY: event.clientY, active: false,
      row: mini ? Number(mini.dataset.row) : 0,
      col: mini ? Number(mini.dataset.col) : 0,
      fractionX: bounds ? (event.clientX - bounds.left) / bounds.width : .5,
      fractionY: bounds ? (event.clientY - bounds.top) / bounds.height : .5,
      lift: event.pointerType === 'touch' ? 56 : 0,
    };
    try { this.drag.button.setPointerCapture(event.pointerId); } catch { /* Synthetic test events have no active pointer. */ }
  }
  moveDrag(event) {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
    event.preventDefault();
    if (!drag.active) {
      drag.active = true;
      this.selected = drag.slot;
      this.renderHand();
      drag.button.classList.add('is-dragging');
      drag.ghost = drag.button.querySelector('.blocks-shape').cloneNode(true);
      drag.ghost.classList.add('blocks-drag-ghost');
      drag.ghost.dataset.color = drag.slot + 1;
      drag.ghost.setAttribute('aria-hidden', 'true');
      this.root.appendChild(drag.ghost);
      this.say('Release on the board to place. Release outside it to cancel.');
    }
    // Scale the floating piece to the board, keeping the grabbed block under
    // the pointer. On touch, lift it so the finger does not cover the preview.
    const cell = this.cells[0].getBoundingClientRect();
    const next = this.cells[1].getBoundingClientRect();
    const pitch = next.left - cell.left;
    const left = event.clientX - (drag.col * pitch + drag.fractionX * cell.width);
    const top = event.clientY - (drag.row * pitch + drag.fractionY * cell.height) - drag.lift;
    drag.ghost.style.setProperty('--drag-cell', cell.width + 'px');
    drag.ghost.style.gap = (pitch - cell.width) + 'px';
    drag.ghost.style.left = left + 'px';
    drag.ghost.style.top = top + 'px';
    const row = Math.floor((top + cell.height / 2 - cell.top) / pitch);
    const col = Math.floor((left + cell.width / 2 - cell.left) / pitch);
    drag.index = row >= 0 && row < 8 && col >= 0 && col < 8 ? row * 8 + col : null;
    this.clearPreview();
    if (drag.index !== null) this.preview(drag.index);
    const valid = drag.index !== null && this.game.fits(this.game.hand[drag.slot], row, col);
    drag.ghost.classList.toggle('is-over-board', drag.index !== null);
    drag.ghost.classList.toggle('is-invalid-drop', drag.index !== null && !valid);
  }
  cleanDrag() {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null; // Releasing capture can dispatch lostpointercapture.
    drag.ghost?.remove();
    drag.button.classList.remove('is-dragging');
    try {
      if (drag.button.hasPointerCapture(drag.pointerId)) drag.button.releasePointerCapture(drag.pointerId);
    } catch { /* Pointer may already have been cancelled by the browser. */ }
    this.clearPreview();
  }
  endDrag(event) {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.active) { this.cleanDrag(); return; } // Ordinary tap/click selects.
    this.moveDrag(event); // Use release coordinates even without a final move event.
    const index = drag.index;
    const valid = index !== null && this.game.fits(this.game.hand[drag.slot], Math.floor(index / 8), index % 8);
    this.suppressClick = true;
    this.cleanDrag();
    if (valid) this.place(index);
    else {
      this.selected = null;
      this.renderHand();
      this.say(index === null ? 'Piece returned to the tray.' : 'That piece will not fit there. Try another spot.');
    }
  }
  cancelDrag(event) {
    if (!this.drag || (event && event.pointerId !== this.drag.pointerId)) return;
    const active = this.drag.active;
    this.cleanDrag();
    if (active) {
      this.suppressClick = true;
      this.selected = null;
      this.renderHand();
      this.say('Drag cancelled. Piece returned to the tray.');
    }
  }

  say(message) { this.status.textContent = message; }
  emit(name, params = {}) {
    try { this.analytics(name, { game_name: 'blocks', ...params }); } catch { /* Tracking never blocks play. */ }
  }
  focusCell(index) {
    this.cells.forEach((cell, i) => { cell.tabIndex = i === index ? 0 : -1; });
    this.cells[index].focus({ preventScroll: true });
  }
  clearPreview() {
    this.cells.forEach(cell => cell.classList.remove('is-preview', 'is-invalid', 'is-anchor'));
  }
  preview(index) {
    this.clearPreview();
    if (this.selected === null || this.game.over) return;
    const id = this.game.hand[this.selected];
    const row = Math.floor(index / 8), col = index % 8;
    const valid = this.game.fits(id, row, col);
    for (const [dr, dc] of BlocksRules.SHAPES[id].cells) {
      if (row + dr < 8 && col + dc < 8) {
        this.cells[(row + dr) * 8 + col + dc].classList.add(valid ? 'is-preview' : 'is-invalid');
      }
    }
    this.cells[index].classList.add('is-anchor');
  }
  place(index) {
    if (this.game.over) return;
    if (this.selected === null) {
      this.say('Choose one of the three pieces below the board first.');
      return;
    }
    const result = this.game.place(this.selected, Math.floor(index / 8), index % 8);
    if (!result.ok) {
      this.preview(index);
      this.say('That piece will not fit there. Try another cell or choose another piece.');
      return;
    }
    if (this.startedAt === null) {
      this.startedAt = Date.now();
      this.emit('game_start');
    }
    this.selected = null;
    this.clearPreview();
    const record = this.game.score > this.best;
    if (record) {
      this.best = this.game.score;
      try { this.scores?.write('blocks', this.best); } catch { /* Private browsing can deny storage. */ }
    }
    this.render(result.cleared);
    const feedback = result.lines
      ? `${result.lines} ${result.lines === 1 ? 'line' : 'lines'} cleared! +${result.points} points.`
      : `+${result.points} ${result.points === 1 ? 'point' : 'points'}.`;
    if (result.over) {
      this.say(`${feedback} No remaining piece fits. Final score: ${this.game.score}.`);
      this.root.querySelector('[data-result]').textContent = `You scored ${this.game.score} with ${this.game.lines} ${this.game.lines === 1 ? 'line' : 'lines'} cleared.`;
      this.root.querySelector('[data-again]').focus({ preventScroll: true });
      this.emit('game_over', { score: this.game.score, lines: this.game.lines,
        seconds_played: Math.round((Date.now() - this.startedAt) / 1000), is_record: record });
    } else {
      this.say(`${feedback} ${result.newHand ? 'Three new pieces. ' : ''}Choose your next piece.`);
      // After placing, return keyboard users directly to the remaining choices.
      this.pieces.find(piece => !piece.disabled).focus({ preventScroll: true });
    }
  }
  render(cleared = []) {
    this.cells.forEach((cell, index) => {
      cell.dataset.color = this.game.board[index];
      cell.setAttribute('aria-label', `Row ${Math.floor(index / 8) + 1}, column ${index % 8 + 1}, ${this.game.board[index] ? 'filled' : 'empty'}`);
      cell.setAttribute('aria-disabled', String(this.game.over));
      cell.classList.toggle('is-cleared', cleared.includes(index));
    });
    this.root.querySelector('[data-score]').textContent = this.game.score;
    this.root.querySelector('[data-best]').textContent = this.best;
    this.root.querySelector('[data-lines]').textContent = this.game.lines;
    this.overPanel.hidden = !this.game.over;
    this.renderHand();
  }
  renderHand() {
    this.pieces.forEach((button, slot) => {
      const id = this.game.hand[slot], shape = id === null ? null : BlocksRules.SHAPES[id];
      button.disabled = shape === null || this.game.over;
      button.setAttribute('aria-pressed', String(slot === this.selected));
      button.setAttribute('aria-label', shape ? `Piece ${slot + 1}: ${shape.name}, ${shape.cells.length} blocks` : `Piece ${slot + 1}: used`);
      button.innerHTML = shape
        ? `<span class="blocks-shape" aria-hidden="true">${shape.cells.map(([r, c]) => `<span class="blocks-mini is-block${r === 0 && c === 0 ? ' is-anchor' : ''}" data-row="${r}" data-col="${c}" style="grid-row:${r + 1};grid-column:${c + 1}"></span>`).join('')}</span><span class="blocks-piece-label">${slot === this.selected ? 'Selected' : shape.name}</span>`
        : '<span class="blocks-shape" aria-hidden="true"></span><span class="blocks-piece-label">Placed ✓</span>';
    });
  }
  reset() {
    this.cancelDrag();
    this.game.reset();
    this.selected = null;
    this.startedAt = null;
    this.clearPreview();
    this.render();
    this.say('Fresh board. Choose a piece to begin.');
    this.pieces[0].focus({ preventScroll: true });
  }
}
