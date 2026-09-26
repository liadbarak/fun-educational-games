class YesNoPage {
  constructor(root, {source, analytics = () => {}} = {}) {
    this.root = root;
    this.source = source;
    this.analytics = analytics;
    this.history = [];
    this.count = 0;
    this.$('yn-form').addEventListener('submit', event => {
      event.preventDefault();
      this.generate();
    });
    this.$('yn-submit').disabled = false;
    this.emit('utility_view');
  }
  $(id) { return this.root.querySelector('#' + id); }
  emit(event) {
    // Never read or send the optional question, or attach it to analytics.
    try { this.analytics(event, {utility_name: 'yes-or-no-generator'}); } catch {}
  }
  generate() {
    let answer;
    try { answer = YesNo.answer(this.source); }
    catch {
      this.$('yn-error').textContent = 'Could not get a random answer. Please try again.';
      return;
    }
    this.$('yn-error').textContent = '';
    this.count++;
    this.$('yn-answer').textContent = answer;
    this.$('yn-label').textContent = 'Answer ' + this.count;
    const stage = this.$('yn-stage');
    stage.dataset.answer = answer.toLowerCase();
    stage.classList.remove('is-revealing');
    void stage.offsetWidth;
    stage.classList.add('is-revealing');
    this.$('yn-submit').textContent = 'Ask Again';
    this.history.unshift(answer);
    this.history = this.history.slice(0, 8);
    this.$('yn-history').replaceChildren(...this.history.map((value, index) => {
      const li = document.createElement('li');
      li.className = 'yn-history-' + value.toLowerCase();
      li.textContent = value;
      li.setAttribute('aria-label', 'Answer ' + (this.count - index) + ': ' + value);
      return li;
    }));
    this.$('yn-history-empty').hidden = true;
    this.emit('utility_use');
  }
}
