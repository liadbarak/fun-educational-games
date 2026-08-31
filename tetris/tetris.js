/* Tetris. Loop, pause, overlay and high score come from shared/shell.js. */

const COLS = 10, ROWS = 20, SIZE = 30;

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

/* Each piece is a grid of its own colour index, so the colour travels with the shape. */
const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
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

let board, piece, nextPiece;
let score, level, lines;

/* ── state helpers ──────────────────────────────────────────── */

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const id = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[id].map(row => [...row]);
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

/* ── game logic ─────────────────────────────────────────────── */

function lock() {
  piece.shape.forEach((row, r) =>
    row.forEach((val, c) => {
      if (val) board[piece.y + r][piece.x + c] = val;
    })
  );
  clearLines();

  piece = nextPiece;
  nextPiece = randomPiece();

  /* No room for the new piece means the stack reached the top. */
  if (collides(piece.shape, piece.x, piece.y)) {
    shell.gameOver(score, `Level ${level} · ${lines} lines`);
  }
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      r++; // re-check this index, rows above have shifted down into it
    }
  }
  if (!cleared) return;

  score += [0, 100, 300, 500, 800][cleared] * level;
  lines += cleared;
  level = Math.floor(lines / 10) + 1;
  shell.setStepMs(Math.max(80, 1000 - (level - 1) * 90));
  updateStats();
}

function updateStats() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('lines').textContent = lines;
}

/* ── drawing ────────────────────────────────────────────────── */

function drawBlock(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 5);
  context.fillStyle = 'rgba(0,0,0,0.2)';
  context.fillRect(x * size + 1, y * size + size - 4, size - 2, 3);
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
    row.forEach((val, c) => { if (val) drawBlock(ctx, c, r, COLORS[val], SIZE); })
  );

  const gy = ghostY();
  if (gy !== piece.y) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    piece.shape.forEach((row, r) =>
      row.forEach((val, c) => {
        if (val) ctx.fillRect((piece.x + c) * SIZE + 1, (gy + r) * SIZE + 1, SIZE - 2, SIZE - 2);
      })
    );
  }

  piece.shape.forEach((row, r) =>
    row.forEach((val, c) => {
      if (val) drawBlock(ctx, piece.x + c, piece.y + r, COLORS[val], SIZE);
    })
  );
}

function drawNext() {
  const size = 24;
  nextCtx.fillStyle = '#111';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const offX = Math.floor((nextCanvas.width  / size - nextPiece.shape[0].length) / 2);
  const offY = Math.floor((nextCanvas.height / size - nextPiece.shape.length) / 2);
  nextPiece.shape.forEach((row, r) =>
    row.forEach((val, c) => {
      if (val) drawBlock(nextCtx, offX + c, offY + r, COLORS[val], size);
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
      /* Nudge sideways if the rotated shape would clip a wall or the stack. */
      const rotated = rotate(piece.shape);
      if      (!collides(rotated, piece.x,     piece.y)) { piece.shape = rotated; }
      else if (!collides(rotated, piece.x + 1, piece.y)) { piece.shape = rotated; piece.x++; }
      else if (!collides(rotated, piece.x - 1, piece.y)) { piece.shape = rotated; piece.x--; }
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
    piece = randomPiece();
    nextPiece = randomPiece();
    shell.setStepMs(1000);
    updateStats();
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
