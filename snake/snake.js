/* Snake. Loop, pause, overlay and high score come from shared/shell.js. */

const CELLS = 20, CELL = 20;
const START_STEP_MS = 140, MIN_STEP_MS = 60, SPEEDUP_PER_FOOD = 4;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const DIRECTIONS = {
  up:    { x:  0, y: -1 },
  down:  { x:  0, y:  1 },
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
};

let snake;     // cells from head to tail
let dir;       // direction being travelled this step
let nextDir;   // direction queued by the player for the next step
let food;
let score;
let stepMs;

/* ── state helpers ──────────────────────────────────────────── */

function isOnSnake(x, y) {
  return snake.some(cell => cell.x === x && cell.y === y);
}

/* Picks from the cells the snake is not occupying, so a full board can't hang the game. */
function placeFood() {
  const free = [];
  for (let y = 0; y < CELLS; y++)
    for (let x = 0; x < CELLS; x++)
      if (!isOnSnake(x, y)) free.push({ x, y });

  food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  return free.length > 0;
}

function updateStats() {
  document.getElementById('score').textContent = score;
  document.getElementById('length').textContent = snake.length;
}

/* ── game logic ─────────────────────────────────────────────── */

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  const hitWall = head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS;
  /* The tail cell moves out of the way this step, so running into it is not a crash. */
  const hitSelf = snake.slice(0, -1).some(c => c.x === head.x && c.y === head.y);
  if (hitWall || hitSelf) {
    shell.gameOver(score, `Length ${snake.length}`);
    return;
  }

  snake.unshift(head);

  const ate = food && head.x === food.x && head.y === food.y;
  if (ate) {
    score += 10;
    stepMs = Math.max(MIN_STEP_MS, stepMs - SPEEDUP_PER_FOOD);
    shell.setStepMs(stepMs);
    updateStats();
    if (!placeFood()) {          // board full — nothing left to eat
      shell.gameOver(score, 'Board cleared!');
      return;
    }
  } else {
    snake.pop();                 // only grow on the step where food was eaten
  }
}

/* ── drawing ────────────────────────────────────────────────── */

function draw() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#1e1e1e';
  ctx.lineWidth = 1;
  for (let i = 0; i <= CELLS; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
  }

  if (food) {
    ctx.fillStyle = '#f04040';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
  }

  snake.forEach((cell, i) => {
    ctx.fillStyle = i === 0 ? '#00f0a0' : '#00b478';
    ctx.fillRect(cell.x * CELL + 1, cell.y * CELL + 1, CELL - 2, CELL - 2);
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
  name: 'snake',
  title: 'SNAKE',
  subtitle: 'Eat the dots, avoid yourself',
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
    stepMs = START_STEP_MS;
    shell.setStepMs(stepMs);
    placeFood();
    updateStats();
  },

  onStep: step,
  onDraw: draw,
});

document.getElementById('pause-btn').addEventListener('click', () => shell.togglePause());
