/*
 * Small reusable dice roller. Pages configure it; this class owns selection,
 * fair random rolls, visuals, animation and analytics.
 */

class DiceRoller {
  constructor(root, config = {}) {
    if (!root) throw new Error('DiceRoller needs a mount element');

    this.root = root;
    this.sides = Number(config.sides) || 6;
    this.count = Number(config.count) || 1;
    this.supportedSides = [4, 6, 8, 10, 12, 20, 100];
    if (!this.supportedSides.includes(this.sides)) this.sides = 6;
    this.count = Math.min(10, Math.max(1, this.count));
    this.analytics = typeof config.analytics === 'function' ? config.analytics : () => {};
    this.pageName = config.pageName || 'dice-roller';
    this.animationDuration = config.animationDuration ?? 560;
    this.randomInt = typeof config.randomInt === 'function'
      ? config.randomInt
      : sides => this.cryptoRandomInt(sides);
    this.values = [];
    this.isRolling = false;
    this.timer = null;
    this.finishTimer = null;

    this.build();
    this.bind();
    this.renderPlaceholder();
    this.syncSummary();
  }

  build() {
    const sideOptions = this.supportedSides
      .map(sides => `<option value="${sides}"${sides === this.sides ? ' selected' : ''}>D${sides}</option>`)
      .join('');
    const countOptions = Array.from({ length: 10 }, (_, index) => index + 1)
      .map(count => `<option value="${count}"${count === this.count ? ' selected' : ''}>${count}</option>`)
      .join('');

    this.root.className = 'dice-roller';
    this.root.innerHTML = `
      <div class="dr-stage">
        <p class="dr-summary"></p>
        <div class="dr-results" aria-label="Dice results"></div>
        <p class="dr-total" aria-live="polite">Press <span>ROLL DICE</span></p>
        <button class="dr-roll" type="button">ROLL DICE</button>
      </div>
      <aside class="dr-controls">
        <h2>Choose your dice</h2>
        <label class="dr-field">
          <span>Dice type</span>
          <select class="dr-sides" aria-label="Dice type">${sideOptions}</select>
        </label>
        <label class="dr-field">
          <span>Number of dice</span>
          <select class="dr-count" aria-label="Number of dice">${countOptions}</select>
        </label>
        <p class="dr-presets-title">Quick rolls</p>
        <div class="dr-presets">
          <button class="dr-preset" type="button" data-sides="6" data-count="1">Roll 1 Die</button>
          <button class="dr-preset" type="button" data-sides="6" data-count="2">Roll 2 Dice</button>
          <button class="dr-preset" type="button" data-sides="20" data-count="1">D20 Roller</button>
        </div>
        <p class="dr-note">Each die is rolled independently. No results are saved or sent anywhere.</p>
      </aside>`;

    this.resultsElement = this.root.querySelector('.dr-results');
    this.totalElement = this.root.querySelector('.dr-total');
    this.summaryElement = this.root.querySelector('.dr-summary');
    this.rollButton = this.root.querySelector('.dr-roll');
    this.sidesSelect = this.root.querySelector('.dr-sides');
    this.countSelect = this.root.querySelector('.dr-count');
    this.presetButtons = [...this.root.querySelectorAll('.dr-preset')];
  }

  bind() {
    this.rollButton.addEventListener('click', () => this.roll('button'));
    this.sidesSelect.addEventListener('change', () => {
      this.sides = Number(this.sidesSelect.value);
      this.values = [];
      this.renderPlaceholder();
      this.syncSummary();
      this.analytics('dice_type_selected', {
        utility_name: this.pageName,
        dice_type: `D${this.sides}`
      });
    });
    this.countSelect.addEventListener('change', () => {
      this.count = Number(this.countSelect.value);
      this.values = [];
      this.renderPlaceholder();
      this.syncSummary();
      this.analytics('dice_count_selected', {
        utility_name: this.pageName,
        dice_count: this.count
      });
    });
    this.presetButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.setConfiguration(Number(button.dataset.sides), Number(button.dataset.count));
        this.roll('preset');
      });
    });
  }

  setConfiguration(sides, count) {
    if (!this.supportedSides.includes(sides)) return;
    this.sides = sides;
    this.count = Math.min(10, Math.max(1, count));
    this.sidesSelect.value = String(this.sides);
    this.countSelect.value = String(this.count);
    this.values = [];
    this.renderPlaceholder();
    this.syncSummary();
  }

  syncSummary() {
    this.summaryElement.textContent = `${this.count} × D${this.sides}`;
  }

  cryptoRandomInt(sides) {
    if (!window.crypto || !window.crypto.getRandomValues) {
      return Math.floor(Math.random() * sides) + 1;
    }

    const range = 4294967296;
    const limit = Math.floor(range / sides) * sides;
    const value = new Uint32Array(1);
    do window.crypto.getRandomValues(value);
    while (value[0] >= limit);
    return value[0] % sides + 1;
  }

  roll(source = 'button') {
    if (this.isRolling) return;
    this.isRolling = true;
    this.root.classList.add('is-rolling');
    this.syncDisabled();

    const finalValues = Array.from({ length: this.count }, () => this.randomInt(this.sides));
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? Math.min(140, this.animationDuration) : this.animationDuration;

    const showTemporaryRoll = () => {
      const temporary = Array.from({ length: this.count }, () => this.randomInt(this.sides));
      this.renderValues(temporary);
      this.totalElement.innerHTML = 'Rolling…';
    };
    showTemporaryRoll();
    this.timer = window.setInterval(showTemporaryRoll, 75);
    this.finishTimer = window.setTimeout(() => {
      window.clearInterval(this.timer);
      this.timer = null;
      this.finishTimer = null;
      this.values = finalValues;
      this.renderValues(this.values);
      const total = this.values.reduce((sum, value) => sum + value, 0);
      this.totalElement.innerHTML = `Total: <span>${total}</span>`;
      this.isRolling = false;
      this.root.classList.remove('is-rolling');
      this.syncDisabled();
      this.analytics('dice_roll', {
        utility_name: this.pageName,
        dice_type: `D${this.sides}`,
        dice_count: this.count,
        total,
        roll_source: source
      });
    }, Math.max(1, duration));
  }

  syncDisabled() {
    this.rollButton.disabled = this.isRolling;
    this.sidesSelect.disabled = this.isRolling;
    this.countSelect.disabled = this.isRolling;
    this.presetButtons.forEach(button => { button.disabled = this.isRolling; });
  }

  renderPlaceholder() {
    this.resultsElement.classList.add('is-placeholder');
    this.resultsElement.textContent = '';
    this.resultsElement.appendChild(this.createPlaceholderDie());
    this.totalElement.innerHTML = 'Press <span>ROLL DICE</span>';
  }

  renderValues(values) {
    this.resultsElement.classList.remove('is-placeholder');
    this.resultsElement.textContent = '';
    values.forEach(value => {
      this.resultsElement.appendChild(
        this.sides === 6 ? this.createD6(value) : this.createNumberedDie(value, this.sides)
      );
    });
    this.resultsElement.setAttribute('aria-label',
      `Rolled ${values.join(', ')} on ${values.length} D${this.sides}${values.length === 1 ? '' : ' dice'}`);
  }

  createD6(value) {
    const die = document.createElement('div');
    die.className = 'dr-die is-d6';
    die.setAttribute('aria-label', `D6 rolled ${value}`);
    const layouts = {
      1: [5],
      2: [1, 9],
      3: [1, 5, 9],
      4: [1, 3, 7, 9],
      5: [1, 3, 5, 7, 9],
      6: [1, 3, 4, 6, 7, 9],
    };
    layouts[value].forEach(position => {
      const pip = document.createElement('span');
      pip.className = `dr-pip p${position}`;
      die.appendChild(pip);
    });
    return die;
  }

  createNumberedDie(value, sides) {
    const die = document.createElement('div');
    die.className = `dr-die is-poly is-d${sides}`;
    die.setAttribute('aria-label', `D${sides} ${typeof value === 'number' ? `rolled ${value}` : 'ready'}`);
    const number = document.createElement('span');
    number.className = 'dr-number';
    number.textContent = value;
    die.appendChild(number);
    return die;
  }

  createPlaceholderDie() {
    const die = document.createElement('div');
    die.className = `dr-die is-poly is-ready${this.sides === 6 ? ' is-d6-ready' : ` is-d${this.sides}`}`;
    die.setAttribute('aria-label', `D${this.sides} ready`);
    const label = document.createElement('span');
    label.className = 'dr-number';
    label.textContent = `D${this.sides}`;
    die.appendChild(label);
    return die;
  }

  destroy() {
    if (this.timer) window.clearInterval(this.timer);
    if (this.finishTimer) window.clearTimeout(this.finishTimer);
    this.root.textContent = '';
  }
}

window.DiceRoller = DiceRoller;
