/*
 * Clean-Up Snake.
 *
 * The snake is a park clean-up crew: it collects dropped litter, and every so
 * often has to say which bin the thing it just picked up belongs in.
 *
 * Loop, pause, overlay and high score come from shared/shell.js.
 */

const CELLS = 20, CELL = 20;
const START_STEP_MS = 140, MIN_STEP_MS = 60, SPEEDUP_PER_ITEM = 4;

/* Items collected between questions. */
const ITEMS_PER_QUESTION = 5;
const QUIZ_BONUS = 50;

const BINS = ['Recycling', 'Compost', 'Trash'];

/*
 * Deliberately unambiguous items only — sorting rules genuinely differ between
 * countries, so anything a council might disagree about (pizza boxes, coffee
 * cups, juice cartons) is left out.
 */
const LITTER = [
  { icon: '📰', name: 'a newspaper',    bin: 'Recycling', fact: 'Paper can become new paper again.' },
  { icon: '📦', name: 'a cardboard box', bin: 'Recycling', fact: 'Flatten boxes so they take up less room.' },
  { icon: '🥫', name: 'a tin can',       bin: 'Recycling', fact: 'Metal can be melted down and reused forever.' },
  { icon: '🧴', name: 'a plastic bottle', bin: 'Recycling', fact: 'Empty it first so it can be recycled.' },
  { icon: '🍎', name: 'an apple core',   bin: 'Compost',   fact: 'Food scraps turn back into soil.' },
  { icon: '🍌', name: 'a banana peel',   bin: 'Compost',   fact: 'Peels rot down and feed plants.' },
  { icon: '🍂', name: 'dry leaves',      bin: 'Compost',   fact: 'Leaves make great compost.' },
  { icon: '🥕', name: 'a carrot top',    bin: 'Compost',   fact: 'Veg scraps belong with the food waste.' },
  { icon: '🍬', name: 'a sweet wrapper', bin: 'Trash',     fact: 'Shiny wrappers are too mixed up to recycle.' },
  { icon: '🎈', name: 'a popped balloon', bin: 'Trash',    fact: 'Balloons hurt wildlife — always bin them.' },
  { icon: '🧦', name: 'an old sock',     bin: 'Trash',     fact: 'Worn-out clothes go to textile bins or the trash.' },
  { icon: '👟', name: 'a broken shoe',   bin: 'Trash',     fact: 'Shoes that still fit are better donated.' },
];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const THEME = {
  board:     cssVar('--board-bg'),
  line:      cssVar('--board-line'),
  snake:     cssVar('--success'),
  snakeHead: '#2E8B5F',
};
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const DIRECTIONS = {
  up:    { x:  0, y: -1 },
  down:  { x:  0, y:  1 },
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
};

let snake;      // cells from head to tail
let dir;        // direction being travelled this step
let nextDir;    // direction queued by the player for the next step
let item;       // the litter currently on the board
let score, collected;
let stepMs;
let itemsSinceQuestion;
let sortingMode = Prefs.read('sortingMode', true);

/* ── state helpers ──────────────────────────────────────────── */

function isOnSnake(x, y) {
  return snake.some(cell => cell.x === x && cell.y === y);
}

/* Picks from the cells the snake is not occupying, so a full board can't hang the game. */
function placeItem() {
  const free = [];
  for (let y = 0; y < CELLS; y++)
    for (let x = 0; x < CELLS; x++)
      if (!isOnSnake(x, y)) free.push({ x, y });

  if (!free.length) { item = null; return false; }

  const spot = free[Math.floor(Math.random() * free.length)];
  item = { ...spot, ...LITTER[Math.floor(Math.random() * LITTER.length)] };
  return true;
}

function updateStats() {
  document.getElementById('score').textContent = score;
  document.getElementById('collected').textContent = collected;
}

/* ── game logic ─────────────────────────────────────────────── */

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  const hitWall = head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS;
  /* The tail cell moves out of the way this step, so running into it is not a crash. */
  const hitSelf = snake.slice(0, -1).some(c => c.x === head.x && c.y === head.y);
  if (hitWall || hitSelf) {
    shell.gameOver(score, `${collected} items cleaned up`);
    return;
  }

  snake.unshift(head);

  const picked = item && head.x === item.x && head.y === item.y;
  if (!picked) {
    snake.pop();               // only grow on the step where something was collected
    return;
  }

  const justPicked = item;
  score += 10;
  collected++;
  stepMs = Math.max(MIN_STEP_MS, stepMs - SPEEDUP_PER_ITEM);
  shell.setStepMs(stepMs);
  updateStats();

  if (!placeItem()) {          // board full — nothing left to collect
    shell.gameOver(score, 'Park completely clean!');
    return;
  }

  itemsSinceQuestion++;
  if (sortingMode && itemsSinceQuestion >= ITEMS_PER_QUESTION) {
    askSortingQuestion(justPicked);
  }
}

function askSortingQuestion(litter) {
  itemsSinceQuestion = 0;
  shell.suspend();
  shell.redraw();

  Quiz.ask({
    prompt: `You picked up ${litter.name}`,
    question: `${litter.icon}  Which bin?`,
    choices: BINS,
    answer: litter.bin,
    praise: 'Sorted right!',
    teach: litter.fact,
    onResult(correct) {
      if (correct) {
        score += QUIZ_BONUS;
        updateStats();
      }
      shell.resume();
    },
  });
}

/* ── drawing ────────────────────────────────────────────────── */

function draw() {
  ctx.fillStyle = THEME.board;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = THEME.line;
  ctx.lineWidth = 1;
  for (let i = 0; i <= CELLS; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
  }

  if (item) {
    ctx.font = `${Math.round(CELL * 0.8)}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, item.x * CELL + CELL / 2, item.y * CELL + CELL / 2 + 1);
  }

  snake.forEach((cell, i) => {
    ctx.fillStyle = i === 0 ? THEME.snakeHead : THEME.snake;
    roundRect(cell.x * CELL + 1.5, cell.y * CELL + 1.5, CELL - 3, CELL - 3, 5);
    ctx.fill();
  });
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
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
  name: 'snake',
  title: 'CLEAN-UP SNAKE',
  subtitle: 'Collect the litter — and know which bin it goes in',
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
    score = 0;
    collected = 0;
    itemsSinceQuestion = 0;
    stepMs = START_STEP_MS;
    shell.setStepMs(stepMs);
    placeItem();
    updateStats();
    Quiz.hide();
  },

  onStep: step,
  onDraw: draw,
});

document.getElementById('pause-btn').addEventListener('click', () => shell.togglePause());

const sortingToggle = document.getElementById('sorting-toggle');
sortingToggle.checked = sortingMode;
sortingToggle.addEventListener('change', () => {
  sortingMode = sortingToggle.checked;
  Prefs.write('sortingMode', sortingMode);
});
