/*
 * Word Search test suite.
 *
 * Runs against the real game in an iframe rather than a copy of it, so there
 * is nothing to keep in sync. Each test gets `w`, the game's window, and can
 * read its globals directly — grid, words, mode, theme, shell, THEMES, MODES.
 *
 * No framework and no build step, on purpose: open tests/index.html in a
 * browser and the results are on screen.
 *
 * Most of these exist because the bug they describe actually happened. Where
 * that's true the comment says so — don't delete a test without reading it.
 */

const TESTS = [

  /* ── generation ─────────────────────────────────────────── */

  {
    name: 'every word is really at the cells recorded for it',
    why: 'a later word can overwrite an earlier one if overlap checks are wrong',
    run(w) {
      for (let i = 0; i < 100; i++) {
        w.mode = i % 2 ? 'native' : 'learner';
        w.theme = w.THEMES[i % w.THEMES.length];
        w.generate();
        const bad = w.words.find(x =>
          x.cells.map(c => w.grid[c.y][c.x]).join('') !== x.word);
        if (bad) return `run ${i}: ${bad.word} is not at its own cells`;
      }
    },
  },

  {
    name: 'no puzzle is short of words',
    why: 'FIXED BUG: 14 words in 13x13 failed to all fit in ~1 run in 11, '
       + 'silently handing the player an easier puzzle. generate() now retries.',
    run(w) {
      for (const mode of ['learner', 'native']) {
        w.mode = mode;
        for (let i = 0; i < 120; i++) {
          w.theme = w.THEMES[i % w.THEMES.length];
          w.generate();
          const want = w.MODES[mode].wordCount;
          if (w.words.length !== want) {
            return `${mode} run ${i}: got ${w.words.length} words, wanted ${want}`;
          }
        }
      }
    },
  },

  {
    name: 'every cell holds a single A-Z letter',
    why: 'an unfilled cell renders as blank and looks like a rendering fault',
    run(w) {
      for (let i = 0; i < 40; i++) {
        w.mode = i % 2 ? 'native' : 'learner';
        w.theme = w.THEMES[i % w.THEMES.length];
        w.generate();
        for (const row of w.grid) {
          for (const cell of row) {
            if (!/^[A-Z]$/.test(cell || '')) return `bad cell: ${JSON.stringify(cell)}`;
          }
        }
      }
    },
  },

  {
    name: 'words are never placed backwards',
    why: 'the game promises "never backwards" in the how-to and on the page',
    run(w) {
      const allowed = w.DIRECTIONS.map(d => `${d.dx},${d.dy}`);
      for (let i = 0; i < 60; i++) {
        w.mode = i % 2 ? 'native' : 'learner';
        w.theme = w.THEMES[i % w.THEMES.length];
        w.generate();
        for (const word of w.words) {
          const a = word.cells[0], b = word.cells[1];
          const dir = `${Math.sign(b.x - a.x)},${Math.sign(b.y - a.y)}`;
          if (!allowed.includes(dir)) return `${word.word} runs ${dir}`;
        }
      }
    },
  },

  /* ── word lists ─────────────────────────────────────────── */

  {
    name: 'no word is longer than the grid it appears in',
    why: 'an oversized word can never be placed, so it silently vanishes',
    run(w) {
      for (const t of w.THEMES) {
        for (const e of t.learner) {
          if (e.word.length > w.MODES.learner.size) return `${t.key}: ${e.word}`;
        }
        for (const word of t.native) {
          if (word.length > w.MODES.native.size) return `${t.key}: ${word}`;
        }
      }
    },
  },

  {
    name: 'no theme repeats a word within one list',
    why: 'a duplicate can be selected twice and only ever be found once',
    run(w) {
      for (const t of w.THEMES) {
        for (const [key, list] of [['learner', t.learner.map(e => e.word)], ['native', t.native]]) {
          const seen = new Set();
          for (const word of list) {
            if (seen.has(word)) return `${t.key}.${key} repeats ${word}`;
            seen.add(word);
          }
        }
      }
    },
  },

  {
    name: 'every theme can fill a puzzle at both levels',
    why: 'a theme with too few words would quietly produce a smaller puzzle',
    run(w) {
      for (const t of w.THEMES) {
        if (t.learner.length < w.MODES.learner.wordCount) return `${t.key} learner has ${t.learner.length}`;
        if (t.native.length < w.MODES.native.wordCount) return `${t.key} native has ${t.native.length}`;
      }
    },
  },

  {
    name: 'every learner word has a meaning that does not give it away',
    why: 'the meaning is the whole point of learner mode, and a meaning '
       + 'containing the word itself is a free answer',
    run(w) {
      for (const t of w.THEMES) {
        for (const e of t.learner) {
          if (!e.meaning || e.meaning.length < 8) return `${t.key}: ${e.word} has no real meaning`;
          if (e.meaning.toUpperCase().includes(e.word)) return `${t.key}: "${e.meaning}" contains ${e.word}`;
          if (e.meaning.length > 60) return `${t.key}: ${e.word} meaning is ${e.meaning.length} chars, too long for the panel`;
        }
      }
    },
  },

  /* ── selection ──────────────────────────────────────────── */

  {
    name: 'tapping first letter then last finds a word',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      const word = w.words[0];
      tap(w, word.cells[0]);
      tap(w, word.cells[word.cells.length - 1]);
      if (!word.found) return `${word.word} was not marked found`;
    },
  },

  {
    name: 'tapping last letter then first also finds it',
    why: 'placement is forward-only but a player reading right-to-left is not wrong',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      const word = w.words[0];
      tap(w, word.cells[word.cells.length - 1]);
      tap(w, word.cells[0]);
      if (!word.found) return `${word.word} was not marked found in reverse`;
    },
  },

  {
    name: 'two cells that are not on a straight line are rejected',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      tap(w, { x: 0, y: 0 });
      tap(w, { x: 2, y: 3 });          // neither orthogonal nor a true diagonal
      const note = w.document.getElementById('ws-note').textContent;
      if (!/straight line/i.test(note)) return `expected a rejection, note said "${note}"`;
    },
  },

  {
    name: 'tapping the same cell twice clears the selection',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      tap(w, { x: 1, y: 1 });
      tap(w, { x: 1, y: 1 });
      if (w.document.querySelectorAll('.ws-cell.is-anchor').length !== 0) {
        return 'the anchor is still selected';
      }
    },
  },

  {
    name: 'finding a word somewhere it was NOT planted lights the tapped cells',
    why: 'FIXED BUG: filler letters spell a listed word elsewhere in roughly '
       + '1 puzzle in 8. The code used to highlight where the word was planted, '
       + 'lighting up a different part of the grid from the one just solved.',
    run(w) {
      for (let attempt = 0; attempt < 400; attempt++) {
        w.mode = 'learner';
        w.theme = w.THEMES[attempt % w.THEMES.length];
        w.shell.start();

        const ghost = findGhost(w);
        if (!ghost) continue;

        tap(w, ghost.line.cells[0]);
        tap(w, ghost.line.cells[ghost.line.cells.length - 1]);

        const lit = key([...w.document.querySelectorAll('.ws-cell.is-found')]
          .map(c => ({ x: +c.dataset.x, y: +c.dataset.y })));
        const want = key(ghost.line.cells);
        if (lit !== want) return `tapped ${want} but lit ${lit}`;
        return;   // one confirmed case is enough
      }
      return 'SKIPPED — no ghost occurred in 400 puzzles';
    },
  },

  {
    name: 'the found counter never exceeds the number of words',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      solveAll(w);
      const found = Number(w.document.getElementById('found').textContent);
      const total = Number(w.document.getElementById('total').textContent);
      if (found > total) return `${found}/${total}`;
    },
  },

  {
    name: 'the word list crosses off exactly the words that were found',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      tap(w, w.words[0].cells[0]);
      tap(w, w.words[0].cells[w.words[0].cells.length - 1]);
      const struck = [...w.document.querySelectorAll('.ws-words li.is-found')].map(li => li.textContent);
      const found = w.words.filter(x => x.found).map(x => x.word);
      if (struck.sort().join() !== found.sort().join()) {
        return `list shows ${struck} but state has ${found}`;
      }
    },
  },

  /* ── finishing ──────────────────────────────────────────── */

  {
    name: 'solving everything says SOLVED, not GAME OVER',
    why: 'a finished puzzle has been won',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      solveAll(w);
      const heading = w.document.querySelector('#overlay-box h2').textContent;
      if (heading !== 'SOLVED!') return `heading was "${heading}"`;
    },
  },

  {
    name: 'the timer stops once the puzzle is solved',
    run(w) {
      w.mode = 'native';
      w.shell.start();
      solveAll(w);
      const before = w.seconds;
      w.onStepProbe = true;
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(w.seconds > before ? `timer went ${before} -> ${w.seconds}` : undefined);
        }, 2200);
      });
    },
  },

  {
    name: 'the timer never runs in learner mode',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(w.seconds !== 0 ? `seconds reached ${w.seconds}` : undefined);
        }, 2200);
      });
    },
  },

  {
    name: 'each level keeps its own best score',
    why: 'FIXED BUG: one shared key meant native scores (longer words plus a '
       + 'time bonus) permanently outranked anything a learner could score',
    run(w) {
      try { w.localStorage.removeItem('best:wordsearch-learner'); } catch (e) { /* private mode */ }
      w.mode = 'learner';
      w.shell.start();
      solveAll(w);
      w.mode = 'native';
      w.shell.start();
      solveAll(w);
      const keys = Object.keys(w.localStorage).filter(k => k.startsWith('best:wordsearch'));
      if (keys.length < 2) return `only found ${JSON.stringify(keys)}`;
    },
  },

  /* ── pause ──────────────────────────────────────────────── */

  {
    name: 'pausing hides the grid',
    why: 'FIXED BUG: leaving the letters on screen made pause free thinking '
       + 'time in the timed level',
    run(w) {
      w.mode = 'native';
      w.shell.start();
      w.shell.togglePause();
      const filter = w.getComputedStyle(w.document.querySelector('.ws-grid')).filter;
      w.shell.togglePause();
      if (filter === 'none') return 'the grid is still readable while paused';
    },
  },

  {
    name: 'taps are ignored while paused',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      w.shell.togglePause();
      const word = w.words[0];
      tap(w, word.cells[0]);
      tap(w, word.cells[word.cells.length - 1]);
      w.shell.togglePause();
      if (word.found) return `${word.word} was found while the game was paused`;
    },
  },

  /* ── resilience ─────────────────────────────────────────── */

  {
    name: 'a fresh puzzle clears the previous score, timer and selection',
    run(w) {
      w.mode = 'native';
      w.shell.start();
      solveAll(w);
      w.shell.start();
      if (w.score !== 0) return `score carried over: ${w.score}`;
      if (w.seconds !== 0) return `timer carried over: ${w.seconds}`;
      if (w.document.querySelectorAll('.ws-cell.is-found').length) return 'old cells still highlighted';
    },
  },

  {
    name: 'analytics records one game_start per puzzle',
    run(w) {
      const count = () => (w.dataLayer || [])
        .filter(a => a[0] === 'event' && a[1] === 'game_start').length;
      const before = count();
      w.shell.start();
      const after = count();
      if (after !== before + 1) return `game_start went ${before} -> ${after}`;
    },
  },
  /* ── resilience ─────────────────────────────────────────── */

  {
    name: 'a game still plays when storage is unavailable',
    why: 'private browsing throws on localStorage; a missing best score must '
       + 'never stop somebody playing',
    run(w) {
      const view = w.document.defaultView;
      let restore;
      try {
        const real = Object.getOwnPropertyDescriptor(view, 'localStorage')
                  || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(view), 'localStorage');
        if (!real || !real.configurable) return 'SKIPPED — localStorage is not redefinable here';
        Object.defineProperty(view, 'localStorage', {
          configurable: true,
          get() { throw new Error('denied'); },
        });
        restore = () => Object.defineProperty(view, 'localStorage', real);

        w.mode = 'learner';
        w.shell.start();
        const word = w.words[0];
        tap(w, word.cells[0]);
        tap(w, word.cells[word.cells.length - 1]);
        if (!word.found) return 'a word could not be found with storage blocked';
        solveAll(w);
        if (w.document.querySelector('#overlay-box h2').textContent !== 'SOLVED!') {
          return 'the puzzle did not complete with storage blocked';
        }
      } finally {
        if (restore) restore();
      }
    },
  },

  {
    name: 'a throwing sound effect does not swallow a find',
    why: 'Sound.place() runs before the score update, so an audio failure '
       + 'would silently stop the word registering',
    run(w) {
      const real = w.Sound.place;
      w.Sound.place = () => { throw new Error('no audio device'); };
      try {
        w.mode = 'learner';
        w.shell.start();
        const word = w.words[0];
        tap(w, word.cells[0]);
        tap(w, word.cells[word.cells.length - 1]);
        if (!word.found) return `${word.word} did not register when audio threw`;
      } finally {
        w.Sound.place = real;
      }
    },
  },

  {
    name: 'a word already found cannot be found again',
    why: 'double scoring, and the counter could pass the total',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      const word = w.words[0];
      tap(w, word.cells[0]);
      tap(w, word.cells[word.cells.length - 1]);
      const scoreAfterFirst = w.score;
      tap(w, word.cells[0]);
      tap(w, word.cells[word.cells.length - 1]);
      if (w.score !== scoreAfterFirst) return `score went ${scoreAfterFirst} -> ${w.score}`;
      const found = Number(w.document.getElementById('found').textContent);
      if (found !== w.words.filter(x => x.found).length) return `counter says ${found}`;
    },
  },

  /* ── puzzle quality ─────────────────────────────────────── */

  {
    name: 'every letter on the board comes from a word that is on the board',
    why: 'filler is drawn from the placed words on purpose — uniform random '
       + 'filler leaves the planted words as the only place common letters '
       + 'cluster, which gives them away',
    run(w) {
      for (let i = 0; i < 40; i++) {
        w.mode = i % 2 ? 'native' : 'learner';
        w.theme = w.THEMES[i % w.THEMES.length];
        w.generate();
        const allowed = new Set(w.words.flatMap(x => x.word.split('')));
        for (const row of w.grid) {
          for (const letter of row) {
            if (!allowed.has(letter)) return `"${letter}" appears but is in no word`;
          }
        }
      }
    },
  },

  {
    name: 'all four directions get used',
    why: 'losing one would make every puzzle feel the same, with no error',
    run(w) {
      const seen = new Set();
      for (let i = 0; i < 60; i++) {
        w.mode = 'native';
        w.theme = w.THEMES[i % w.THEMES.length];
        w.generate();
        w.words.forEach(word => {
          const a = word.cells[0], b = word.cells[1];
          seen.add(`${Math.sign(b.x - a.x)},${Math.sign(b.y - a.y)}`);
        });
      }
      if (seen.size !== w.DIRECTIONS.length) {
        return `only saw ${[...seen].join(' ')} of ${w.DIRECTIONS.length} directions`;
      }
    },
  },

  {
    name: 'words share letters often enough to feel dense',
    why: 'overlaps are accepted deliberately; if that check broke, grids would '
       + 'go sparse and easy without anything failing',
    run(w) {
      let withOverlap = 0;
      const RUNS = 40;
      for (let i = 0; i < RUNS; i++) {
        w.mode = 'native';
        w.theme = w.THEMES[i % w.THEMES.length];
        w.generate();
        const used = new Map();
        let overlapped = false;
        w.words.forEach(word => word.cells.forEach(c => {
          const k = `${c.x},${c.y}`;
          if (used.has(k)) overlapped = true;
          used.set(k, true);
        }));
        if (overlapped) withOverlap++;
      }
      if (withOverlap < RUNS / 2) {
        return `only ${withOverlap}/${RUNS} puzzles had any overlapping words`;
      }
    },
  },

  /* ── deep links, which the theme pages will rely on ─────── */



  /* ── layout ─────────────────────────────────────────────── */

  {
    name: 'nothing overflows sideways at any common screen width',
    why: 'FIXED BUG (in the other games): a phone held sideways got the desktop '
       + 'layout and put the controls 468px below the fold',
    async run(w) {
      const widths = [320, 360, 390, 412, 430, 744, 1024, 1280];
      const before = w.frame.style.width;
      try {
        for (const mode of ['learner', 'native']) {
          w.mode = mode;
          for (const width of widths) {
            w.frame.style.width = `${width}px`;
            await settle();
            w.shell.start();
            await settle();
            const doc = w.document.documentElement;
            if (doc.scrollWidth > width + 1) {
              return `${mode} at ${width}px overflows to ${doc.scrollWidth}px`;
            }
          }
        }
      } finally {
        w.frame.style.width = before;
        await settle();
      }
    },
  },

  {
    name: 'cells stay big enough to tap on a phone',
    why: 'quantifies the 13x13-on-a-phone worry so a bigger grid fails loudly. '
       + '24px is not a usability standard — it is a regression floor, set just '
       + 'under what the current layout achieves at the narrowest common width.',
    async run(w) {
      const MIN = 24;
      const before = w.frame.style.width;
      try {
        w.frame.style.width = '360px';
        w.mode = 'native';
        await settle();
        w.shell.start();
        await settle();
        const box = w.document.querySelector('.ws-cell').getBoundingClientRect();
        if (box.width < MIN) return `native cells are ${box.width.toFixed(1)}px at 360px wide`;
      } finally {
        w.frame.style.width = before;
        await settle();
      }
    },
  },
  /* ── theme pages and printing (phase 2) ─────────────────── */

  {
    name: 'each theme page loads its own theme',
    why: 'the whole point of separate pages — one that loads the wrong theme '
       + 'is a duplicate of another',
    async run(w) {
      for (const key of w.THEMES.map(t => t.key)) {
        const page = await loadFrame(`../wordsearch/${key}.html`);
        const loaded = page.theme.key;
        page.cleanup();
        if (loaded !== key) return `${key}.html loaded "${loaded}"`;
      }
    },
  },

  {
    name: 'each theme page declares itself canonical',
    why: 'pointing them all at /wordsearch/ is what made the themes invisible '
       + 'to search in the first place',
    async run(w) {
      for (const key of w.THEMES.map(t => t.key)) {
        const page = await loadFrame(`../wordsearch/${key}.html`);
        const href = page.document.querySelector('link[rel=canonical]').href;
        page.cleanup();
        if (!href.endsWith(`/wordsearch/${key}.html`)) return `${key}.html canonicals to ${href}`;
      }
    },
  },

  {
    name: 'the printed word lists match the ones the game uses',
    why: 'the lists are written into each page as text for search engines, so '
       + 'they can drift from themes.js without anything breaking on screen',
    async run(w) {
      for (const t of w.THEMES) {
        const page = await loadFrame(`../wordsearch/${t.key}.html`);
        const doc = page.document;

        const shownLearner = [...doc.querySelectorAll('.ws-wordlist[data-level=learner] li b')]
          .map(el => el.textContent.trim());
        const shownNative = doc.querySelector('.ws-wordlist-flat[data-level=native]')
          .textContent.split('·').map(x => x.trim()).filter(Boolean);
        page.cleanup();

        const realLearner = t.learner.map(e => e.word);
        if (shownLearner.join() !== realLearner.join()) {
          return `${t.key} learner list on the page is ${shownLearner} but themes.js has ${realLearner}`;
        }
        if (shownNative.join() !== t.native.join()) {
          return `${t.key} native list on the page is out of step with themes.js`;
        }
      }
    },
  },

  {
    name: 'every theme link points at a page that exists',
    async run(w) {
      w.shell.start();
      const links = [...w.document.querySelectorAll('.ws-theme-nav a')].map(a => a.getAttribute('href'));
      if (!links.length) return 'no theme links were rendered';
      for (const href of links) {
        const res = await fetch(`../wordsearch/${href}`);
        if (!res.ok) return `${href} returns ${res.status}`;
      }
    },
  },

  {
    name: 'printing produces a grid, a word list and an answer key',
    why: 'the print view is built on beforeprint, so nothing on screen reveals '
       + 'it being broken',
    run(w) {
      w.mode = 'learner';
      w.shell.start();
      w.dispatchEvent(new w.Event('beforeprint'));

      const sheets = w.document.querySelectorAll('.ws-print .ws-sheet');
      if (sheets.length !== 2) return `expected 2 sheets, got ${sheets.length}`;

      const cells = w.document.querySelectorAll('.ws-print .ws-sheet:first-child td');
      const size = w.MODES[w.mode].size;
      if (cells.length !== size * size) return `puzzle sheet has ${cells.length} cells, expected ${size * size}`;

      const listed = [...w.document.querySelectorAll('.ws-print-words li')].map(li => li.textContent);
      if (listed.sort().join() !== w.words.map(x => x.word).sort().join()) {
        return `word list on the sheet is ${listed}`;
      }

      const answers = w.document.querySelectorAll('.ws-print .ws-sheet-answers td.is-answer');
      const expected = new Set(w.words.flatMap(x => x.cells.map(c => `${c.x},${c.y}`))).size;
      if (answers.length !== expected) return `answer key marks ${answers.length} cells, expected ${expected}`;
    },
  },

  {
    name: 'the answer key marks exactly the letters of the hidden words',
    run(w) {
      w.mode = 'native';
      w.shell.start();
      w.dispatchEvent(new w.Event('beforeprint'));

      const size = w.MODES.native.size;
      const rows = [...w.document.querySelectorAll('.ws-print .ws-sheet-answers tr')];
      const marked = new Set();
      rows.forEach((tr, y) => [...tr.children].forEach((td, x) => {
        if (td.classList.contains('is-answer')) marked.add(`${x},${y}`);
      }));

      for (const word of w.words) {
        for (const c of word.cells) {
          if (!marked.has(`${c.x},${c.y}`)) return `${word.word} cell ${c.x},${c.y} is not marked`;
        }
      }
      if (rows.length !== size) return `answer grid has ${rows.length} rows`;
    },
  },
  {
    name: 'the worksheet sits directly under <body>',
    why: 'FIXED BUG: the print stylesheet hides every child of body except '
       + '.ws-print. With the sheet nested inside the game it hid its own '
       + 'parent, and printing produced a blank page.',
    run(w) {
      const sheet = w.document.getElementById('ws-print');
      if (!sheet) return 'no print container at all';
      if (sheet.parentElement !== w.document.body) {
        return `it is inside <${sheet.parentElement.tagName.toLowerCase()}>, not <body>`;
      }
    },
  },

  {
    name: 'the worksheet is ready without beforeprint ever firing',
    why: "FIXED BUG: beforeprint is not fired by Chrome's printToPDF, nor by "
       + 'Safari before 13. Building the sheet only on that event printed a '
       + 'blank page. It is now rebuilt whenever the puzzle changes.',
    run(w) {
      w.mode = 'learner';
      w.shell.start();          // deliberately no beforeprint dispatched
      const sheets = w.document.querySelectorAll('.ws-print .ws-sheet');
      if (sheets.length !== 2) return `${sheets.length} sheets were ready`;
      const cells = w.document.querySelectorAll('.ws-print .ws-sheet:first-child td').length;
      const size = w.MODES.learner.size;
      if (cells !== size * size) return `${cells} cells, expected ${size * size}`;
    },
  },
  {
    name: 'the theme picker links to every theme page',
    why: 'the picker is the only route from the home page to a theme, and its '
       + 'cards are written by hand, so they will drift as themes are added',
    async run(w) {
      const res = await w.fetch('../wordsearch/index.html');
      const html = await res.text();
      for (const t of w.THEMES) {
        if (!html.includes(`href="${t.key}.html"`)) {
          return `the picker has no card linking to ${t.key}.html`;
        }
      }
    },
  },

  {
    name: 'the picker page does not try to run the game',
    why: 'it has no #ws-app, so loading the game script there would throw',
    async run(w) {
      const res = await w.fetch('../wordsearch/index.html');
      const html = await res.text();
      if (html.includes('wordsearch.js')) return 'the picker still loads wordsearch.js';
      if (html.includes('ws-app')) return 'the picker still has a game mount point';
    },
  },

  {
    name: 'the home page reaches the themes through the picker',
    why: 'the site is home -> picker -> game; a broken first hop hides all of it',
    async run(w) {
      const res = await w.fetch('../index.html');
      const html = await res.text();
      if (!html.includes('href="wordsearch/"')) return 'the home page does not link to the picker';
    },
  },

  {
    name: 'prev and next point at the neighbouring themes',
    why: 'reads the theme off the nav itself, not the global — earlier tests '
       + 'reassign it to exercise generation, and the nav is only rendered once',
    run(w) {
      const nav = w.document.getElementById('ws-theme-nav');
      const showing = nav.querySelector('.ws-nav-here b').textContent;
      const at = w.THEMES.findIndex(t => t.name === showing);
      if (at < 0) return `the nav shows "${showing}", which is not a theme`;
      const prev = w.THEMES[(at - 1 + w.THEMES.length) % w.THEMES.length];
      const next = w.THEMES[(at + 1) % w.THEMES.length];

      const links = nav.querySelectorAll('.ws-nav-side');
      if (links.length !== 2) return `${links.length} arrow links`;
      if (links[0].getAttribute('href') !== `${prev.key}.html`) return `prev goes to ${links[0].getAttribute('href')}`;
      if (links[1].getAttribute('href') !== `${next.key}.html`) return `next goes to ${links[1].getAttribute('href')}`;
    },
  },

  {
    name: 'holding next cycles every theme and comes back',
    why: 'wrapping is the point — the first theme must not be a dead end '
       + 'backwards, nor the last one forwards',
    async run(w) {
      const keys = w.THEMES.map(t => t.key);
      let at = keys[0];
      const visited = [at];

      for (let step = 0; step < keys.length; step++) {
        const page = await loadFrame(`../wordsearch/${at}.html`);
        const href = page.document
          .querySelector('.ws-theme-nav .ws-nav-side.is-next')
          .getAttribute('href');
        page.cleanup();
        at = href.replace('.html', '');
        if (visited.length < keys.length) visited.push(at);
      }

      if (visited.sort().join() !== keys.slice().sort().join()) {
        return `walking next reached ${visited} of ${keys}`;
      }
      if (at !== keys[0]) return `after a full loop it landed on ${at}, not ${keys[0]}`;
    },
  },

  {
    name: 'every theme page offers a way back to the picker',
    run(w) {
      const back = w.document.querySelector('.ws-nav-here a');
      if (!back) return 'no link back to the picker';
      const href = back.getAttribute('href');
      if (href !== './') return `it points at ${href}`;
    },
  },
];

/* ── helpers ──────────────────────────────────────────────── */

const settle = () => new Promise(r => setTimeout(r, 120));

/*
 * A second frame, for tests that need the game to boot differently — a query
 * string, say. Cleaned up by the caller so one test cannot affect the next.
 */
async function loadFrame(src) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-3000px;top:0;width:1100px;height:900px;border:0';
  document.body.appendChild(frame);
  await new Promise(resolve => {
    frame.addEventListener('load', resolve, { once: true });
    frame.src = src;
  });
  const api = frame.contentWindow.eval(`({
    document,
    get theme() { return theme },
    get words() { return words },
    get shell() { return shell },
  })`);
  api.cleanup = () => frame.remove();
  return api;
}

const key = (cells) => [...cells]
  .sort((a, b) => a.y - b.y || a.x - b.x)
  .map(c => `${c.x},${c.y}`).join(' ');

function tap(w, cell) {
  w.document.querySelector(`[data-x="${cell.x}"][data-y="${cell.y}"]`).click();
}

function solveAll(w) {
  w.words.slice().forEach(word => {
    tap(w, word.cells[0]);
    tap(w, word.cells[word.cells.length - 1]);
  });
}

/* A listed word readable somewhere other than where it was planted. */
function findGhost(w) {
  const N = w.grid.length;
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const planted = new Set(w.words.flatMap(x => [key(x.cells)]));

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      for (const [dx, dy] of dirs) {
        const cells = [];
        let letters = '';
        for (let i = 0; ; i++) {
          const cx = x + dx * i, cy = y + dy * i;
          if (cx < 0 || cx >= N || cy < 0 || cy >= N) break;
          cells.push({ x: cx, y: cy });
          letters += w.grid[cy][cx];
          if (letters.length < 3) continue;

          const word = w.words.find(item => !item.found && item.word === letters);
          if (word && !planted.has(key(cells))) {
            return { word, line: { cells: cells.slice(), letters } };
          }
        }
      }
    }
  }
  return null;
}
