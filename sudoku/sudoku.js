/* DOM controller for the bundled, pre-validated Sudoku collection. */
class SudokuGame {
  constructor(root, options = {}) {
    this.root = root;
    this.collection = options.puzzles || SudokuPuzzles;
    this.random = options.random || Math.random;
    this.now = options.now || Date.now;
    this.analytics = options.analytics || (() => {});
    try { this.storage = options.storage === undefined ? window.localStorage : options.storage; } catch { this.storage = null; }
    this.key = options.storageKey || 'puzzleten:sudoku:v1';
    this.last = {}; this.selected = 0; this.notesMode = false; this.pendingDifficulty = null;
    this.cells = []; this.activeNumber = 0;
    this.build();
    const restored = this.restore();
    if (!restored) this.start('easy');
    else { this.render(); this.say('Saved game restored.'); }
    this.lastTick = this.now();
    this.onVisibility = () => { this.tick(); this.save(); };
    this.onPageHide = () => { this.tick(); this.save(); };
    this.wasVisible = !document.hidden;
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);
    this.interval = setInterval(() => { this.tick(); if (++this.saveTicks % 10 === 0) this.save(); }, 1000);
    this.saveTicks = 0;
    this.emit('game_view', {game_name: 'sudoku'});
  }
  $(name) { return this.root.querySelector('[data-sudoku="' + name + '"]'); }
  emit(name, params) { try { this.analytics(name, {game_name: 'sudoku', difficulty: this.puzzle?.difficulty, ...params}); } catch {} }
  say(text) { this.$('status').textContent = text; }
  build() {
    this.root.innerHTML = `
      <div class="sdk-top"><label>Next puzzle <select data-sudoku="difficulty" aria-label="New puzzle difficulty">
      <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="expert">Expert</option></select></label>
      <button type="button" data-sudoku="new" class="sdk-button">New puzzle</button></div>
      <div class="sdk-stats"><span data-sudoku="level"></span><span>Time <b data-sudoku="timer">00:00</b></span><span>Mistakes <b data-sudoku="mistakes">0</b></span><span>Hints <b data-sudoku="hints">0</b></span></div>
      <div class="sdk-layout"><div class="sdk-board" data-sudoku="board" role="grid" aria-label="Sudoku board" aria-rowcount="9" aria-colcount="9"></div>
      <div class="sdk-controls"><div class="sdk-actions">
      <button type="button" class="sdk-button" data-sudoku="notes" aria-pressed="false">Notes <span data-sudoku="notes-label">off</span></button>
      <button type="button" class="sdk-button" data-sudoku="erase">Erase</button>
      <button type="button" class="sdk-button" data-sudoku="hint">Hint</button></div>
      <div class="sdk-numbers" data-sudoku="numbers" aria-label="Number pad"></div>
      <p class="sdk-help">Tap a cell, then a number, or drag a number onto the board. Drag an entered answer outside the board to erase it.</p>
      <p class="sdk-help">Keyboard: 1–9, arrows, N for notes, Delete to erase.</p></div></div>
      <p class="sdk-status" data-sudoku="status" role="status" aria-live="polite"></p>
      <section class="sdk-complete" data-sudoku="complete" hidden tabindex="-1" aria-label="Puzzle complete"><h2>Puzzle complete!</h2><p data-sudoku="summary"></p><button type="button" class="sdk-button" data-sudoku="again">Play another</button></section>
      <p class="sdk-save" data-sudoku="save">Progress saves on this browser. The timer pauses when this tab is hidden.</p>
      <dialog class="sdk-dialog" data-sudoku="dialog" aria-labelledby="sdk-dialog-title"><h2 id="sdk-dialog-title">Switch to another puzzle?</h2><p>Your current puzzle will be replaced.</p><div class="sdk-actions"><button type="button" class="sdk-button" data-sudoku="cancel">Keep playing</button><button type="button" class="sdk-button" data-sudoku="confirm">Switch puzzle</button></div></dialog>`;
    for (let r = 0; r < 9; r++) {
      const row = document.createElement('div'); row.className = 'sdk-row'; row.setAttribute('role', 'row');
      for (let c = 0; c < 9; c++) {
        const i = r * 9 + c, cell = document.createElement('button');
        cell.type = 'button'; cell.className = 'sdk-cell'; cell.dataset.index = i;
        cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-rowindex', r + 1); cell.setAttribute('aria-colindex', c + 1);
        cell.addEventListener('click', () => this.select(i));
        cell.addEventListener('focus', () => { if (this.selected !== i) this.select(i, false); });
        row.append(cell); this.cells.push(cell);
      }
      this.$('board').append(row);
    }
    for (let n = 1; n <= 9; n++) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'sdk-number';
      button.textContent = n; button.dataset.number = n; button.setAttribute('aria-label', 'Enter ' + n); button.addEventListener('click', () => this.input(n)); this.$('numbers').append(button);
    }
    this.bindDrag();
    this.root.addEventListener('keydown', e => {
      if (!e.target.closest('select, dialog') && !this.$('dialog').open) this.keydown(e);
    });
    this.$('notes').addEventListener('click', () => this.toggleNotes());
    this.$('erase').addEventListener('click', () => this.erase());
    this.$('hint').addEventListener('click', () => this.hint());
    this.$('new').addEventListener('click', () => this.requestNew());
    this.$('again').addEventListener('click', () => this.requestNew());
    this.$('cancel').addEventListener('click', () => this.$('dialog').close());
    this.$('confirm').addEventListener('click', () => { const level = this.pendingDifficulty; this.$('dialog').close(); this.start(level); this.cells[this.selected].focus(); });
    this.$('dialog').addEventListener('close', () => { this.pendingDifficulty = null; this.lastTick = this.now(); });
  }
  bindDrag() {
    this.root.addEventListener('click', e => {
      if (this.suppressClick) { e.preventDefault(); e.stopImmediatePropagation(); this.suppressClick = false; }
    }, true);
    this.root.addEventListener('pointerdown', e => {
      this.suppressClick = false;
      if (e.button !== 0 || this.drag || this.done || this.$('dialog').open) return;
      const source = e.target.closest('.sdk-number, .sdk-cell');
      if (!source) return;
      const index = source.matches('.sdk-cell') ? Number(source.dataset.index) : -1;
      const value = index < 0 ? Number(source.dataset.number) : this.board[index];
      if (!value || (index >= 0 && this.puzzle.givens[index])) return;
      this.drag = {source, index, value, id:e.pointerId, x:e.clientX, y:e.clientY, moved:false};
      source.setPointerCapture(e.pointerId);
    });
    this.root.addEventListener('pointermove', e => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX-d.x, e.clientY-d.y) < 8) return;
      e.preventDefault();
      if (!d.moved) {
        d.moved = true;
        d.ghost = document.createElement('span'); d.ghost.className = 'sdk-drag-number';
        d.ghost.textContent = d.value; d.ghost.setAttribute('aria-hidden','true'); document.body.append(d.ghost);
      }
      d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
      this.root.querySelector('.is-drop-target')?.classList.remove('is-drop-target');
      const target = document.elementFromPoint(e.clientX,e.clientY)?.closest('.sdk-cell');
      if (d.index < 0 && target && this.root.contains(target) && !this.puzzle.givens[Number(target.dataset.index)]) target.classList.add('is-drop-target');
      this.$('board').classList.toggle('is-drag-out', d.index >= 0 && this.outsideBoard(e.clientX,e.clientY));
    });
    this.root.addEventListener('pointerup', e => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      const target = document.elementFromPoint(e.clientX,e.clientY)?.closest('.sdk-cell');
      this.cancelDrag();
      if (!d.moved) return;
      this.suppressClick = true;
      if (d.index < 0 && target && this.root.contains(target) && !this.puzzle.givens[Number(target.dataset.index)]) {
        this.select(Number(target.dataset.index)); this.input(d.value);
      } else if (d.index >= 0 && this.outsideBoard(e.clientX,e.clientY)) {
        this.select(d.index); this.erase();
      } else this.say('Drag cancelled. The board is unchanged.');
    });
    this.root.addEventListener('pointercancel', () => this.cancelDrag());
    this.root.addEventListener('lostpointercapture', () => this.cancelDrag());
    this.root.addEventListener('keydown', e => { if (e.key === 'Escape') this.cancelDrag(); });
  }
  outsideBoard(x,y) {
    const r = this.$('board').getBoundingClientRect();
    return x < r.left || x > r.right || y < r.top || y > r.bottom;
  }
  cancelDrag() {
    const d = this.drag; this.drag = null;
    if (!d) return;
    d.ghost?.remove();
    this.root.querySelector('.is-drop-target')?.classList.remove('is-drop-target');
    this.$('board').classList.remove('is-drag-out');
    if (d.source.hasPointerCapture(d.id)) d.source.releasePointerCapture(d.id);
  }
  select(i, focus = true) {
    this.selected = i; this.render(); this.save();
    if (focus) this.cells[i].focus({preventScroll: true});
  }
  keydown(event) {
    if (event.metaKey || event.altKey || (event.ctrlKey && !['Home', 'End'].includes(event.key))) return;
    const key = event.key, r = Math.floor(this.selected / 9), c = this.selected % 9;
    let next = this.selected;
    if (key === 'ArrowUp') next = Math.max(0, r - 1) * 9 + c;
    else if (key === 'ArrowDown') next = Math.min(8, r + 1) * 9 + c;
    else if (key === 'ArrowLeft') next = r * 9 + Math.max(0, c - 1);
    else if (key === 'ArrowRight') next = r * 9 + Math.min(8, c + 1);
    else if (key === 'Home') next = event.ctrlKey ? 0 : r * 9;
    else if (key === 'End') next = event.ctrlKey ? 80 : r * 9 + 8;
    else if (/^[1-9]$/.test(key)) { event.preventDefault(); this.input(Number(key)); return; }
    else if (['Backspace', 'Delete', '0'].includes(key)) { event.preventDefault(); this.erase(); return; }
    else if (key.toLowerCase() === 'n') { event.preventDefault(); this.toggleNotes(); return; }
    else return;
    event.preventDefault(); this.select(next);
  }
  start(difficulty) {
    this.cancelDrag(); this.activeNumber = 0;
    this.puzzle = SudokuModel.select(this.collection, difficulty, this.last[difficulty] ?? -1, this.random);
    this.last[difficulty] = this.puzzle.index;
    this.board = this.puzzle.givens.slice(); this.notes = Array(81).fill(0);
    this.selected = this.board.indexOf(0); this.notesMode = false;
    this.elapsed = 0; this.mistakes = 0; this.hints = 0; this.done = false;
    this.lastTick = this.now(); this.wasVisible = !document.hidden;
    this.$('difficulty').value = difficulty;
    this.render(); this.save(); this.say('New ' + difficulty + ' puzzle. Choose an empty cell to begin.');
    this.emit('game_start', {});
  }
  requestNew() {
    const difficulty = this.$('difficulty').value;
    const changed = this.board.some((n, i) => n !== this.puzzle.givens[i]) || this.notes.some(Boolean);
    if (changed && !this.done) { this.tick(); this.pendingDifficulty = difficulty; this.$('dialog').showModal(); }
    else this.start(difficulty);
  }
  toggleNotes() {
    if (this.done) return;
    this.notesMode = !this.notesMode; this.render(); this.save(); this.say(this.notesMode ? 'Notes on. Numbers toggle pencil marks in empty cells.' : 'Notes off. Numbers enter answers.');
  }
  input(n) {
    if (this.done || this.$('dialog').open || !Number.isInteger(n) || n < 1 || n > 9) return;
    this.activeNumber = n; this.render();
    if (this.puzzle.givens[this.selected]) { this.say('Choose an empty cell, or drag this number onto one.'); return; }
    this.tick();
    const i = this.selected;
    if (this.notesMode) {
      if (this.board[i]) { this.say('Erase the answer first to add notes.'); return; }
      this.notes[i] ^= 1 << (n - 1);
      this.say('Notes updated.');
    } else {
      if (this.board[i] === n) return;
      this.board[i] = n; this.notes[i] = 0;
      if (n !== this.puzzle.solution[i]) { this.mistakes++; this.say('That number does not match the solution. You can erase or replace it.'); }
      else { this.cleanNotes(i, n); this.say('Number placed.'); }
    }
    this.finishIfComplete(); this.render(); this.save();
  }
  cleanNotes(index, n) {
    for (let i = 0; i < 81; i++) if (Math.floor(i/9) === Math.floor(index/9) || i%9 === index%9 || (Math.floor(i/27) === Math.floor(index/27) && Math.floor(i%9/3) === Math.floor(index%9/3))) this.notes[i] &= ~(1 << (n-1));
  }
  erase() {
    if (this.done || this.puzzle.givens[this.selected] || this.$('dialog').open) return;
    this.tick(); this.board[this.selected] = 0; this.notes[this.selected] = 0;
    this.render(); this.save(); this.say('Cell cleared.');
  }
  hint() {
    if (this.done || this.$('dialog').open) return;
    const hint = SudokuModel.hint(this.board, this.puzzle, this.selected);
    if (!hint) return;
    this.tick(); this.selected = hint.index; this.board[hint.index] = hint.value; this.notes[hint.index] = 0; this.cleanNotes(hint.index, hint.value); this.hints++;
    this.say(`Hint: row ${Math.floor(hint.index/9)+1}, column ${hint.index%9+1} is ${hint.value}.`);
    this.emit('sudoku_hint', {hints: this.hints});
    this.finishIfComplete(); this.render(); this.save();
  }
  finishIfComplete() {
    if (!this.done && SudokuModel.complete(this.board, this.puzzle.solution)) {
      this.done = true;
      this.say('Puzzle complete!');
      this.emit('game_over', {seconds_played: Math.floor(this.elapsed/1000), mistakes: this.mistakes, hints: this.hints});
    }
  }
  timeText() {
    const seconds = Math.floor(this.elapsed/1000);
    return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
  }
  tick() {
    const now = this.now();
    if (!this.done && this.wasVisible && !this.$('dialog').open) this.elapsed += Math.max(0, now - this.lastTick);
    this.lastTick = now; this.wasVisible = !document.hidden;
    this.$('timer').textContent = this.timeText();
  }
  render() {
    const sr = Math.floor(this.selected/9), sc = this.selected%9, chosen = this.board[this.selected];
    this.cells.forEach((cell, i) => {
      const r = Math.floor(i/9), c = i%9, value = this.board[i], given = this.puzzle.givens[i] !== 0;
      const related = r === sr || c === sc || (Math.floor(r/3) === Math.floor(sr/3) && Math.floor(c/3) === Math.floor(sc/3));
      const wrong = value !== 0 && value !== this.puzzle.solution[i];
      cell.className = 'sdk-cell' + (related ? ' is-related' : '') + (chosen && value === chosen ? ' is-matching' : '') + (given ? ' is-given' : '') + (wrong ? ' is-wrong' : '') + (i === this.selected ? ' is-selected' : '');
      cell.classList.toggle('is-draggable', !given && !!value && !this.done);
      cell.tabIndex = i === this.selected ? 0 : -1;
      cell.setAttribute('aria-selected', String(i === this.selected)); cell.setAttribute('aria-readonly', String(given || this.done)); cell.setAttribute('aria-invalid', String(wrong));
      const noteValues = Array.from({length:9}, (_,n)=>n+1).filter(n=>this.notes[i] & (1<<(n-1)));
      cell.setAttribute('aria-label', `Row ${r+1}, column ${c+1}: ${value || 'empty'}${given ? ', given' : ''}${wrong ? ', mistake' : ''}${noteValues.length ? ', notes '+noteValues.join(', ') : ''}`);
      cell.replaceChildren();
      if (value) cell.textContent = value;
      else if (noteValues.length) {
        const notes = document.createElement('span'); notes.className = 'sdk-pencil'; notes.setAttribute('aria-hidden','true');
        for(let n=1;n<=9;n++){ const mark=document.createElement('span');mark.textContent=noteValues.includes(n)?n:'';notes.append(mark); } cell.append(notes);
      }
    });
    this.$('notes').setAttribute('aria-pressed', String(this.notesMode)); this.$('notes-label').textContent = this.notesMode ? 'on' : 'off';
    this.$('level').textContent = this.puzzle.difficulty[0].toUpperCase()+this.puzzle.difficulty.slice(1);
    this.$('timer').textContent = this.timeText(); this.$('mistakes').textContent = this.mistakes; this.$('hints').textContent = this.hints;
    const locked = this.done || this.puzzle.givens[this.selected] !== 0;
    this.$('numbers').querySelectorAll('button').forEach(button=>{button.disabled=this.done; button.setAttribute('aria-pressed', String(Number(button.dataset.number) === this.activeNumber));});
    this.$('erase').disabled = locked; this.$('notes').disabled = this.done; this.$('hint').disabled = this.done;
    this.$('complete').hidden = !this.done;
    if (this.done) this.$('summary').textContent = `${this.$('level').textContent} · ${this.timeText()} · ${this.mistakes} mistakes · ${this.hints} hints. Nicely done!`;
  }
  save() {
    try {
      if (!this.storage) throw Error('unavailable');
      this.storage.setItem(this.key, JSON.stringify({version:1, difficulty:this.puzzle.difficulty, index:this.puzzle.index, givens:this.puzzle.givens.join(''),board:this.board, notes:this.notes,selected:this.selected,notesMode:this.notesMode,elapsed:this.elapsed,mistakes:this.mistakes,hints:this.hints,last:this.last}));
    } catch { this.$('save').textContent = 'Browser storage is unavailable. You can play, but progress will not be saved.'; }
  }
  restore() {
    try {
      const s = JSON.parse(this.storage?.getItem(this.key) || 'null');
      if (!s || s.version !== 1 || !SudokuModel.levels.includes(s.difficulty) || !Number.isInteger(s.index) || !this.collection[s.difficulty]?.[s.index]) return false;
      const packed=this.collection[s.difficulty][s.index], givens=[...packed.slice(0,81)].map(Number), solution=[...packed.slice(81)].map(Number);
      if (s.givens !== givens.join('') || !Array.isArray(s.board) || s.board.length!==81 || !s.board.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=9&&(!givens[i]||n===givens[i]))) return false;
      if (!Array.isArray(s.notes) || s.notes.length!==81 || !s.notes.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=511&&(!s.board[i]||n===0))) return false;
      if (![s.elapsed,s.mistakes,s.hints].every(n=>Number.isSafeInteger(n)&&n>=0) || !Number.isInteger(s.selected) || s.selected<0 || s.selected>80 || typeof s.notesMode!=='boolean') return false;
      this.puzzle={difficulty:s.difficulty,index:s.index,givens,solution}; this.board=s.board; this.notes=s.notes;this.selected=s.selected;this.notesMode=s.notesMode;this.elapsed=s.elapsed;this.mistakes=s.mistakes;this.hints=s.hints;
      this.done=SudokuModel.complete(this.board,solution);this.last={};
      for(const level of SudokuModel.levels)if(Number.isInteger(s.last?.[level])&&s.last[level]>=0&&s.last[level]<this.collection[level].length)this.last[level]=s.last[level];
      this.last[s.difficulty]=s.index;this.$('difficulty').value=s.difficulty;return true;
    } catch { return false; }
  }
  destroy() { this.cancelDrag(); clearInterval(this.interval); document.removeEventListener('visibilitychange',this.onVisibility); window.removeEventListener('pagehide',this.onPageHide); }
}
