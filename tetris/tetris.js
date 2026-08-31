/*
 * Tetris with a maths layer.
 *
 * Every block carries a digit. Every few landings, the two digits that just
 * met — the one that landed and the one it came to rest on — light up and
 * become an addition or subtraction question.
 *
 * Loop, pause, overlay and high score come from shared/shell.js.
 */

const COLS = 10, ROWS = 20, SIZE = 30;

/* Landings to wait between questions. Deferred if a landing has no contact pair. */
const LANDINGS_PER_QUESTION = 5;
const QUIZ_BONUS = 50;

const COLORS = [
  null,
  '#00f0f0', // I - cyan
  '#f0f000', // O - yellow
  '#a000f0', // T - purple
  '#00f000', // S - green
  '#f00000', // Z - red
  '#0000f0', // J - blue
  '#f0a000', // L - orange
];

/*
 * Templates hold colour indexes; randomPiece turns them into cells with digits.
 * Every template hugs its own bounding box — no empty padding rows or columns.
 * Padding would make the piece slide a cell each time it rotated.
 */
const PIECES = [
  null,
  [[1,1,1,1]],                               // I
  [[2,2],[2,2]],                             // O
  [[0,3,0],[3,3,3]],                         // T
  [[0,4,4],[4,4,0]],                         // S
  [[5,5,0],[0,5,5]],                         // Z
  [[6,0,0],[6,6,6]],                         // J
  [[0,0,7],[7,7,7]],                         // L
];

const canvas     = document.getElementById('board');
const ctx        = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx    = nextCanvas.getContext('2d');

/* A filled cell is { c: colour index, n: digit }. An empty cell is 0. */
let board, piece, nextPiece;
let score, level, lines;
let landingsSinceQuestion;
let highlighted;           // cells glowing for the current question
let mathMode = Prefs.read('mathMode', true);

/* ── state helpers ──────────────────────────────────────────── */

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const id = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[id].map(row =>
    row.map(filled => (filled ? { c: id, n: Math.floor(Math.random() * 10) } : 0))
  );
  return { shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function rotate(shape) {
  const rows = shape.length, cols = shape[0].length;
  const out = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out[c][rows - 1 - r] = shape[r][c];
  return out;
}

function collides(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        const x = ox + c, y = oy + r;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
  return false;
}

/* Row the current piece would land on if dropped — drawn as the ghost. */
function ghostY() {
  let y = piece.y;
  while (!collides(piece.shape, piece.x, y + 1)) y++;
  return y;
}

/*
 * The two cells that just met: a cell on the underside of the landing piece,
 * and the settled cell directly beneath it. Must run before the piece is
 * written to the board, so "beneath" still means an older block.
 * Returns null when the piece came to rest on the floor instead.
 */
function findContactPair() {
  for (let r = piece.shape.length - 1; r >= 0; r--) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      const cell = piece.shape[r][c];
      if (!cell) continue;
      if (r + 1 < piece.shape.length && piece.shape[r + 1][c]) continue; // own piece is below

      const y = piece.y + r + 1, x = piece.x + c;
      if (y >= ROWS) continue;                                           // floor, not a block
      if (board[y][x]) {
        return { landed: { x, y: y - 1, n: cell.n }, settled: { x, y, n: board[y][x].n } };
      }
    }
  }
  return null;
}

/* ── game logic ─────────────────────────────────────────────── */

function lock() {
  const contact = findContactPair();

  piece.shape.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) board[piece.y + r][piece.x + c] = cell;
    })
  );

  const cleared = clearLines();

  piece = nextPiece;
  nextPiece = randomPiece();

  /* No room for the new piece means the stack reached the top. */
  if (collides(piece.shape, piece.x, piece.y)) {
    shell.gameOver(score, `Level ${level} · ${lines} lines`);
    return;
  }

  landingsSinceQuestion++;
  /* Skip when rows vanished this landing — the contact cells may no longer exist. */
  if (mathMode && contact && !cleared && landingsSinceQuestion >= LANDINGS_PER_QUESTION) {
    askQuestion(contact);
  }
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== 0)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      r++; // re-check this index, rows above have shifted down into it
    }
  }
  if (!cleared) return 0;

  score += [0, 100, 300, 500, 800][cleared] * level;
  lines += cleared;
  level = Math.floor(lines / 10) + 1;
  shell.setStepMs(Math.max(80, 1000 - (level - 1) * 90));
  updateStats();
  return cleared;
}

function askQuestion(contact) {
  landingsSinceQuestion = 0;
  highlighted = [contact.landed, contact.settled];

  shell.suspend();
  shell.redraw();          // paint the glow once; the loop is frozen so it stays put

  MathQuiz.ask(contact.landed.n, contact.settled.n, (correct) => {
    if (correct) {
      score += QUIZ_BONUS;
      updateStats();
    }
    highlighted = null;
    shell.resume();
  });
}

function updateStats() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('lines').textContent = lines;
}

/* ── drawing ────────────────────────────────────────────────── */

function drawCell(context, x, y, cell, size, dim) {
  const px = x * size, py = y * size;

  context.fillStyle = COLORS[cell.c];
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(px + 1, py + 1, size - 2, 5);
  context.fillStyle = 'rgba(0,0,0,0.2)';
  context.fillRect(px + 1, py + size - 4, size - 2, 3);

  /* Dark digit reads well on every one of the seven piece colours. */
  context.fillStyle = dim ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.75)';
  context.font = `bold ${Math.round(size * 0.5)}px monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(cell.n, px + size / 2, py + size / 2 + 1);
}

function drawHighlight(x, y) {
  const px = x * SIZE, py = y * SIZE;
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 14;
  ctx.strokeRect(px + 2, py + 2, SIZE - 4, SIZE - 4);
  ctx.restore();
}

function drawBoard() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#1e1e1e';
  ctx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * SIZE); ctx.lineTo(canvas.width, r * SIZE); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * SIZE, 0); ctx.lineTo(c * SIZE, canvas.height); ctx.stroke();
  }

  board.forEach((row, r) =>
    row.forEach((cell, c) => { if (cell) drawCell(ctx, c, r, cell, SIZE); })
  );

  const gy = ghostY();
  if (gy !== piece.y) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    piece.shape.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell) ctx.fillRect((piece.x + c) * SIZE + 1, (gy + r) * SIZE + 1, SIZE - 2, SIZE - 2);
      })
    );
  }

  piece.shape.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) drawCell(ctx, piece.x + c, piece.y + r, cell, SIZE);
    })
  );

  if (highlighted) highlighted.forEach(cell => drawHighlight(cell.x, cell.y));
}

function drawNext() {
  const size = 24;
  nextCtx.fillStyle = '#111';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const offX = Math.floor((nextCanvas.width  / size - nextPiece.shape[0].length) / 2);
  const offY = Math.floor((nextCanvas.height / size - nextPiece.shape.length) / 2);
  nextPiece.shape.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) drawCell(nextCtx, offX + c, offY + r, cell, size, true);
    })
  );
}

/* ── input ──────────────────────────────────────────────────── */

function handleControl(action) {
  if (shell.isBlocked()) return;

  switch (action) {
    case 'left':
      if (!collides(piece.shape, piece.x - 1, piece.y)) piece.x--;
      break;

    case 'right':
      if (!collides(piece.shape, piece.x + 1, piece.y)) piece.x++;
      break;

    case 'down':
      if (!collides(piece.shape, piece.x, piece.y + 1)) piece.y++;
      else lock();
      break;

    case 'rotate': {
      /*
       * Nudge sideways if the rotated shape would clip a wall or the stack.
       * Needs to reach two cells: a flat I rotating upright next to the right
       * wall has to travel further than the other pieces.
       */
      const rotated = rotate(piece.shape);
      const nudge = [0, 1, -1, 2, -2].find(dx => !collides(rotated, piece.x + dx, piece.y));
      if (nudge !== undefined) {
        piece.shape = rotated;
        piece.x += nudge;
      }
      break;
    }

    case 'drop':
      while (!collides(piece.shape, piece.x, piece.y + 1)) piece.y++;
      lock();
      break;
  }
  shell.redraw();
}

const KEY_ACTIONS = {
  ArrowLeft:  'left',
  ArrowRight: 'right',
  ArrowDown:  'down',
  ArrowUp:    'rotate',
  ' ':        'drop',
};

document.addEventListener('keydown', (e) => {
  const action = KEY_ACTIONS[e.key];
  if (!action) return;
  e.preventDefault(); // stop arrows and space from scrolling the page
  handleControl(action);
});

document.querySelectorAll('[data-control]').forEach(btn =>
  btn.addEventListener('click', () => handleControl(btn.dataset.control))
);

/* ── wiring ─────────────────────────────────────────────────── */

const shell = createGameShell({
  name: 'tetris',
  title: 'TETRIS',
  subtitle: 'Stack the blocks, clear the lines',
  stepMs: 1000,

  onReset() {
    board = createBoard();
    score = 0;
    level = 1;
    lines = 0;
    landingsSinceQuestion = 0;
    highlighted = null;
    piece = randomPiece();
    nextPiece = randomPiece();
    shell.setStepMs(1000);
    updateStats();
    MathQuiz.hide();
  },

  onStep() {
    if (!collides(piece.shape, piece.x, piece.y + 1)) piece.y++;
    else lock();
  },

  onDraw() {
    drawBoard();
    drawNext();
  },
});

document.getElementById('pause-btn').addEventListener('click', () => shell.togglePause());

const mathToggle = document.getElementById('math-toggle');
mathToggle.checked = mathMode;
mathToggle.addEventListener('change', () => {
  mathMode = mathToggle.checked;
  Prefs.write('mathMode', mathMode);
});
