/*
 * Shared plumbing for every game on the site:
 *   - Google Analytics
 *   - the site footer
 *   - a game shell that owns the animation loop, pause state,
 *     the start / game-over overlay, and the local high score
 *
 * A game only has to say how to reset, advance one step, and draw itself.
 */

/* ── analytics ─────────────────────────────────────────────── */

(function initAnalytics() {
  const ID = 'G-DT4R40PW7C';
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(tag);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', ID);
})();

/* ── high scores ───────────────────────────────────────────── */

/*
 * Best-effort only. Private browsing and blocked-cookie setups throw on
 * localStorage, and a missing high score should never stop someone playing.
 */
const HighScore = {
  read(game) {
    try {
      return Number(localStorage.getItem('best:' + game)) || 0;
    } catch {
      return 0;
    }
  },
  write(game, score) {
    try {
      localStorage.setItem('best:' + game, String(score));
    } catch {
      /* ignore — the game works fine without a saved score */
    }
  },
};

/* ── footer ────────────────────────────────────────────────── */

/* `base` is the relative path back to the site root: '' from the hub, '../' from a game. */
function renderFooter(base) {
  const footer = document.createElement('div');
  footer.id = 'site-footer';
  footer.innerHTML =
    `<a href="${base}index.html">All games</a>·` +
    `<a href="${base}about.html">About</a>·` +
    `<a href="${base}about.html#privacy">Privacy</a>·` +
    `<a href="https://buymeacoffee.com/liadb" target="_blank" rel="noopener">Support</a>`;
  document.body.appendChild(footer);
}

/* ── game shell ────────────────────────────────────────────── */

/**
 * Creates the loop-and-overlay shell around a game.
 *
 * @param {object}   config
 * @param {string}   config.name      Key used for the saved high score.
 * @param {string}   config.title     Shown on the start overlay.
 * @param {string}   config.subtitle  Shown under the title on the start overlay.
 * @param {number}   config.stepMs    Milliseconds between game steps.
 * @param {function} config.onReset   Sets up a fresh game.
 * @param {function} config.onStep    Advances the game one step.
 * @param {function} config.onDraw    Renders the current state.
 */
function createGameShell(config) {
  let paused = false;
  let over = true;
  let stepMs = config.stepMs;
  let accum = 0;
  let lastTime = null;
  let frameId = null;

  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.innerHTML = '<div id="overlay-box"></div>';
  document.body.appendChild(overlay);
  const box = overlay.querySelector('#overlay-box');

  function showOverlay(html) {
    box.innerHTML = html;
    overlay.style.display = 'flex';
  }

  function loop(timestamp) {
    frameId = requestAnimationFrame(loop);
    if (paused || over) return;

    accum += timestamp - (lastTime ?? timestamp);
    lastTime = timestamp;

    if (accum >= stepMs) {
      accum = 0;
      config.onStep();
    }
    config.onDraw();
  }

  const shell = {
    /* True while input should be ignored — paused, or sitting on an overlay. */
    isBlocked() { return paused || over; },

    /* Speed the game up (or slow it down) as difficulty changes. */
    setStepMs(ms) { stepMs = ms; },

    redraw() { config.onDraw(); },

    start() {
      config.onReset();
      paused = false;
      over = false;
      accum = 0;
      lastTime = null;
      overlay.style.display = 'none';
      syncPauseButton();
      if (frameId === null) frameId = requestAnimationFrame(loop);
    },

    togglePause() {
      if (over) return;
      paused = !paused;
      /* Drop the elapsed time from the pause, or the game jumps forward on resume. */
      if (!paused) { lastTime = null; accum = 0; }
      syncPauseButton();
    },

    /* @param {string} [detail] Extra line shown above the score, e.g. "Level 4". */
    gameOver(score, detail) {
      over = true;
      const best = HighScore.read(config.name);
      const isRecord = score > best;
      if (isRecord) HighScore.write(config.name, score);

      showOverlay(`
        <h2>GAME OVER</h2>
        ${detail ? `<p>${detail}</p>` : ''}
        <p>Score: ${score}</p>
        <p class="best">${isRecord ? '★ NEW BEST!' : `Best: ${best}`}</p>
        <button data-action="start">PLAY AGAIN</button>
      `);
    },
  };

  function syncPauseButton() {
    const btn = document.getElementById('pause-btn');
    if (btn) btn.textContent = paused ? '▶ Resume' : '⏸ Pause';
  }

  /* Start screen. */
  const best = HighScore.read(config.name);
  showOverlay(`
    <h2>${config.title}</h2>
    <p>${config.subtitle}</p>
    ${best ? `<p class="best">Best: ${best}</p>` : ''}
    <button data-action="start">START</button>
  `);

  /* One listener for both overlay buttons, so games never wire up onclick by hand. */
  overlay.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'start') shell.start();
  });

  /* P pauses in every game. */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') shell.togglePause();
  });

  return shell;
}
