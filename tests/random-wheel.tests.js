const TESTS = [
  {
    name: 'configurable defaults create one segment and editor row per option',
    run({ wheel, root }) {
      if (wheel.options.join() !== 'Red,Blue,Green') return `options were ${wheel.options}`;
      const rows = root.querySelectorAll('.rw-option').length;
      if (rows !== 3) return `rendered ${rows} rows`;
    },
  },
  {
    name: 'an option can be edited without rebuilding the component',
    run({ wheel, root }) {
      const input = root.querySelector('.rw-option input');
      input.value = 'Orange';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (wheel.options[0] !== 'Orange') return `stored ${wheel.options[0]}`;
    },
  },
  {
    name: 'options can be added and removed',
    run({ wheel, root }) {
      root.querySelector('.rw-add').click();
      const added = root.querySelectorAll('.rw-option input');
      if (added.length !== 4) return `add produced ${added.length} rows`;
      added[3].value = 'Purple';
      added[3].dispatchEvent(new Event('input', { bubbles: true }));
      root.querySelectorAll('.rw-remove')[1].click();
      if (wheel.options.join() !== 'Orange,Green,Purple') return `options were ${wheel.options}`;
    },
  },
  {
    name: 'pasting one value per line replaces the wheel and ignores blanks',
    run({ wheel, root }) {
      const textarea = root.querySelector('.rw-paste textarea');
      textarea.value = 'Alice\n\nBob\nCharlie\n';
      root.querySelector('.rw-apply').click();
      if (wheel.options.join() !== 'Alice,Bob,Charlie') return `options were ${wheel.options}`;
      if (root.querySelectorAll('.rw-option').length !== 3) return 'editor did not match pasted list';
    },
  },
  {
    name: 'spin selects exactly the deterministic result and shows it',
    async run({ wheel, root }) {
      root.querySelector('.rw-spin').click();
      await until(() => !wheel.isSpinning);
      if (wheel.winnerIndex !== 0) return `winner index was ${wheel.winnerIndex}`;
      const result = root.querySelector('.rw-result-line b').textContent;
      if (result !== 'Alice') return `result was ${result}`;
    },
  },
  {
    name: 'repeat spins and winner removal emit the requested analytics',
    async run({ wheel, root, events }) {
      root.querySelector('.rw-spin-again').click();
      await until(() => !wheel.isSpinning);
      root.querySelector('.rw-remove-winner').click();
      const names = events.map(event => event.name);
      for (const expected of ['wheel_spin', 'wheel_repeat_spin', 'wheel_option_edited', 'wheel_winner_removed']) {
        if (!names.includes(expected)) return `${expected} was not tracked: ${names}`;
      }
      if (wheel.options.includes('Alice')) return `winner remains in ${wheel.options}`;
    },
  },
  {
    name: 'a second page can reuse the same class with a different preset',
    run() {
      const mount = document.createElement('div');
      document.getElementById('fixture').appendChild(mount);
      const second = new RandomWheel(mount, { options: ['Yes', 'No'], animationDuration: 1 });
      const ok = second.options.join() === 'Yes,No' && mount.querySelectorAll('.rw-option').length === 2;
      second.destroy();
      if (!ok) return 'second preset did not mount independently';
    },
  },
  {
    name: 'the public page has a unique title, description and canonical URL',
    async run() {
      const html = await fetch('../spin-the-wheel/').then(response => response.text());
      const page = new DOMParser().parseFromString(html, 'text/html');
      if (page.title !== 'Spin the Wheel – Free Random Wheel Picker') return `title was ${page.title}`;
      if (!page.querySelector('meta[name=description]')?.content) return 'meta description is missing';
      const canonical = page.querySelector('link[rel=canonical]')?.href;
      if (canonical !== 'https://puzzleten.com/spin-the-wheel/') return `canonical was ${canonical}`;
    },
  },
  {
    name: 'the home page and sitemap both expose the new utility',
    async run() {
      const [home, sitemap] = await Promise.all([
        fetch('../index.html').then(response => response.text()),
        fetch('../sitemap.xml').then(response => response.text()),
      ]);
      if (!home.includes('href="spin-the-wheel/"')) return 'home page has no wheel link';
      if (!sitemap.includes('https://puzzleten.com/spin-the-wheel/')) return 'sitemap has no wheel URL';
    },
  },
];

function until(predicate, timeout = 1000) {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (predicate()) resolve();
      else if (performance.now() - started > timeout) reject(new Error('timed out'));
      else requestAnimationFrame(check);
    };
    check();
  });
}

async function run() {
  const root = document.createElement('div');
  document.getElementById('fixture').appendChild(root);
  const events = [];
  const wheel = new RandomWheel(root, {
    options: ['Red', 'Blue', 'Green'],
    animationDuration: 30,
    random: () => 0,
    analytics: (name, params) => events.push({ name, params }),
  });
  const context = { wheel, root, events };
  const results = document.getElementById('results');
  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    let detail;
    try { detail = await test.run(context); }
    catch (error) { detail = `threw: ${error.message}`; }

    const row = document.createElement('div');
    row.className = `case ${detail ? 'bad' : 'ok'}`;
    row.innerHTML = `<span class="verdict">${detail ? 'FAIL' : 'PASS'}</span>${test.name}` +
      (detail ? `<span class="detail">${detail}</span>` : '');
    results.appendChild(row);
    if (detail) failed++; else passed++;
  }

  const summary = document.getElementById('summary');
  summary.className = failed ? 'fail' : 'pass';
  summary.textContent = failed ? `${failed} failed · ${passed} passed` : `All ${passed} passed`;
  window.TEST_RESULT = { passed, failed };
}

run();
