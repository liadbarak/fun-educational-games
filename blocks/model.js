/* Turn-based rules, independent of the DOM. Also loaded by the Node tests. */
const BlocksRules = (() => {
  const SIZE = 8;
  // Coordinates are [row, column]. Every shape includes its top-left cell,
  // marked with a dot in the tray, so tap-to-place has an unambiguous anchor.
  const SHAPES = [
    { name: 'Single block', cells: [[0, 0]] },
    { name: 'Two across', cells: [[0, 0], [0, 1]] },
    { name: 'Two down', cells: [[0, 0], [1, 0]] },
    { name: 'Three across', cells: [[0, 0], [0, 1], [0, 2]] },
    { name: 'Three down', cells: [[0, 0], [1, 0], [2, 0]] },
    { name: 'Four across', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { name: 'Four down', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { name: 'Small square', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { name: 'Large square', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
    { name: 'Corner down', cells: [[0, 0], [1, 0], [1, 1]] },
    { name: 'Corner across', cells: [[0, 0], [0, 1], [1, 0]] },
    { name: 'Corner right', cells: [[0, 0], [0, 1], [1, 1]] },
    { name: 'Tall L', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    { name: 'Wide L', cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
    { name: 'T shape', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { name: 'Step shape', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  ];

  class Game {
    constructor(random = Math.random) {
      this.random = random;
      this.reset();
    }
    reset() {
      this.board = Array(SIZE * SIZE).fill(0);
      this.score = 0;
      this.lines = 0;
      this.moves = 0;
      this.over = false;
      this.deal();
    }
    deal() {
      this.hand = Array.from({ length: 3 }, () => Math.floor(this.random() * SHAPES.length));
    }
    fits(shapeId, row, col) {
      const shape = SHAPES[shapeId];
      if (shapeId === null || !shape || !Number.isInteger(row) || !Number.isInteger(col)) return false;
      return shape.cells.every(([dr, dc]) => {
        const r = row + dr, c = col + dc;
        return r >= 0 && r < SIZE && c >= 0 && c < SIZE && !this.board[r * SIZE + c];
      });
    }
    hasSpace(shapeId) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) if (this.fits(shapeId, r, c)) return true;
      }
      return false;
    }
    hasMove() {
      return this.hand.some(id => id !== null && this.hasSpace(id));
    }
    place(slot, row, col) {
      if (this.over || !Number.isInteger(slot) || slot < 0 || slot > 2 ||
          !this.fits(this.hand[slot], row, col)) return { ok: false };
      const shape = SHAPES[this.hand[slot]];
      for (const [dr, dc] of shape.cells) this.board[(row + dr) * SIZE + col + dc] = slot + 1;
      // Find both axes before clearing either: intersections belong to both lines.
      const rows = [], cols = [];
      for (let i = 0; i < SIZE; i++) {
        if (this.board.slice(i * SIZE, (i + 1) * SIZE).every(Boolean)) rows.push(i);
        if (Array.from({ length: SIZE }, (_, r) => this.board[r * SIZE + i]).every(Boolean)) cols.push(i);
      }
      const cleared = [];
      this.board.forEach((_, i) => {
        if (rows.includes(Math.floor(i / SIZE)) || cols.includes(i % SIZE)) {
          cleared.push(i);
          this.board[i] = 0;
        }
      });
      const lines = rows.length + cols.length;
      const points = shape.cells.length + 10 * lines;
      this.score += points;
      this.lines += lines;
      this.moves++;
      this.hand[slot] = null;
      const newHand = this.hand.every(id => id === null);
      if (newHand) this.deal();
      this.over = !this.hasMove();
      return { ok: true, points, lines, cleared, newHand, over: this.over };
    }
  }
  return { SIZE, SHAPES, Game };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BlocksRules;
