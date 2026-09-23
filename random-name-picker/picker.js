class NamePickerPage {
  constructor(root, {source, delay, analytics = () => {}} = {}) {
    this.root = root; this.source = source; this.analytics = analytics;
    this.delay = delay ?? (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200);
    this.original = []; this.pool = []; this.busy = false;
    this.$('names').addEventListener('input', () => this.load());
    this.$('name-form').addEventListener('submit', event => {event.preventDefault(); this.pick();});
    this.$('pick-again').addEventListener('click', () => this.pick());
    this.$('reset-list').addEventListener('click', () => this.reset());
    this.$('remove-picked').addEventListener('change', () => this.update());
    this.load(); this.emit('utility_view');
  }
  $(id) {return this.root.querySelector('#' + id);}
  emit(event, params = {}) {try {this.analytics(event, {utility_name: 'random-name-picker', ...params});} catch {}}
  load() {
    this.original = NamePicker.parse(this.$('names').value);
    this.reset();
  }
  reset() {
    if (this.busy) return;
    this.pool = [...this.original];
    this.$('name-results').replaceChildren();
    this.$('result-label').textContent = 'Your next pick';
    this.$('name-status').textContent = '';
    this.$('name-error').textContent = '';
    this.$('pick-again').hidden = true;
    this.update();
  }
  update() {
    this.$('entered-count').textContent = `${this.original.length} ${this.original.length === 1 ? 'name' : 'names'} entered`;
    this.$('remaining-count').textContent = this.$('remove-picked').checked ? `${this.pool.length} names remaining` : '';
    const select = this.$('pick-count');
    for (const option of select.options) option.disabled = Number(option.value) > this.pool.length;
    if (Number(select.value) > this.pool.length) select.value = '1';
    for (const id of ['names', 'pick-count', 'remove-picked', 'reset-list']) this.$(id).disabled = this.busy;
    for (const id of ['pick-name', 'pick-again']) this.$(id).disabled = this.busy || !this.pool.length;
  }
  render(names) {
    this.$('name-results').replaceChildren(...names.map(name => {
      const li = document.createElement('li'); li.className = 'result-chip'; li.textContent = name; return li;
    }));
    this.$('name-results').classList.toggle('single', names.length === 1);
  }
  async pick() {
    if (this.busy) return;
    this.$('name-error').textContent = '';
    try {
      const count = Number(this.$('pick-count').value);
      const result = NamePicker.pick(this.pool, count, this.source);
      this.busy = true; this.update();
      this.$('name-stage').setAttribute('aria-busy', 'true');
      this.$('name-status').textContent = 'Picking…';
      this.$('result-label').textContent = 'Picking…';
      let tick = 0;
      const cycle = () => this.render([this.pool[tick++ % this.pool.length]]);
      if (this.delay) {
        cycle(); const timer = setInterval(cycle, 100);
        await new Promise(resolve => setTimeout(resolve, this.delay)); clearInterval(timer);
      }
      this.render(result.winners);
      if (this.$('remove-picked').checked) this.pool = result.remaining;
      this.$('result-label').textContent = '🎉 ' + (count === 1 ? 'Selected name' : 'Selected names');
      this.$('name-status').textContent = `Selected: ${result.winners.join(', ')}.${this.pool.length ? '' : ' All names have been picked. Reset List to start again.'}`;
      this.$('pick-again').hidden = false;
      this.emit('utility_use', {count, remove_picked: this.$('remove-picked').checked});
    } catch (error) {this.$('name-error').textContent = error.message;}
    finally {this.busy = false; this.$('name-stage').setAttribute('aria-busy', 'false'); this.update();}
  }
}
