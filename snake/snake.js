/*
 * Food Rescue.
 *
 * The snake finds food dropped around the kitchen and has to put it away:
 * anything still good goes in the fridge, anything that's just scraps goes in
 * the bin. Picking a destination IS the answer — there's no quiz popup, the
 * decision is the route you steer.
 *
 * Loop, pause, overlay and high score come from shared/shell.js.
 */

const CELLS = 20, CELL = 20;
const START_STEP_MS = 165, MIN_STEP_MS = 95, SPEEDUP_PER_DROPOFF = 3;

const POINTS_PICKUP = 5;
const POINTS_RIGHT_BIN = 25;

/* Fixed corners, so the route becomes something a player learns rather than hunts for. */
const FRIDGE = { x0: 0,  y0: 0, x1: 3,  y1: 1, kind: 'fridge' };
const BIN    = { x0: 16, y0: 0, x1: 19, y1: 1, kind: 'bin' };

/*
 * `fresh: true` means it's still good to eat and belongs in the fridge.
 * No emoji is reused across the two lists — the same picture never means two
 * different things, which matters when the whole game is telling them apart.
 */
const FOODS = [
  { icon: '🍎', name: 'an apple',        fresh: true },
  { icon: '🧀', name: 'some cheese',     fresh: true },
  { icon: '🥛', name: 'a glass of milk', fresh: true },
  { icon: '🥕', name: 'a carrot',        fresh: true },
  { icon: '🍓', name: 'strawberries',    fresh: true },
  { icon: '🥦', name: 'broccoli',        fresh: true },
  { icon: '🍇', name: 'grapes',          fresh: true },
  { icon: '🍅', name: 'a tomato',        fresh: true },

  { icon: '🍌', name: 'a banana peel',   fresh: false },
  { icon: '🦴', name: 'a chicken bone',  fresh: false },
  { icon: '🍬', name: 'a sweet wrapper', fresh: false },
  { icon: '🥤', name: 'an empty cup',    fresh: false },
  { icon: '🥡', name: 'an empty box',    fresh: false },
];

const FRESH_FOODS = FOODS.filter(f => f.fresh);
const SCRAPS      = FOODS.filter(f => !f.fresh);

const HOW_TO = `
  <div class="howto">
    <div class="howto-step">
      <span class="howto-num">1</span>
      <div class="howto-text">
        Steer the snake onto the <b>food</b> to pick it up.
      </div>
      <div class="howto-demo" style="font-size:19px">🐍<span class="howto-arrow">→</span>🍎</div>
    </div>

    <div class="howto-step">
      <span class="howto-num">2</span>
      <div class="howto-text">
        Still good to eat? Carry it to the <b>fridge</b>.
      </div>
      <div class="howto-demo" style="font-size:19px">🍎<span class="howto-arrow">→</span>🧊</div>
    </div>

    <div class="howto-step">
      <span class="howto-num">3</span>
      <div class="howto-text">
        Only scraps left? Carry it to the <b>bin</b>.
      </div>
      <div class="howto-demo" style="font-size:19px">🍌<span class="howto-arrow">→</span>🗑️</div>
    </div>
  </div>
`;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const THEME = {
  board:     cssVar('--board-bg'),
  line:      cssVar('--board-line'),
  snake:     cssVar('--success'),
  snakeHead: '#2E8B5F',
  fridge:    '#CFE6FA',
  bin:       '#E2DCD3',
};
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const DIRECTIONS = {
  up:    { x:  0, y: -1 },
  down:  { x:  0, y:  1 },
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
};

let snake;        // cells from head to tail
let dir;          // direction being travelled this step
let nextDir;      // direction queued by the player for the next step
let food;         // the item waiting on the floor, or null while carrying
let carrying;     // the item the snake is holding, or null
let score, saved, binned;
let stepMs;
let popups;       // [{ x, y, text, until }] floating score text

/* ── state helpers ──────────────────────────────────────────── */

const inZone = (x, y, z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;

function isOnSnake(x, y) {
  return snake.some(cell => cell.x === x && cell.y === y);
}

/* Fresh and scraps spawn equally often, even though the two lists differ in size. */
function placeFood() {
  const list = Math.random() < 0.5 ? FRESH_FOODS : SCRAPS;
  const pick = list[Math.floor(Math.random() * list.length)];

  const free = [];
  for (let y = 0; y < CELLS; y++)
    for (let x = 0; x < CELLS; x++)
      if (!isOnSnake(x, y) && !inZone(x, y, FRIDGE) && !inZone(x, y, BIN)) free.push({ x, y });

  food = free.length ? { ...free[Math.floor(Math.random() * free.length)], ...pick } : null;
}

function updateStats() {
  document.getElementById('score').textContent = score;
  document.getElementById('saved').textContent = saved;
  document.getElementById('binned').textContent = binned;

  const hud = document.getElementById('carrying');
  hud.textContent = carrying ? `${carrying.icon} ${carrying.name}` : 'nothing yet';
  hud.classList.toggle('is-holding', Boolean(carrying));
}

function popup(x, y, text) {
  popups.push({ x, y, text, until: Date.now() + 900 });
}

/* ── game logic ─────────────────────────────────────────────── */

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  const hitWall = head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS;
  /* The tail cell moves out of the way this step, so running into it is not a crash. */
  const hitSelf = snake.slice(0, -1).some(c => c.x === head.x && c.y === head.y);
  if (hitWall || hitSelf) {
    shell.gameOver(score, `${saved} saved · ${binned} binned`);
    return;
  }

  snake.unshift(head);
  snake.pop();                     // growth only happens on a drop-off

  if (!carrying && food && head.x === food.x && head.y === food.y) {
    carrying = food;
    food = null;
    score += POINTS_PICKUP;
    popup(head.x, head.y, `+${POINTS_PICKUP}`);
    updateStats();
    return;
  }

  if (carrying) {
    if (inZone(head.x, head.y, FRIDGE)) dropOff('fridge', head);
    else if (inZone(head.x, head.y, BIN)) dropOff('bin', head);
  }
}

function dropOff(kind, at) {
  const item = carrying;
  const correct = (kind === 'fridge') === item.fresh;

  carrying = null;
  snake.push({ ...snake[snake.length - 1] });   // grow by one
  stepMs = Math.max(MIN_STEP_MS, stepMs - SPEEDUP_PER_DROPOFF);
  shell.setStepMs(stepMs);

  if (correct) {
    score += POINTS_RIGHT_BIN;
    if (kind === 'fridge') saved++; else binned++;
    popup(at.x, at.y, `+${POINTS_RIGHT_BIN}`);
    placeFood();
    updateStats();
    return;
  }

  /*
   * Wrong bin: no points lost, but pause long enough to read why. Freezing is
   * the point here — this is the one moment the game is actually teaching.
   */
  updateStats();
  shell.suspend();
  shell.redraw();
  Quiz.tell({
    title: item.fresh ? 'That was still good!' : 'That one was just scraps',
    note: item.fresh
      ? `${item.icon} Food you can still eat goes in the fridge, not the bin.`
      : `${item.icon} Scraps go in the bin — the fridge is for food you'll eat.`,
    onDone() {
      placeFood();
      shell.resume();
    },
  });
}

/* ── drawing ────────────────────────────────────────────────── */

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function drawZone(zone, fill, icon, label, isTarget) {
  const x = zone.x0 * CELL, y = zone.y0 * CELL;
  const w = (zone.x1 - zone.x0 + 1) * CELL;
  const h = (zone.y1 - zone.y0 + 1) * CELL;

  ctx.fillStyle = fill;
  roundRect(x + 1, y + 1, w - 2, h - 2, 8);
  ctx.fill();

  /* While carrying, ring the destination that would be correct. */
  if (isTarget) {
    ctx.save();
    ctx.strokeStyle = cssVar('--success');
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    roundRect(x + 1, y + 1, w - 2, h - 2, 8);
    ctx.stroke();
    ctx.restore();
  }

  ctx.font = `16px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x + w / 2, y + h / 2 - 5);

  ctx.font = `700 9px ${cssVar('--font')}`;
  ctx.fillStyle = 'rgba(45,49,66,0.6)';
  ctx.fillText(label, x + w / 2, y + h - 8);
}

function draw() {
  ctx.fillStyle = THEME.board;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = THEME.line;
  ctx.lineWidth = 1;
  for (let i = 0; i <= CELLS; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
  }

  drawZone(FRIDGE, THEME.fridge, '🧊', 'FRIDGE', false);
  drawZone(BIN,    THEME.bin,    '🗑️', 'BIN',    false);

  if (food) {
    ctx.font = `${Math.round(CELL * 0.8)}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.icon, food.x * CELL + CELL / 2, food.y * CELL + CELL / 2 + 1);
  }

  snake.forEach((cell, i) => {
    ctx.fillStyle = i === 0 ? THEME.snakeHead : THEME.snake;
    roundRect(cell.x * CELL + 1.5, cell.y * CELL + 1.5, CELL - 3, CELL - 3, 5);
    ctx.fill();
  });

  /* What the snake is holding rides along on its head. */
  if (carrying) {
    const head = snake[0];
    ctx.font = `${Math.round(CELL * 0.7)}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(carrying.icon, head.x * CELL + CELL / 2, head.y * CELL + CELL / 2);
  }

  drawPopups();
}

function drawPopups() {
  const now = Date.now();
  popups = popups.filter(p => p.until > now);

  popups.forEach(p => {
    const life = (p.until - now) / 900;             // 1 -> 0
    ctx.save();
    ctx.globalAlpha = life;
    ctx.fillStyle = cssVar('--success');
    ctx.font = `800 13px ${cssVar('--font')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, p.x * CELL + CELL / 2, p.y * CELL + CELL / 2 - (1 - life) * 18);
    ctx.restore();
  });
}

/* ── input ──────────────────────────────────────────────────── */

function handleControl(name) {
  if (shell.isBlocked()) return;

  const candidate = DIRECTIONS[name];
  /* Compare against the queued direction, not the current one: without this,
     two fast turns (right → up → left) would double back into the neck. */
  if (candidate.x === -nextDir.x && candidate.y === -nextDir.y) return;
  nextDir = candidate;
}

const KEY_ACTIONS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

document.addEventListener('keydown', (e) => {
  const action = KEY_ACTIONS[e.key];
  if (!action) return;
  e.preventDefault(); // stop arrows from scrolling the page
  handleControl(action);
});

document.querySelectorAll('[data-control]').forEach(btn =>
  btn.addEventListener('click', () => handleControl(btn.dataset.control))
);

/* ── wiring ─────────────────────────────────────────────────── */

const shell = createGameShell({
  name: 'foodrescue',
  title: 'FOOD RESCUE',
  subtitle: 'Good food to the fridge, scraps to the bin',
  howTo: HOW_TO,
  stepMs: START_STEP_MS,

  onReset() {
    const middle = Math.floor(CELLS / 2);
    snake = [
      { x: middle,     y: middle },
      { x: middle - 1, y: middle },
      { x: middle - 2, y: middle },
    ];
    dir = DIRECTIONS.right;
    nextDir = dir;
    carrying = null;
    score = 0;
    saved = 0;
    binned = 0;
    popups = [];
    stepMs = START_STEP_MS;
    shell.setStepMs(stepMs);
    placeFood();
    updateStats();
    Quiz.hide();
  },

  onStep: step,
  onDraw: draw,
});

document.getElementById('pause-btn').addEventListener('click', () => shell.togglePause());
document.getElementById('howto-btn').addEventListener('click', () => shell.showHowTo());
