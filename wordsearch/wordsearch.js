/*
 * Word Search.
 *
 * Two modes over the same engine: `learner` is a small grid of short common
 * words and shows a meaning when one is found; `native` is bigger, harder and
 * timed. Words are only ever placed forwards — never backwards — in both.
 *
 * Unlike the other two games this renders to DOM rather than a canvas. A word
 * search is static text that changes on tap, so DOM buys crisp letters at any
 * size, real tap targets with no hit-testing, and a printable worksheet that
 * is the same grid with different CSS. `onDraw` is therefore unused.
 *
 * Loop, pause, overlay and high score still come from shared/shell.js.
 */

/* Forward only: east, south, south-east, north-east. No reversed words. */
const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
];

const MODES = {
  learner: { size: 10, wordCount: 8,  hasTimer: false, showsMeaning: true },
  native:  { size: 13, wordCount: 14, hasTimer: true,  showsMeaning: false },
};

const PLACE_ATTEMPTS = 200;      // per word, before giving up on it
const GENERATE_ATTEMPTS = 12;    // whole grids to try before accepting a short one
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const HOW_TO = `
  <div class="howto">
    <div class="howto-step">
      <span class="howto-num">1</span>
      <div class="howto-text">
        Tap the <b>first letter</b> of a word you can see.
      </div>
      <div class="howto-demo">
        <span class="ws-demo-cell is-anchor">C</span>
        <span class="ws-demo-cell">A</span>
        <span class="ws-demo-cell">T</span>
      </div>
    </div>

    <div class="howto-step">
      <span class="howto-num">2</span>
      <div class="howto-text">
        Then tap the <b>last letter</b>. No dragging.
      </div>
      <div class="howto-demo">
        <span class="ws-demo-cell is-found">C</span>
        <span class="ws-demo-cell is-found">A</span>
        <span class="ws-demo-cell is-found">T</span>
      </div>
    </div>

    <div class="howto-step">
      <span class="howto-num">3</span>
      <div class="howto-text">
        Words run <b>across, down or diagonally</b> — never backwards.
      </div>
      <div class="howto-demo">
        <span class="howto-arrow">→</span>
        <span class="howto-arrow">↓</span>
        <span class="howto-arrow">↘</span>
        <span class="howto-arrow">↗</span>
      </div>
    </div>
  </div>
`;

/* ── state ──────────────────────────────────────────────────── */

let mode = 'learner';
let theme = THEMES[0];
let grid = [];          // grid[y][x] = letter
let words = [];         // { word, meaning, cells, found }
let anchor = null;      // first tapped cell, or null
let seconds = 0;
let score = 0;

/* ── generation ─────────────────────────────────────────────── */

const shuffled = (arr) => arr.map(v => [Math.random(), v])
                             .sort((a, b) => a[0] - b[0])
                             .map(([, v]) => v);

/*
 * Filler letters are drawn from the letters the placed words actually use,
 * not uniformly at random. With uniform filler the planted words end up being
 * the only place common letters cluster, which makes them visually obvious.
 */
function fillerPool(placed) {
  const pool = placed.flatMap(p => p.word.split(''));
  return pool.length ? pool : ALPHABET.split('');
}

function fits(word, x, y, dir, size) {
  const endX = x + dir.dx * (word.length - 1);
  const endY = y + dir.dy * (word.length - 1);
  if (endX < 0 || endX >= size || endY < 0 || endY >= size) return false;

  for (let i = 0; i < word.length; i++) {
    const cell = grid[y + dir.dy * i][x + dir.dx * i];
    /* An overlap on the same letter is not a clash — it makes a better puzzle. */
    if (cell !== null && cell !== word[i]) return false;
  }
  return true;
}

function place(word, size) {
  for (let attempt = 0; attempt < PLACE_ATTEMPTS; attempt++) {
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    if (!fits(word, x, y, dir, size)) continue;

    const cells = [];
    for (let i = 0; i < word.length; i++) {
      const cx = x + dir.dx * i, cy = y + dir.dy * i;
      grid[cy][cx] = word[i];
      cells.push({ x: cx, y: cy });
    }
    return cells;
  }
  return null;   // no room; the word is dropped rather than forcing it
}

/*
 * Native's 14 words in a 13x13 grid don't always all fit — about 1 run in 11
 * came up short when each word only got one shot. Regenerating the whole grid
 * is cheap, so try a few times and keep the fullest result rather than
 * quietly handing the player an easier puzzle.
 */
function generate() {
  let best = null;
  for (let attempt = 0; attempt < GENERATE_ATTEMPTS; attempt++) {
    generateOnce();
    if (!best || words.length > best.words.length) best = { grid, words };
    if (words.length === MODES[mode].wordCount) return;
  }
  grid = best.grid;
  words = best.words;
}

function generateOnce() {
  const cfg = MODES[mode];
  grid = Array.from({ length: cfg.size }, () => Array(cfg.size).fill(null));

  const pool = mode === 'learner'
    ? theme.learner
    : theme.native.map(word => ({ word, meaning: '' }));

  /* Longest first — the hard ones need the empty grid. */
  const candidates = shuffled(pool)
    .slice(0, cfg.wordCount)
    .sort((a, b) => b.word.length - a.word.length);

  words = [];
  candidates.forEach(entry => {
    const cells = place(entry.word, cfg.size);
    if (cells) words.push({ ...entry, cells, found: false });
  });

  const filler = fillerPool(words);
  for (let y = 0; y < cfg.size; y++) {
    for (let x = 0; x < cfg.size; x++) {
      if (grid[y][x] === null) {
        grid[y][x] = filler[Math.floor(Math.random() * filler.length)];
      }
    }
  }
}

/* ── the game's markup ──────────────────────────────────────── */

/*
 * Built here rather than written into each page. There is one hub page and a
 * page per theme, and copying this block into all of them would mean ten
 * places to update. Each page supplies only <div id="ws-app" data-theme="...">
 * plus its own prose, which is the part that differs and the part search
 * engines care about.
 */
function buildGameUI(host) {
  host.innerHTML = `
    <div class="game-wrap">
      <div id="game">
        <div id="ws-grid" class="ws-grid"></div>

        <div id="info">
          <span class="tag tag-words">🔤 Vocabulary</span>

          <div class="stats">
            <div><h2>Found</h2> <p><span id="found">0</span>/<span id="total">0</span></p></div>
            <div><h2>Time</h2>  <p id="timer">—</p></div>
          </div>

          <div class="ws-picker">
            <h2>Level</h2>
            <select id="mode-select">
              <option value="learner">English learner</option>
              <option value="native">Native speaker</option>
            </select>
          </div>

          <p id="ws-note" class="ws-note"></p>

          <h2>Words to find</h2>
          <ul id="ws-words" class="ws-words"></ul>

          <div class="game-actions">
            <button id="howto-btn" class="btn-block">❓ How to play</button>
            <button id="pause-btn" class="btn-block">⏸ Pause</button>
            <button id="mute-btn" class="btn-block">🔊 Sound on</button>
            <button id="print-btn" class="btn-block">🖨 Print this puzzle</button>
          </div>
          <a class="btn-support" href="https://buymeacoffee.com/liadb" target="_blank" rel="noopener">☕ Buy me a coffee</a>
        </div>
      </div>

      <nav class="ws-themes">
        <h2>Other themes</h2>
        <span id="ws-theme-links"></span>
      </nav>
    </div>
  `;

  /*
   * The worksheet is appended to <body>, not to the host. The print stylesheet
   * hides every child of body except .ws-print, so nesting it inside the game
   * meant hiding its own parent and printing a blank sheet.
   */
  const sheet = document.createElement('div');
  sheet.id = 'ws-print';
  sheet.className = 'ws-print';
  sheet.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sheet);
}

const host = document.getElementById('ws-app');
buildGameUI(host);

/*
 * Theme comes from the page itself first — each theme page declares its own —
 * then ?theme= for links, then the first theme. The hub passes nothing.
 */
const asked = host.dataset.theme || new URLSearchParams(location.search).get('theme');
theme = THEMES.find(t => t.key === asked) || THEMES[0];

const gridEl = document.getElementById('ws-grid');
const listEl = document.getElementById('ws-words');
const noteEl = document.getElementById('ws-note');

/* ── rendering ──────────────────────────────────────────────── */

function renderGrid() {
  const size = MODES[mode].size;
  gridEl.style.setProperty('--ws-cols', size);
  gridEl.innerHTML = '';

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = document.createElement('button');
      cell.className = 'ws-cell';
      cell.textContent = grid[y][x];
      cell.dataset.x = x;
      cell.dataset.y = y;
      gridEl.appendChild(cell);
    }
  }
}

function cellAt(x, y) {
  return gridEl.querySelector(`[data-x="${x}"][data-y="${y}"]`);
}

function renderWords() {
  listEl.innerHTML = '';
  words.forEach(w => {
    const li = document.createElement('li');
    li.textContent = w.word;
    li.className = w.found ? 'is-found' : '';
    listEl.appendChild(li);
  });
}

/* Real links, not a dropdown — a crawler can follow these to every theme. */
function renderThemeLinks() {
  const nav = document.getElementById('ws-theme-links');
  nav.innerHTML = '';
  THEMES.forEach(t => {
    if (t.key === theme.key) return;
    const a = document.createElement('a');
    a.href = `${host.dataset.base || ''}${t.key}.html`;
    a.textContent = t.name;
    nav.appendChild(a);
  });
}

function updateStats() {
  document.getElementById('found').textContent = words.filter(w => w.found).length;
  document.getElementById('total').textContent = words.length;

  const timerEl = document.getElementById('timer');
  timerEl.textContent = MODES[mode].hasTimer
    ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    : '—';
}

function say(text) {
  noteEl.textContent = text;
  noteEl.classList.toggle('is-active', Boolean(text));
}

/* ── printing ───────────────────────────────────────────────── */

/*
 * Prints the puzzle currently on screen, so a teacher can regenerate until
 * they like one and then print that exact grid. Built on beforeprint rather
 * than kept in sync, so Ctrl+P works as well as the button does.
 *
 * The answer key repeats the grid with the solution letters picked out, on a
 * second sheet.
 */
function renderPrintable() {
  const solution = new Set(words.flatMap(w => w.cells.map(c => `${c.x},${c.y}`)));

  const asTable = (markSolution) => {
    const rows = grid.map((row, y) => {
      const cells = row.map((letter, x) => {
        const isAnswer = markSolution && solution.has(`${x},${y}`);
        return `<td class="${isAnswer ? 'is-answer' : ''}">${letter}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table class="ws-print-grid">${rows}</table>`;
  };

  const wordList = words.map(w => `<li>${w.word}</li>`).join('');
  const level = mode === 'learner' ? 'English learner' : 'Native speaker';

  document.getElementById('ws-print').innerHTML = `
    <section class="ws-sheet">
      <h2>${theme.name} word search</h2>
      <p class="ws-sheet-sub">${level} · find all ${words.length} words ·
         across, down or diagonally, never backwards</p>
      ${asTable(false)}
      <ul class="ws-print-words">${wordList}</ul>
      <p class="ws-sheet-foot">puzzleten.com</p>
    </section>

    <section class="ws-sheet ws-sheet-answers">
      <h2>${theme.name} word search — answers</h2>
      ${asTable(true)}
      <p class="ws-sheet-foot">puzzleten.com</p>
    </section>
  `;
}

/*
 * beforeprint is not universally fired — headless Chrome's printToPDF skips
 * it, and older Safari never had it — and a print stylesheet with an empty
 * sheet prints a blank page. So build it whenever the puzzle changes and
 * treat beforeprint as a refresh rather than the only trigger.
 */
window.addEventListener('beforeprint', renderPrintable);

/* ── selection ──────────────────────────────────────────────── */

/*
 * The straight line between two cells, or null if they aren't on one.
 * Diagonals must be exact — a 2-across, 3-down pair is not a line.
 */
function lineBetween(a, b) {
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  const spanX = Math.abs(b.x - a.x);
  const spanY = Math.abs(b.y - a.y);

  const isStraight = dx === 0 || dy === 0 || spanX === spanY;
  if (!isStraight) return null;

  const length = Math.max(spanX, spanY) + 1;
  return Array.from({ length }, (_, i) => ({ x: a.x + dx * i, y: a.y + dy * i }));
}

function setAnchor(cell) {
  gridEl.querySelectorAll('.is-anchor').forEach(el => el.classList.remove('is-anchor'));
  anchor = cell;
  if (cell) cellAt(cell.x, cell.y).classList.add('is-anchor');
}

function handleTap(x, y) {
  if (shell.isBlocked()) return;

  if (!anchor) {
    setAnchor({ x, y });
    say('');
    return;
  }

  if (anchor.x === x && anchor.y === y) {   // tapping the anchor again cancels
    setAnchor(null);
    return;
  }

  const line = lineBetween(anchor, { x, y });
  setAnchor(null);
  if (!line) { say('Not a straight line — try again.'); return; }

  const letters = line.map(c => grid[c.y][c.x]).join('');
  /*
   * Words are placed forwards, but a player who taps the last letter first
   * is not wrong — accept either reading of the same line.
   */
  const reversed = letters.split('').reverse().join('');
  const hit = words.find(w => !w.found && (w.word === letters || w.word === reversed));

  if (!hit) { say(''); return; }

  hit.found = true;
  /*
   * Highlight the line the player tapped, not where the word was planted.
   * Filler letters regularly spell a listed word somewhere else by accident
   * (~1 puzzle in 8), and highlighting the planted cells then lights up a
   * different part of the grid from the one they just solved.
   */
  hit.foundCells = line;
  line.forEach(c => cellAt(c.x, c.y).classList.add('is-found'));
  Sound.place();

  score += hit.word.length * 10;
  say(MODES[mode].showsMeaning && hit.meaning
    ? `${hit.word} — ${hit.meaning}`
    : `Found ${hit.word}!`);

  renderWords();
  updateStats();

  if (words.every(w => w.found)) finish();
}

function finish() {
  /* Faster is worth more, but only where there is a clock to beat. */
  const bonus = MODES[mode].hasTimer ? Math.max(0, 300 - seconds) : 0;
  Sound.chain(3);
  shell.gameOver(
    score + bonus,
    MODES[mode].hasTimer ? `${words.length} words · ${seconds}s` : `${words.length} words`,
    'SOLVED!'
  );
}

gridEl.addEventListener('click', (e) => {
  const cell = e.target.closest('.ws-cell');
  if (cell) handleTap(Number(cell.dataset.x), Number(cell.dataset.y));
});

/* ── wiring ─────────────────────────────────────────────────── */

const modeSelect = document.getElementById('mode-select');
if (host.dataset.mode) modeSelect.value = host.dataset.mode;
mode = modeSelect.value;
modeSelect.addEventListener('change', () => { mode = modeSelect.value; shell.start(); });

renderThemeLinks();

const shell = createGameShell({
  /*
   * Per mode: native scores carry a time bonus and use longer words, so a
   * single key would mean a learner-level player could never set a best.
   */
  name: () => `wordsearch-${mode}`,
  title: 'WORD SEARCH',
  subtitle: 'Find every word in the grid',
  howTo: HOW_TO,
  stepMs: 1000,   // one tick per second, for the timer

  onReset() {
    seconds = 0;
    score = 0;
    anchor = null;
    say('');
    generate();
    renderGrid();
    renderWords();
    renderPrintable();
    updateStats();
  },

  onStep() {
    if (!MODES[mode].hasTimer) return;
    seconds++;
    updateStats();
  },

  onDraw() {
    /* Nothing to do — the DOM is updated on tap, not every frame. */
  },
});

document.getElementById('pause-btn').addEventListener('click', () => shell.togglePause());
document.getElementById('howto-btn').addEventListener('click', () => shell.showHowTo());
document.getElementById('print-btn').addEventListener('click', () => window.print());

const muteBtn = document.getElementById('mute-btn');
function syncMuteButton() {
  muteBtn.textContent = Sound.isMuted() ? '🔇 Sound off' : '🔊 Sound on';
}
muteBtn.addEventListener('click', () => {
  Sound.setMuted(!Sound.isMuted());
  syncMuteButton();
});
syncMuteButton();
