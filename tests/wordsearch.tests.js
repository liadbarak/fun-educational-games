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
];

/* ── helpers ──────────────────────────────────────────────── */

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
