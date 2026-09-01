/*
 * Make10.
 *
 * Pairs of numbered tiles fall. Wherever two tiles that touch add up to ten,
 * both disappear and everything above drops into the gap — which can set off
 * another match, and another.
 *
 * The arithmetic isn't a quiz bolted onto a game; spotting number bonds to ten
 * is the only way to play. Loop, pause, overlay and high score come from
 * shared/shell.js.
 */

const COLS = 7, ROWS = 14, SIZE = 42;
const TARGET = 10;

const START_STEP_MS = 700, MIN_STEP_MS = 220;
const SPEEDUP_PER_CLEAR = 6;   // ms shaved off the fall for each tile removed
const FLASH_MS = 260;          // how long the sparkle sits where tiles vanished

/* Read from :root so the board tiles and the how-to-play demo tiles can't drift. */
const DIGIT_COLORS = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [i + 1, cssVar(`--d${i + 1}`)])
);

const HOW_TO = `
  <div class="howto">
    <div class="howto-step">
      <span class="howto-num">1</span>
      <div class="howto-text">
        Two tiles that <b>touch</b> and add up to <b>10</b> both disappear.
      </div>
      <div class="howto-demo">
        <span class="t t6 vanish">6</span><span class="t t4 vanish">4</span>
      </div>
    </div>

    <div class="howto-step">
      <span class="howto-num">2</span>
      <div class="howto-text">
        Side by side or <b>stacked</b> — either counts.
      </div>
      <div class="howto-demo">
        <span class="t-stack">
          <span class="t t3 vanish">3</span><span class="t t7 vanish">7</span>
        </span>
      </div>
    </div>

    <div class="howto-step">
      <span class="howto-num">3</span>
      <div class="howto-text">
        Whatever drops into the gap can match again.
        <b>Chains score more.</b>
      </div>
      <div class="howto-demo">
        <span class="chain-badge">×2</span>
        <span class="howto-arrow">→</span>
        <span class="chain-badge">×3</span>
      </div>
    </div>
  </div>
`;

/* b sits at this offset from a, cycled by the rotate control. */
const ORIENTATIONS = [
  { dx:  1, dy:  0 },
  { dx:  0, dy:  1 },
  { dx: -1, dy:  0 },
  { dx:  0, dy: -1 },
];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');

const THEME = {
  board: cssVar('--board-bg'),
  line:  cssVar('--board-line'),
  ink:   cssVar('--ink'),
};

let grid;          // grid[y][x] is { n } or null
let piece;         // { x, y, rot, a: {n}, b: {n} }
let nextPiece;
let score, cleared, bestChain;
let stepMs;
let flashes;       // [{ x, y, until }] sparkles where tiles were removed

/* ── state helpers ──────────────────────────────────────────── */

function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomTile() {
  return { n: Math.floor(Math.random() * 9) + 1 };   // 1-9; a 0 could never pair
}

function randomPiece() {
  return { x: Math.floor(COLS / 2), y: 0, rot: 0, a: randomTile(), b: randomTile() };
}

/* Board positions of a piece's two tiles, in fall order. */
function pieceCells(p) {
  const o = ORIENTATIONS[p.rot];
  return [
    { x: p.x,        y: p.y,        tile: p.a },
    { x: p.x + o.dx, y: p.y + o.dy, tile: p.b },
  ];
}

function fits(cells) {
  return cells.every(({ x, y }) =>
    x >= 0 && x < COLS && y >= 0 && y < ROWS && !grid[y][x]
  );
}

function canFall(p) {
  return fits(pieceCells({ ...p, y: p.y + 1 }));
}

/* ── matching ───────────────────────────────────────────────── */

const key = (x, y) => `${x},${y}`;

/*
 * Every tile in a touching pair that sums to ten. Each pair is tested once by
 * only looking right and down. A tile bridging two pairs is removed with both.
 */
function findMatches() {
  const doomed = new Set();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = grid[y][x];
      if (!cell) continue;

      const right = x + 1 < COLS ? grid[y][x + 1] : null;
      if (right && cell.n + right.n === TARGET) {
        doomed.add(key(x, y)); doomed.add(key(x + 1, y));
      }
      const below = y + 1 < ROWS ? grid[y + 1][x] : null;
      if (below && cell.n + below.n === TARGET) {
        doomed.add(key(x, y)); doomed.add(key(x, y + 1));
      }
    }
  }
  return doomed;
}

function applyGravity() {
  for (let x = 0; x < COLS; x++) {
    let write = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (grid[y][x]) {
        const cell = grid[y][x];
        grid[y][x] = null;
        grid[write][x] = cell;
        write--;
      }
    }
  }
}

/* Clears matches, drops what's above, then looks again — that repeat is the chain. */
function resolveMatches() {
  let chain = 0;

  for (;;) {
    const doomed = findMatches();
    if (!doomed.size) break;

    chain++;
    const now = Date.now();
    doomed.forEach(k => {
      const [x, y] = k.split(',').map(Number);
      grid[y][x] = null;
      flashes.push({ x, y, until: now + FLASH_MS });
    });

    score += doomed.size * 10 * chain;   // later links in a chain are worth more
    cleared += doomed.size;
    stepMs = Math.max(MIN_STEP_MS, stepMs - doomed.size * SPEEDUP_PER_CLEAR);
    shell.setStepMs(stepMs);
    applyGravity();
  }

  if (chain) {
    bestChain = Math.max(bestChain, chain);
    updateStats();
  }
  return chain;
}

function settle() {
  pieceCells(piece).forEach(({ x, y, tile }) => { grid[y][x] = tile; });
  applyGravity();          // a pair can land straddling a gap
  resolveMatches();

  piece = nextPiece;
  nextPiece = randomPiece();

  if (!fits(pieceCells(piece))) {
    shell.gameOver(score, `${cleared} tiles · best chain ×${bestChain}`);
  }
}

function updateStats() {
  document.getElementById('score').textContent = score;
  document.getElementById('cleared').textContent = cleared;
  document.getElementById('chain').textContent = '×' + bestChain;
}

/* ── drawing ────────────────────────────────────────────────── */

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y,     x + w, y + h, r);
  context.arcTo(x + w, y + h, x,     y + h, r);
  context.arcTo(x,     y + h, x,     y,     r);
  context.arcTo(x,     y,     x + w, y,     r);
  context.closePath();
}

function drawTile(context, x, y, n, size, alpha) {
  const pad = Math.max(2, size * 0.07);
  const px = x * size + pad, py = y * size + pad;
  const box = size - pad * 2;

  context.save();
  if (alpha !== undefined) context.globalAlpha = alpha;

  roundRectPath(context, px, py, box, box, box * 0.28);
  context.fillStyle = DIGIT_COLORS[n];
  context.fill();

  /* Soft inner top highlight, so the tile reads as a physical counter. */
  roundRectPath(context, px + 2, py + 2, box - 4, box * 0.42, box * 0.22);
  context.fillStyle = 'rgba(255,255,255,0.4)';
  context.fill();

  context.fillStyle = 'rgba(40,40,55,0.82)';
  context.font = `800 ${Math.round(size * 0.46)}px ${cssVar('--font')}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(n, px + box / 2, py + box / 2 + 1);

  context.restore();
}

function drawFlashes() {
  const now = Date.now();
  flashes = flashes.filter(f => f.until > now);

  flashes.forEach(f => {
    const life = (f.until - now) / FLASH_MS;      // 1 -> 0
    ctx.save();
    ctx.globalAlpha = life * 0.75;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
      f.x * SIZE + SIZE / 2,
      f.y * SIZE + SIZE / 2,
      SIZE * (0.24 + (1 - life) * 0.3),
      0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  });
}

function draw() {
  ctx.fillStyle = THEME.board;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = THEME.line;
  ctx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * SIZE); ctx.lineTo(canvas.width, r * SIZE); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * SIZE, 0); ctx.lineTo(c * SIZE, canvas.height); ctx.stroke();
  }

  grid.forEach((row, y) =>
    row.forEach((cell, x) => { if (cell) drawTile(ctx, x, y, cell.n, SIZE); })
  );

  /* Landing shadow, so it's clear where the pair is heading. */
  let ghost = { ...piece };
  while (canFall(ghost)) ghost.y++;
  if (ghost.y !== piece.y) {
    ctx.fillStyle = 'rgba(45,49,66,0.10)';
    pieceCells(ghost).forEach(({ x, y }) => {
      roundRectPath(ctx, x * SIZE + 3, y * SIZE + 3, SIZE - 6, SIZE - 6, SIZE * 0.26);
      ctx.fill();
    });
  }

  pieceCells(piece).forEach(({ x, y, tile }) => drawTile(ctx, x, y, tile.n, SIZE));

  drawFlashes();
}

function drawNext() {
  const size = 34;

  nextCtx.fillStyle = THEME.board;
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const offX = (nextCanvas.width / size - 2) / 2;
  const offY = (nextCanvas.height / size - 1) / 2;
  drawTile(nextCtx, offX,     offY, nextPiece.a.n, size);
  drawTile(nextCtx, offX + 1, offY, nextPiece.b.n, size);
}

/* ── input ──────────────────────────────────────────────────── */

function handleControl(action) {
  if (shell.isBlocked()) return;

  switch (action) {
    case 'left':
      if (fits(pieceCells({ ...piece, x: piece.x - 1 }))) piece.x--;
      break;

    case 'right':
      if (fits(pieceCells({ ...piece, x: piece.x + 1 }))) piece.x++;
      break;

    case 'down':
      if (canFall(piece)) piece.y++;
      else settle();
      break;

    case 'rotate': {
      /* Try in place first, then nudge — spinning upright against a wall or
         the ceiling needs somewhere to go. */
      const spun = { ...piece, rot: (piece.rot + 1) % 4 };
      const kick = [[0,0], [0,1], [1,0], [-1,0]]
        .find(([dx, dy]) => fits(pieceCells({ ...spun, x: spun.x + dx, y: spun.y + dy })));
      if (kick) {
        piece.rot = spun.rot;
        piece.x += kick[0];
        piece.y += kick[1];
      }
      break;
    }

    case 'drop':
      while (canFall(piece)) piece.y++;
      settle();
      break;
  }
  shell.redraw();
}

const KEY_ACTIONS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down',
  ArrowUp: 'rotate', ' ': 'drop',
  a: 'left', d: 'right', s: 'down', w: 'rotate',
  A: 'left', D: 'right', S: 'down', W: 'rotate',
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
  name: 'maketen',
  title: 'MAKE10',
  subtitle: 'Clear the board by making tens',
  howTo: HOW_TO,
  stepMs: START_STEP_MS,

  onReset() {
    grid = createGrid();
    score = 0;
    cleared = 0;
    bestChain = 0;
    flashes = [];
    stepMs = START_STEP_MS;
    shell.setStepMs(stepMs);
    piece = randomPiece();
    nextPiece = randomPiece();
    updateStats();
  },

  onStep() {
    if (canFall(piece)) piece.y++;
    else settle();
  },

  onDraw() {
    draw();
    drawNext();
  },
});

document.getElementById('pause-btn').addEventListener('click', () => shell.togglePause());
document.getElementById('howto-btn').addEventListener('click', () => shell.showHowTo());
