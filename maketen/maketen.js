/*
 * Make10.
 *
 * Pairs of numbered tiles fall. Any straight line of touching tiles that adds
 * up to ten disappears — two of them or five — and everything above drops into
 * the gap, which can set off another match, and another.
 *
 * The arithmetic isn't a quiz bolted onto a game; spotting the tens is the only
 * way to play. Loop, pause, overlay and high score come from
 * shared/shell.js.
 */

const COLS = 7, ROWS = 14, SIZE = 42;
const TARGET = 10;

const START_STEP_MS = 700, MIN_STEP_MS = 220;
/* Runs clear far more tiles than pairs did, so each one speeds things up less. */
const SPEEDUP_PER_CLEAR = 3;   // ms shaved off the fall for each tile removed

const POP_MS    = 320;   // tile bursting where it was cleared
const FLOAT_MS  = 850;   // score number drifting upward
const BANNER_MS = 900;   // "CHAIN xN" across the board
const SHAKE_MS  = 260;

/* Read from :root so the board tiles and the how-to-play demo tiles can't drift. */
const DIGIT_COLORS = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [i + 1, cssVar(`--d${i + 1}`)])
);

const HOW_TO = `
  <div class="howto">
    <div class="howto-step">
      <span class="howto-num">1</span>
      <div class="howto-text">
        Tiles in a line that add up to <b>10</b> all disappear — two of them
        or five.
      </div>
      <div class="howto-demo">
        <span class="t t3 vanish">3</span><span class="t t2 vanish">2</span><span class="t t4 vanish">4</span><span class="t t1 vanish">1</span>
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

/* Purely cosmetic, all time-based so they expire on their own. */
let pops;          // [{ x, y, n, until }]  tiles bursting where they cleared
let floats;        // [{ x, y, text, until }] score numbers drifting up
let banner;        // { text, until } | null
let shakeUntil;

/* ── state helpers ──────────────────────────────────────────── */

function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomTile() {
  return { n: Math.floor(Math.random() * 9) + 1 };   // 1-9; a 0 could never pair
}

function randomPiece() {
  /*
   * Never hand out a pair that already sums to ten — it would clear itself
   * wherever it landed, which is a turn the player has no say in.
   */
  let a, b;
  do { a = randomTile(); b = randomTile(); } while (a.n + b.n === TARGET);
  return { x: Math.floor(COLS / 2), y: 0, rot: 0, a, b };
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
 * Every tile in a straight run — across or down — that sums to exactly ten.
 * Two tiles or twenty: 6+4 counts and so does 3+2+4+1.
 *
 * Only straight runs, never bent shapes. That keeps it unambiguous (a player
 * can see every candidate) and cheap: tiles are 1-9, so any run reaches ten
 * within ten steps and we stop the moment the total passes it.
 *
 * Runs may overlap. A tile in two of them is simply removed once.
 */
function findMatches() {
  const doomed = new Set();

  const scan = (length, cellAt, markAt) => {
    for (let start = 0; start < length; start++) {
      let sum = 0;
      for (let end = start; end < length; end++) {
        const cell = cellAt(end);
        if (!cell) break;              // a gap ends the run
        sum += cell.n;
        if (sum > TARGET) break;       // every tile is >= 1, so it only grows
        if (sum === TARGET) {
          for (let k = start; k <= end; k++) doomed.add(markAt(k));
          break;                       // longer runs from here can only overshoot
        }
      }
    }
  };

  for (let y = 0; y < ROWS; y++) scan(COLS, x => grid[y][x], x => key(x, y));
  for (let x = 0; x < COLS; x++) scan(ROWS, y => grid[y][x], y => key(x, y));

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

    let sumX = 0, sumY = 0;
    doomed.forEach(k => {
      const [x, y] = k.split(',').map(Number);
      pops.push({ x, y, n: grid[y][x].n, until: now + POP_MS });
      grid[y][x] = null;
      sumX += x; sumY += y;
    });

    const gained = doomed.size * 10 * chain;   // later links in a chain are worth more
    score += gained;
    cleared += doomed.size;

    /* Float the points from the middle of whatever just vanished. */
    floats.push({
      x: sumX / doomed.size,
      y: sumY / doomed.size,
      text: `+${gained}`,
      until: now + FLOAT_MS,
    });

    if (chain > 1) banner = { text: `CHAIN ×${chain}`, until: now + BANNER_MS };
    if (chain > 1 || doomed.size >= 4) shakeUntil = now + SHAKE_MS;
    Sound.chain(chain);

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
  Sound.place();
  pieceCells(piece).forEach(({ x, y, tile }) => { grid[y][x] = tile; });
  applyGravity();          // a pair can land straddling a gap
  resolveMatches();

  piece = nextPiece;
  nextPiece = randomPiece();

  if (!fits(pieceCells(piece))) {
    Sound.gameOver();
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

/* Each cleared tile swells and fades where it stood. */
function drawPops(now) {
  pops = pops.filter(p => p.until > now);

  pops.forEach(p => {
    const life = (p.until - now) / POP_MS;        // 1 -> 0
    const scale = 1 + (1 - life) * 0.55;
    const cx = p.x * SIZE + SIZE / 2;
    const cy = p.y * SIZE + SIZE / 2;

    ctx.save();
    ctx.globalAlpha = life;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    drawTile(ctx, p.x, p.y, p.n, SIZE);
    ctx.restore();
  });
}

function drawFloats(now) {
  floats = floats.filter(f => f.until > now);

  floats.forEach(f => {
    const life = (f.until - now) / FLOAT_MS;
    ctx.save();
    ctx.globalAlpha = Math.min(1, life * 1.8);    // hold, then fade out at the end
    ctx.fillStyle = cssVar('--accent-dark');
    ctx.font = `800 ${Math.round(SIZE * 0.42)}px ${cssVar('--font')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      f.text,
      f.x * SIZE + SIZE / 2,
      f.y * SIZE + SIZE / 2 - (1 - life) * SIZE * 1.4
    );
    ctx.restore();
  });
}

function drawBanner(now) {
  if (!banner) return;
  if (banner.until <= now) { banner = null; return; }

  const life = (banner.until - now) / BANNER_MS;
  /* Snaps in oversized, settles, then fades. */
  const scale = life > 0.85 ? 1 + (life - 0.85) * 6 : 1;

  ctx.save();
  ctx.globalAlpha = Math.min(1, life * 2.2);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.font = `800 ${Math.round(SIZE * 0.72)}px ${cssVar('--font')}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(banner.text, 0, 0);
  ctx.fillStyle = cssVar('--accent');
  ctx.fillText(banner.text, 0, 0);
  ctx.restore();
}

function draw() {
  const now = Date.now();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = THEME.board;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* Shake the whole board briefly after a big clear. Decays to nothing. */
  if (shakeUntil > now) {
    const power = ((shakeUntil - now) / SHAKE_MS) * 4;
    ctx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power);
  }

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

  drawPops(now);
  drawFloats(now);
  drawBanner(now);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    pops = [];
    floats = [];
    banner = null;
    shakeUntil = 0;
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

const muteBtn = document.getElementById('mute-btn');
function syncMuteButton() {
  muteBtn.textContent = Sound.isMuted() ? '🔇 Sound off' : '🔊 Sound on';
}
muteBtn.addEventListener('click', () => {
  Sound.setMuted(!Sound.isMuted());
  syncMuteButton();
});
syncMuteButton();
