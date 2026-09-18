(async () => {
  const fixture = document.getElementById('fixture');
  const assert = (value, message) => { if (!value) throw new Error(message); };
  let app, root, saved, events;
  function mount(config = {}) {
    fixture.innerHTML = '<div class="blocks-main"><section id="blocks-game"></section></div>';
    root = fixture.querySelector('section');
    saved = 12;
    events = [];
    app = new BlocksGame(root, { random: () => 0, scores: {
      read: () => saved, write: (_, value) => { saved = value; },
    }, analytics: (name, params) => events.push({ name, params }), ...config });
  }
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  // Use the real Pointer Events path, including the compatibility click after a drag.
  function pointer(target, type, x, y, options = {}) {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
      pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
      clientX: x, clientY: y, ...options }));
  }
  function dragTo(slot, index, { touch = false, block = 0 } = {}) {
    const button = app.pieces[slot];
    const mini = button.querySelectorAll('.blocks-mini')[block];
    const source = mini.getBoundingClientRect();
    const cell = app.cells[index].getBoundingClientRect();
    const pitch = app.cells[1].getBoundingClientRect().left - app.cells[0].getBoundingClientRect().left;
    const x = cell.left + cell.width / 2 + Number(mini.dataset.col) * pitch;
    const y = cell.top + cell.height / 2 + Number(mini.dataset.row) * pitch + (touch ? 56 : 0);
    const options = { pointerType: touch ? 'touch' : 'mouse' };
    pointer(mini, 'pointerdown', source.left + source.width / 2, source.top + source.height / 2, options);
    pointer(button, 'pointermove', x, y, options);
    return { button, x, y, options };
  }
  const cases = [
    ['mouse drag places exactly once and suppresses the release click', () => {
      const d = dragTo(0, 9);
      assert(app.cells[9].classList.contains('is-preview'), 'missing drag preview');
      assert(root.querySelector('.blocks-drag-ghost'), 'floating piece missing');
      pointer(d.button, 'pointerup', d.x, d.y);
      d.button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      assert(app.game.score === 1 && app.game.board[9] === 1, 'drop failed or double-placed');
      assert(app.selected === null && !app.drag, 'drag left a selection');
      assert(!root.querySelector('.blocks-drag-ghost'), 'ghost not removed');
    }],
    ['touch drag preserves the grabbed block and lifted preview position', () => {
      app.game.hand = [7, 0, 0]; app.render();
      const d = dragTo(0, 18, { touch: true, block: 3 });
      assert(app.cells[18].classList.contains('is-anchor'), 'wrong touch anchor');
      pointer(d.button, 'pointerup', d.x, d.y, d.options);
      assert(app.game.score === 4 && [18,19,26,27].every(i => app.game.board[i]), 'touch square misplaced');
    }],
    ['invalid and off-board drops preserve the hand and score', () => {
      app.game.hand = [7, 0, 0]; app.render();
      const before = JSON.stringify(app.game);
      let d = dragTo(0, 63);
      assert(app.cells[63].classList.contains('is-invalid'), 'edge preview should be invalid');
      pointer(d.button, 'pointerup', d.x, d.y);
      assert(JSON.stringify(app.game) === before, 'edge drop changed game');
      d = dragTo(0, 0);
      pointer(d.button, 'pointerup', d.x - 1000, d.y - 1000);
      assert(JSON.stringify(app.game) === before && !app.drag, 'outside drop changed game');
      app.game.board[0] = 2;
      d = dragTo(0, 0); pointer(d.button, 'pointerup', d.x, d.y);
      assert(app.game.score === 0 && app.game.board[0] === 2, 'overlap drop changed game');
    }],
    ['pointer cancellation and lost capture return the piece without placement', () => {
      for (const type of ['pointercancel', 'lostpointercapture']) {
        const d = dragTo(0, 9);
        pointer(d.button, type, d.x, d.y);
        assert(!app.drag && app.game.score === 0 && app.selected === null, type + ' did not cancel');
        assert(!root.querySelector('.blocks-drag-ghost'), type + ' left a ghost');
      }
    }],
    ['a short pointer gesture stays a tap and a second pointer cannot hijack a drag', () => {
      const button = app.pieces[0], rect = button.getBoundingClientRect();
      pointer(button, 'pointerdown', rect.left + 5, rect.top + 5);
      pointer(button, 'pointermove', rect.left + 7, rect.top + 7);
      pointer(button, 'pointerup', rect.left + 7, rect.top + 7);
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      assert(app.selected === 0 && !app.drag, 'tap no longer selects');
      const d = dragTo(1, 10);
      pointer(d.button, 'pointerup', d.x, d.y, { pointerId: 2, isPrimary: false });
      assert(app.drag && app.game.score === 0, 'secondary pointer ended drag');
      pointer(d.button, 'pointerup', d.x, d.y);
      assert(app.game.board[10] === 2 && app.game.score === 1, 'primary pointer drop failed');
    }],
    ['place with selection, retain a used slot, and refresh after the third piece', () => {
      app.pieces[0].click(); app.cells[0].click();
      assert(app.game.score === 1 && app.cells[0].dataset.color === '1', 'placement missing');
      assert(app.pieces[0].disabled && !app.pieces[1].disabled, 'used slot incorrect');
      app.pieces[1].click(); app.cells[8].click();
      app.pieces[2].click(); app.cells[16].click();
      assert(app.pieces.every(p => !p.disabled) && app.game.score === 3, 'hand did not refill');
      assert(events.filter(e => e.name === 'game_start').length === 1, 'start event duplicated');
    }],
    ['invalid overlap retains the piece and announces why it failed', () => {
      app.pieces[0].click(); app.cells[0].click();
      app.pieces[1].click(); app.cells[0].click();
      assert(app.game.score === 1 && app.selected === 1, 'invalid move consumed piece');
      assert(app.status.textContent.includes('will not fit'), 'missing feedback');
      assert(app.cells[0].classList.contains('is-invalid'), 'missing invalid preview');
    }],
    ['keyboard selection moves to board and arrow keys do not wrap rows', () => {
      app.pieces[0].click();
      assert(document.activeElement === app.cells[0], 'selection did not focus board');
      app.cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      assert(document.activeElement === app.cells[0], 'left wrapped');
      app.cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      assert(document.activeElement === app.cells[8], 'down not handled');
      assert(app.cells.filter(c => c.tabIndex === 0).length === 1, 'multiple board tab stops');
      app.cells[8].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      assert(app.selected === null, 'escape failed');
    }],
    ['row-and-column clear updates score, board labels and line count', () => {
      for (let i = 1; i < 8; i++) { app.game.board[i] = 1; app.game.board[i * 8] = 1; }
      app.render(); app.pieces[0].click(); app.cells[0].click();
      assert(root.querySelector('[data-score]').textContent === '21', 'wrong score');
      assert(root.querySelector('[data-lines]').textContent === '2', 'wrong line count');
      assert(app.cells.every(c => c.getAttribute('aria-label').endsWith('empty')), 'stale board labels');
      assert(app.status.textContent.includes('2 lines cleared'), 'clear not announced');
      assert(saved === 21, 'best was not persisted');
      mount({ scores: { read: () => 21 } });
      assert(root.querySelector('[data-best]').textContent === '21', 'best did not load');
    }],
    ['game over disables pieces, focuses replay and replay preserves best', () => {
      app.game.board = Array.from({ length: 64 }, (_, i) => (Math.floor(i / 8) + i % 8) % 2);
      app.game.hand = [0, 7, 8]; app.render();
      app.pieces[0].click(); app.cells[0].click();
      assert(!app.overPanel.hidden && app.pieces.every(p => p.disabled), 'missing game over');
      assert(document.activeElement === root.querySelector('[data-again]'), 'replay not focused');
      assert(events.filter(e => e.name === 'game_over').length === 1, 'game over event missing');
      root.querySelector('[data-again]').click();
      assert(app.overPanel.hidden && app.game.score === 0 && app.best === 12, 'bad replay reset');
    }],
    ['restart cancel keeps the run; confirm clears it', async () => {
      app.pieces[0].click(); app.cells[0].click();
      root.querySelector('[data-restart]').click();
      assert(app.dialog.open, 'no confirmation');
      app.dialog.close('cancel'); await tick();
      assert(app.game.score === 1, 'cancel lost the run');
      root.querySelector('[data-restart]').click();
      app.dialog.close('restart'); await tick();
      assert(app.game.score === 0 && app.best === 12, 'confirm failed');
    }],
    ['blocked storage and failed analytics cannot stop a move', () => {
      mount({ scores: { read: () => { throw Error('denied'); }, write: () => { throw Error('denied'); } },
        analytics: () => { throw Error('offline'); } });
      app.pieces[0].click(); app.cells[0].click();
      assert(app.game.score === 1 && app.best === 1, 'storage stopped play');
    }],
    ['board and tray stay within narrow page widths', () => {
      for (const width of [320, 390, 720]) {
        fixture.style.width = width + 'px';
        const bounds = fixture.getBoundingClientRect();
        for (const element of [app.board, ...app.pieces]) {
          const rect = element.getBoundingClientRect();
          assert(rect.left >= bounds.left && rect.right <= bounds.right + 1, 'overflow at ' + width);
        }
        const rect = app.cells[0].getBoundingClientRect();
        assert(rect.width >= 24 && Math.abs(rect.width - rect.height) < 1, 'cells too small or not square');
      }
    }],
  ];
  let passed = 0, failed = 0;
  for (const [name, run] of cases) {
    mount();
    const item = document.createElement('li');
    try { await run(); passed++; item.className = 'pass'; item.textContent = 'PASS — ' + name; }
    catch (error) { failed++; item.className = 'fail'; item.textContent = 'FAIL — ' + name + ': ' + error.message; }
    document.getElementById('results').appendChild(item);
  }
  fixture.remove();
  const summary = document.getElementById('summary');
  summary.className = failed ? 'fail' : 'pass';
  summary.textContent = `${passed} passed · ${failed} failed`;
  window.TEST_RESULT = { passed, failed };
})();
