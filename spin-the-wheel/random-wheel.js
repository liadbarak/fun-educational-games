/*
 * Reusable random wheel.
 *
 * Mount it on any page with:
 *   new RandomWheel(element, { options: ['Yes', 'No'] });
 *
 * Pages own their defaults and SEO copy. This file owns all wheel behavior,
 * so future wheel pages only configure the component rather than fork it.
 */

class RandomWheel {
  constructor(root, config = {}) {
    if (!root) throw new Error('RandomWheel needs a mount element');

    this.root = root;
    this.options = this.cleanOptions(config.options || ['Yes', 'No']);
    if (this.options.length < 2) this.options = ['Yes', 'No'];
    this.analytics = typeof config.analytics === 'function' ? config.analytics : () => {};
    this.pageName = config.pageName || 'random-wheel';
    this.random = typeof config.random === 'function' ? config.random : () => {
      if (window.crypto && window.crypto.getRandomValues) {
        const value = new Uint32Array(1);
        window.crypto.getRandomValues(value);
        return value[0] / 4294967296;
      }
      return Math.random();
    };
    this.animationDuration = config.animationDuration ?? 3800;
    this.palette = config.palette || [
      '#6F5BD3', '#FF8A5B', '#35A878', '#F5B93B', '#4C91E6',
      '#E768A2', '#26A6B5', '#EF6B61', '#8A6DCE', '#79B44A'
    ];

    this.rotation = 0;
    this.spinCount = 0;
    this.isSpinning = false;
    this.winnerIndex = -1;
    this.resizeObserver = null;

    this.build();
    this.renderOptions();
    this.draw();
    this.bind();
  }

  cleanOptions(values) {
    return values
      .map(value => String(value).trim())
      .filter(Boolean)
      .slice(0, 100);
  }

  build() {
    this.root.className = 'random-wheel';
    this.root.innerHTML = `
      <div class="rw-play">
        <div class="rw-stage">
          <canvas class="rw-canvas" aria-label="Random wheel with editable choices"></canvas>
          <span class="rw-pointer" aria-hidden="true"></span>
          <button class="rw-spin" type="button">SPIN</button>
        </div>
        <div class="rw-result is-empty" aria-live="polite">
          <p class="rw-result-line" hidden>🎉 Your result: <b></b></p>
          <div class="rw-result-actions" hidden>
            <button class="rw-spin-again" type="button">Spin Again</button>
            <button class="rw-remove-winner" type="button">Remove Result</button>
          </div>
        </div>
      </div>
      <aside class="rw-editor">
        <div class="rw-editor-head">
          <h2>Wheel options</h2>
          <span class="rw-count"></span>
        </div>
        <div class="rw-options"></div>
        <button class="rw-add" type="button">＋ Add option</button>
        <details class="rw-paste">
          <summary>Paste a list</summary>
          <label>
            <span class="sr-only">One option per line</span>
            <textarea placeholder="One option per line"></textarea>
          </label>
          <button class="rw-apply" type="button">Use this list</button>
        </details>
        <p class="rw-note">Edit any choice, or paste up to 100 options—one per line.</p>
      </aside>`;

    this.canvas = this.root.querySelector('.rw-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.spinButton = this.root.querySelector('.rw-spin');
    this.spinAgainButton = this.root.querySelector('.rw-spin-again');
    this.removeWinnerButton = this.root.querySelector('.rw-remove-winner');
    this.optionsElement = this.root.querySelector('.rw-options');
    this.addButton = this.root.querySelector('.rw-add');
    this.pasteArea = this.root.querySelector('.rw-paste textarea');
    this.applyButton = this.root.querySelector('.rw-apply');
    this.countElement = this.root.querySelector('.rw-count');
    this.noteElement = this.root.querySelector('.rw-note');
    this.resultLine = this.root.querySelector('.rw-result-line');
    this.resultElement = this.root.querySelector('.rw-result');
    this.resultValue = this.resultLine.querySelector('b');
    this.resultActions = this.root.querySelector('.rw-result-actions');
  }

  bind() {
    this.spinButton.addEventListener('click', () => this.spin());
    this.spinAgainButton.addEventListener('click', () => this.spin());
    this.removeWinnerButton.addEventListener('click', () => this.removeWinner());
    this.addButton.addEventListener('click', () => this.addOption());
    this.applyButton.addEventListener('click', () => this.applyPastedList());

    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(this.canvas);
    } else {
      window.addEventListener('resize', () => this.draw());
    }
  }

  renderOptions(focusIndex = -1) {
    this.optionsElement.textContent = '';
    this.options.forEach((option, index) => {
      const row = document.createElement('div');
      row.className = 'rw-option';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = option;
      input.maxLength = 80;
      input.setAttribute('aria-label', `Option ${index + 1}`);
      input.addEventListener('input', () => {
        this.options[index] = input.value;
        this.hideResult();
        this.draw();
        this.syncControls();
      });
      input.addEventListener('change', () => this.trackEdit('edit'));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'rw-remove';
      remove.textContent = '×';
      remove.title = `Remove ${option || `option ${index + 1}`}`;
      remove.setAttribute('aria-label', remove.title);
      remove.addEventListener('click', () => this.removeOption(index));

      row.append(input, remove);
      this.optionsElement.appendChild(row);
    });

    this.syncControls();
    if (focusIndex >= 0) {
      const input = this.optionsElement.querySelectorAll('input')[focusIndex];
      if (input) input.focus();
    }
  }

  syncControls() {
    const valid = this.cleanOptions(this.options);
    const hasBlank = valid.length !== this.options.length;
    this.countElement.textContent = `${this.options.length} options`;
    this.spinButton.disabled = this.isSpinning || valid.length < 2 || hasBlank;
    this.spinAgainButton.disabled = this.spinButton.disabled;
    this.removeWinnerButton.disabled = this.isSpinning || this.options.length <= 2;
    this.pasteArea.disabled = this.isSpinning;
    this.applyButton.disabled = this.isSpinning;
    this.optionsElement.querySelectorAll('input').forEach(input => {
      input.disabled = this.isSpinning;
    });
    this.optionsElement.querySelectorAll('.rw-remove').forEach(button => {
      button.disabled = this.isSpinning || this.options.length <= 2;
    });
    this.addButton.disabled = this.isSpinning || this.options.length >= 100;

    if (hasBlank) this.setNote('Fill in or remove the empty option before spinning.', true);
    else if (valid.length < 2) this.setNote('Add at least two options before spinning.', true);
    else this.setNote('Edit any choice, or paste up to 100 options—one per line.');
  }

  setNote(message, isError = false) {
    this.noteElement.textContent = message;
    this.noteElement.classList.toggle('is-error', isError);
  }

  addOption() {
    if (this.isSpinning || this.options.length >= 100) return;
    this.options.push('');
    this.hideResult();
    this.renderOptions(this.options.length - 1);
    this.draw();
    this.trackEdit('add');
  }

  removeOption(index) {
    if (this.isSpinning || this.options.length <= 2) return;
    this.options.splice(index, 1);
    this.hideResult();
    this.renderOptions();
    this.draw();
    this.trackEdit('remove');
  }

  applyPastedList() {
    if (this.isSpinning) return;
    const values = this.cleanOptions(this.pasteArea.value.split(/\r?\n/));
    if (values.length < 2) {
      this.setNote('Paste at least two non-empty lines.', true);
      return;
    }
    this.options = values;
    this.pasteArea.value = '';
    this.root.querySelector('.rw-paste').open = false;
    this.hideResult();
    this.renderOptions();
    this.draw();
    this.trackEdit('paste');
  }

  trackEdit(action) {
    this.analytics('wheel_option_edited', {
      utility_name: this.pageName,
      edit_action: action,
      option_count: this.cleanOptions(this.options).length
    });
  }

  randomIndex(length) {
    return Math.min(length - 1, Math.floor(this.random() * length));
  }

  spin() {
    const choices = this.cleanOptions(this.options);
    if (this.isSpinning || choices.length < 2 || choices.length !== this.options.length) return;

    this.options = choices;
    const winnerIndex = this.randomIndex(this.options.length);
    const slice = Math.PI * 2 / this.options.length;
    const target = -Math.PI / 2 - (winnerIndex + 0.5) * slice;
    const current = this.mod(this.rotation, Math.PI * 2);
    const alignment = this.mod(target - current, Math.PI * 2);
    const extraTurns = 5 + this.randomIndex(3);
    const start = this.rotation;
    const finish = start + extraTurns * Math.PI * 2 + alignment;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? Math.min(450, this.animationDuration) : this.animationDuration;
    const began = performance.now();

    this.isSpinning = true;
    this.winnerIndex = -1;
    this.root.classList.add('is-spinning');
    this.hideResult();
    this.syncControls();

    const eventName = this.spinCount === 0 ? 'wheel_spin' : 'wheel_repeat_spin';
    this.spinCount += 1;
    this.analytics(eventName, {
      utility_name: this.pageName,
      spin_number: this.spinCount,
      option_count: this.options.length
    });

    const frame = now => {
      const elapsed = Math.min(1, (now - began) / Math.max(1, duration));
      const eased = 1 - Math.pow(1 - elapsed, 4);
      this.rotation = start + (finish - start) * eased;
      this.draw();
      if (elapsed < 1) {
        requestAnimationFrame(frame);
      } else {
        this.rotation = finish;
        this.isSpinning = false;
        this.winnerIndex = winnerIndex;
        this.root.classList.remove('is-spinning');
        this.showResult();
        this.syncControls();
      }
    };
    requestAnimationFrame(frame);
  }

  showResult() {
    if (this.winnerIndex < 0) return;
    this.resultValue.textContent = this.options[this.winnerIndex];
    this.resultElement.classList.remove('is-empty');
    this.resultLine.hidden = false;
    this.resultActions.hidden = false;
  }

  hideResult() {
    this.winnerIndex = -1;
    this.resultElement.classList.add('is-empty');
    this.resultLine.hidden = true;
    this.resultActions.hidden = true;
  }

  removeWinner() {
    if (this.isSpinning || this.winnerIndex < 0 || this.options.length <= 2) return;
    const removed = this.options[this.winnerIndex];
    this.options.splice(this.winnerIndex, 1);
    this.analytics('wheel_winner_removed', {
      utility_name: this.pageName,
      option_count: this.options.length
    });
    this.hideResult();
    this.renderOptions();
    this.draw();
    this.setNote(`${removed} was removed. Spin again when you are ready.`);
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    const box = this.canvas.getBoundingClientRect();
    const size = Math.max(280, Math.round(box.width || 480));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = Math.round(size * dpr);
    if (this.canvas.width !== pixels || this.canvas.height !== pixels) {
      this.canvas.width = pixels;
      this.canvas.height = pixels;
    }

    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const center = size / 2;
    const radius = center - 7;
    const values = this.options.length ? this.options : ['Add options'];
    const slice = Math.PI * 2 / values.length;

    values.forEach((value, index) => {
      const start = this.rotation + index * slice;
      const end = start + slice;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = this.palette[index % this.palette.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = 3;
      ctx.stroke();

      if (values.length > 30) return;
      const angle = start + slice / 2;
      const label = this.fitLabel(value || `Option ${index + 1}`, values.length);
      const fontSize = Math.max(10, Math.min(17, 210 / Math.max(8, values.length)));
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle);
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${fontSize}px ${getComputedStyle(document.body).fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(30,24,50,0.28)';
      ctx.shadowBlur = 2;
      const facingLeft = Math.cos(angle) < 0;
      if (facingLeft) {
        ctx.rotate(Math.PI);
        ctx.textAlign = 'left';
        ctx.fillText(label, -radius + 22, 0, radius * 0.61);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(label, radius - 22, 0, radius * 0.61);
      }
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 7;
    ctx.stroke();
  }

  fitLabel(value, count) {
    const max = count > 16 ? 10 : count > 10 ? 14 : 20;
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  }

  mod(value, base) {
    return ((value % base) + base) % base;
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.root.textContent = '';
  }
}

window.RandomWheel = RandomWheel;
