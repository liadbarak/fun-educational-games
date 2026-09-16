const TESTS = [
  {
    name: 'the default is one D6 and every supported die type is offered',
    run({ roller, root }) {
      if (roller.sides !== 6 || roller.count !== 1) return `${roller.count} × D${roller.sides}`;
      const sides = [...root.querySelectorAll('.dr-sides option')].map(option => Number(option.value));
      if (sides.join() !== '4,6,8,10,12,20,100') return `types were ${sides}`;
      if (root.querySelectorAll('.dr-count option').length !== 10) return 'count selector does not offer 1–10';
    },
  },
  {
    name: 'selecting type and count updates one shared roller and tracks both',
    run({ roller, root, events }) {
      const sides = root.querySelector('.dr-sides');
      const count = root.querySelector('.dr-count');
      sides.value = '8';
      sides.dispatchEvent(new Event('change', { bubbles: true }));
      count.value = '3';
      count.dispatchEvent(new Event('change', { bubbles: true }));
      if (roller.sides !== 8 || roller.count !== 3) return `${roller.count} × D${roller.sides}`;
      const names = events.map(event => event.name);
      if (!names.includes('dice_type_selected') || !names.includes('dice_count_selected')) {
        return `selection events were ${names}`;
      }
    },
  },
  {
    name: 'a D6 result uses the familiar number of pips',
    async run({ roller, root }) {
      roller.setConfiguration(6, 1);
      roller.randomInt = () => 4;
      roller.roll();
      await until(() => !roller.isRolling);
      const die = root.querySelector('.dr-die.is-d6');
      if (!die) return 'D6 face was not rendered';
      if (die.querySelectorAll('.dr-pip').length !== 4) return 'four did not have four pips';
      const hiddenPip = [...die.querySelectorAll('.dr-pip')]
        .find(pip => pip.getBoundingClientRect().width === 0 || pip.getBoundingClientRect().height === 0);
      if (hiddenPip) return 'a pip was rendered at zero size';
      if (root.querySelector('.dr-total').textContent.trim() !== 'Total: 4') return root.querySelector('.dr-total').textContent;
    },
  },
  {
    name: 'two dice render separately and produce one combined total',
    async run({ roller, root }) {
      roller.setConfiguration(6, 2);
      const final = [4, 6];
      roller.randomInt = sides => final.length ? final.shift() : Math.min(3, sides);
      roller.roll();
      await until(() => !roller.isRolling);
      const faces = [...root.querySelectorAll('.dr-die.is-d6')].map(die => die.querySelectorAll('.dr-pip').length);
      if (faces.join() !== '4,6') return `faces were ${faces}`;
      if (root.querySelector('.dr-total').textContent.trim() !== 'Total: 10') return root.querySelector('.dr-total').textContent;
    },
  },
  {
    name: 'every supported type works with every dice count from 1 to 10',
    async run({ roller, root }) {
      const originalDuration = roller.animationDuration;
      const originalRandomInt = roller.randomInt;
      let failure;
      roller.animationDuration = 1;

      combinations:
      for (const sides of roller.supportedSides) {
        for (let count = 1; count <= 10; count++) {
          roller.setConfiguration(sides, count);
          roller.randomInt = () => sides;
          roller.roll();
          await until(() => !roller.isRolling);

          const dice = [...root.querySelectorAll('.dr-die')];
          if (dice.length !== count) {
            failure = `D${sides} × ${count} rendered ${dice.length} dice`;
            break combinations;
          }
          const invalidFace = dice.find(die => sides === 6
            ? die.querySelectorAll('.dr-pip').length !== 6
            : die.querySelector('.dr-number')?.textContent !== String(sides));
          if (invalidFace) {
            failure = `D${sides} × ${count} rendered an invalid face`;
            break combinations;
          }
          const total = root.querySelector('.dr-total').textContent.trim();
          if (total !== `Total: ${sides * count}`) {
            failure = `D${sides} × ${count} produced ${total}`;
            break combinations;
          }
        }
      }

      roller.animationDuration = originalDuration;
      roller.randomInt = originalRandomInt;
      return failure;
    },
  },
  {
    name: 'the D20 preset configures and rolls the same component',
    async run({ roller, root }) {
      roller.randomInt = sides => sides === 20 ? 17 : 1;
      root.querySelector('[data-sides="20"]').click();
      await until(() => !roller.isRolling);
      if (roller.sides !== 20 || roller.count !== 1) return `${roller.count} × D${roller.sides}`;
      if (root.querySelector('.dr-number').textContent !== '17') return `result was ${root.querySelector('.dr-number').textContent}`;
      if (!root.querySelector('.dr-die.is-d20')) return 'D20 shape was not used';
    },
  },
  {
    name: 'quick rolls include one D6, two D6 and one D20',
    run({ root }) {
      const presets = [...root.querySelectorAll('.dr-preset')]
        .map(button => `${button.dataset.count}xD${button.dataset.sides}`);
      if (presets.join() !== '1xD6,2xD6,1xD20') return `presets were ${presets}`;
    },
  },
  {
    name: 'roll analytics contains the selected type, count and total',
    run({ events }) {
      const rolls = events.filter(event => event.name === 'dice_roll');
      if (rolls.length < 3) return `only ${rolls.length} rolls were tracked`;
      const d20 = rolls.find(event => event.params.dice_type === 'D20'
        && event.params.dice_count === 1
        && event.params.total === 17);
      if (!d20) {
        return `D20 event was ${JSON.stringify(d20)}`;
      }
    },
  },
  {
    name: 'the public page has the requested title, H1 and canonical URL',
    async run() {
      const html = await fetch('../dice-roller/').then(response => response.text());
      const page = new DOMParser().parseFromString(html, 'text/html');
      if (page.title !== 'Dice Roller – Roll Dice Online | PuzzleTen') return `title was ${page.title}`;
      if (page.querySelector('h1')?.textContent.trim() !== 'ONLINE DICE ROLLER') return 'H1 is wrong';
      const canonical = page.querySelector('link[rel=canonical]')?.href;
      if (canonical !== 'https://puzzleten.com/dice-roller/') return `canonical was ${canonical}`;
      if (!html.includes('href="../spin-the-wheel/"')) return 'Spin the Wheel cross-link is missing';
    },
  },
  {
    name: 'the home page and sitemap expose the dice roller',
    async run() {
      const [home, sitemap] = await Promise.all([
        fetch('../index.html').then(response => response.text()),
        fetch('../sitemap.xml').then(response => response.text()),
      ]);
      if (!home.includes('href="dice-roller/"')) return 'home page has no dice roller link';
      if (!sitemap.includes('https://puzzleten.com/dice-roller/')) return 'sitemap has no dice roller URL';
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
  const roller = new DiceRoller(root, {
    animationDuration: 25,
    analytics: (name, params) => events.push({ name, params }),
  });
  const context = { roller, root, events };
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
