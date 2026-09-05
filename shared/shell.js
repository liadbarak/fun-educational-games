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

/* ── event tracking ────────────────────────────────────────── */

/*
 * A page_view on its own cannot tell a real player from a crawler that ran
 * the JavaScript — in Analytics the two are identical. These events can:
 * nothing automated clicks through the how-to screen and finishes a round.
 *
 * Best-effort, like the high scores. If gtag is blocked by an extension or
 * still loading, the call is dropped rather than throwing mid-game.
 */
function track(name, params) {
  try {
    if (typeof gtag === 'function') gtag('event', name, params || {});
  } catch (e) {
    /* analytics is never worth breaking a game over */
  }
}

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

/* Reads a theme colour off :root, so style.css stays the only place colour lives. */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* Player settings, same best-effort storage rules as the high score. */
const Prefs = {
  read(key, fallback) {
    try {
      const stored = localStorage.getItem('pref:' + key);
      return stored === null ? fallback : JSON.parse(stored);
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem('pref:' + key, JSON.stringify(value));
    } catch {
      /* ignore — the setting just won't survive a reload */
    }
  },
};

/* ── ads ───────────────────────────────────────────────────── */

/*
 * Dormant until PUB_ID is filled in.
 *
 * AdSense hands you a publisher id ("ca-pub-...") on signup, before the site is
 * reviewed, and a numeric id per ad unit you create. Fill both in below and
 * every matching <div class="ad-slot"> on the site starts serving. Leave PUB_ID
 * empty and nothing loads at all — no script, no request, no layout shift.
 * That is the entire switch, and it lives only here.
 *
 * Pages mark positions by name (data-slot="in-article") rather than by numeric
 * id, so turning ads on never means editing the page files. A name with no id
 * in SLOT_IDS is skipped, which makes a half-configured state degrade to blank
 * space instead of a broken unit.
 */
const PUB_ID = '';           // e.g. 'ca-pub-0000000000000000'
const SLOT_IDS = {
  'in-article': '',          // e.g. '1234567890'
  'end-of-article': '',
};

(function initAds() {
  if (!PUB_ID) return;

  const slots = [...document.querySelectorAll('.ad-slot')]
    .filter(el => SLOT_IDS[el.dataset.slot]);
  if (!slots.length) return;

  const tag = document.createElement('script');
  tag.async = true;
  tag.crossOrigin = 'anonymous';
  tag.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + PUB_ID;
  document.head.appendChild(tag);

  slots.forEach(slot => {
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.dataset.adClient = PUB_ID;
    ins.dataset.adSlot = SLOT_IDS[slot.dataset.slot];
    ins.dataset.adFormat = 'auto';
    ins.dataset.fullWidthResponsive = 'true';
    slot.appendChild(ins);

    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  });
})();

/* ── footer ────────────────────────────────────────────────── */

/* `base` is the relative path back to the site root: '' from the hub, '../' from a game. */
function renderFooter(base) {
  const footer = document.createElement('div');
  footer.id = 'site-footer';
  footer.innerHTML =
    `<a href="${base}index.html">All games</a>·` +
    `<a href="${base}guides/">Guides</a>·` +
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
  let paused = false;    // the player pressed pause
  let suspended = false; // the game paused itself, e.g. to ask a question
  let over = true;
  let stepMs = config.stepMs;
  let accum = 0;
  let lastTime = null;
  let frameId = null;
  let startedAt = null;   // when the current round began, for seconds_played

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

    /*
     * Suspended freezes the simulation but not the renderer — a game that
     * pauses itself to show something happening still needs its animations
     * to run while it's stopped.
     */
    if (suspended) { config.onDraw(); return; }

    accum += timestamp - (lastTime ?? timestamp);
    lastTime = timestamp;

    if (accum >= stepMs) {
      accum = 0;
      config.onStep();
    }
    config.onDraw();
  }

  const shell = {
    /* True while input should be ignored — paused, suspended, or on an overlay. */
    isBlocked() { return paused || over || suspended; },

    /*
     * Freeze the game for something the game itself raised (a quiz, a cutscene).
     * Kept separate from the player's own pause so resuming from a question
     * can never un-pause a game the player deliberately paused.
     */
    suspend() { suspended = true; },
    resume() {
      suspended = false;
      lastTime = null;
      accum = 0;
    },

    /* Speed the game up (or slow it down) as difficulty changes. */
    setStepMs(ms) { stepMs = ms; },

    redraw() { config.onDraw(); },

    start() {
      track('game_start', { game_name: config.name });
      startedAt = Date.now();
      config.onReset();
      paused = false;
      suspended = false;
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

    /*
     * Reopen the rules mid-game. Before the first round it just re-renders the
     * start screen; during a round it freezes play and offers a way back in.
     */
    showHowTo() {
      track('howto_opened', { game_name: config.name });
      if (over) { showStartScreen(); return; }
      suspended = true;
      showOverlay(`
        <h2>HOW TO PLAY</h2>
        ${config.howTo || ''}
        <button class="btn-primary" data-action="resume">BACK TO GAME</button>
      `);
    },

    /*
     * @param {string} [detail]  Extra line above the score, e.g. "Level 4".
     * @param {string} [heading] Overrides "GAME OVER" — a puzzle that has been
     *                           completed has been won, not lost.
     */
    gameOver(score, detail, heading) {
      over = true;
      const best = HighScore.read(config.name);
      const isRecord = score > best;
      if (isRecord) HighScore.write(config.name, score);

      track('game_over', {
        game_name: config.name,
        score: score,
        seconds_played: startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0,
        is_record: isRecord,
      });

      showOverlay(`
        <h2>${heading || 'GAME OVER'}</h2>
        ${detail ? `<p>${detail}</p>` : ''}
        <p>Score: ${score}</p>
        <p class="best">${isRecord ? '★ NEW BEST!' : `Best: ${best}`}</p>
        <button class="btn-primary" data-action="start">PLAY AGAIN</button>
      `);
    },
  };

  function syncPauseButton() {
    const btn = document.getElementById('pause-btn');
    if (btn) btn.textContent = paused ? '▶ Resume' : '⏸ Pause';
  }

  function showStartScreen() {
    const best = HighScore.read(config.name);
    showOverlay(`
      <h2>${config.title}</h2>
      <p>${config.subtitle}</p>
      ${config.howTo || ''}
      ${best ? `<p class="best">Best: ${best}</p>` : ''}
      <button class="btn-primary" data-action="start">
        ${config.howTo ? 'GOT IT — PLAY' : 'START'}
      </button>
    `);
  }

  showStartScreen();

  /* One listener for every overlay button, so games never wire up onclick by hand. */
  overlay.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action === 'start') shell.start();
    if (action === 'resume') { overlay.style.display = 'none'; shell.resume(); }
  });

  /* P pauses in every game. */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') shell.togglePause();
  });

  return shell;
}
