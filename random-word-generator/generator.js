/* Page controller. Existing utility styles, random helper and analytics are reused. */
class RandomWordPage {
  constructor(root, options = {}) {
    this.root = root;
    this.source = options.source;
    this.writeClipboard = options.writeClipboard || (text => navigator.clipboard.writeText(text));
    this.analytics = options.analytics || (() => {});
    this.current = [];
    this.mode = 'everyday';
    this.copying = false;
    this.modeNames = {everyday: 'All Words', pictionary: 'Pictionary', charades: 'Charades', hangman: 'Hangman'};
    this.typeNames = {all: 'All Words', nouns: 'Nouns', verbs: 'Verbs', adjectives: 'Adjectives'};
    this.$('word-form').addEventListener('submit', event => { event.preventDefault(); this.generate(); });
    this.$('generate-again').addEventListener('click', () => this.generate());
    ['word-count', 'word-type'].forEach(id => this.$(id).addEventListener('change', () => this.generate()));
    root.querySelectorAll('[data-word-mode]').forEach(button => button.addEventListener('click', () => {
      this.mode = button.dataset.wordMode;
      this.generate();
    }));
    this.$('copy-words').addEventListener('click', () => this.copy());
    this.generate(false);
    this.emit('utility_view');
  }
  $(id) { return this.root.querySelector('#' + id); }
  emit(event, params = {}) { try { this.analytics(event, {utility_name: 'random-word-generator', ...params}); } catch {} }
  generate(trackUse = true) {
    this.$('word-error').textContent = '';
    const count = Number(this.$('word-count').value), type = this.$('word-type').value;
    try {
      const words = WordGenerator.generate({count, type, mode: this.mode, previous: this.current}, this.source);
      this.current = words;
      this.$('word-results').replaceChildren(...words.map(word => {
        const li = document.createElement('li');
        li.className = 'result-chip';
        li.textContent = word;
        return li;
      }));
      this.$('word-results').classList.toggle('single', words.length === 1);
      this.$('generate-word').textContent = count === 1 ? 'Generate Word' : 'Generate Words';
      this.$('copy-words').disabled = this.copying;
      this.$('copy-fallback').hidden = true;
      this.$('manual-copy').value = '';
      const general = this.mode === 'everyday';
      this.$('word-type-field').hidden = !general;
      this.$('word-type').disabled = !general;
      const label = this.modeNames[this.mode] + (general && type !== 'all' ? ' · ' + this.typeNames[type] : '');
      this.$('result-label').textContent = label;
      this.$('word-status').textContent = label + ': ' + words.join(', ') + '.';
      this.root.querySelectorAll('[data-word-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wordMode === this.mode)));
      this.$('mode-description').textContent = {
        everyday: 'Common English words for brainstorming, creative writing, inspiration, vocabulary activities, and random selection.',
        pictionary: 'Concrete objects and simple scenes that are practical and fun to draw.',
        charades: 'Recognizable actions and short phrases to act out without speaking.',
        hangman: 'Familiar English words with 4–10 letters for guessing.'
      }[this.mode];
      if (trackUse) this.emit('utility_use', {count, word_type: general ? type : 'all', mode: this.mode});
    } catch (error) { this.$('word-error').textContent = error.message; }
  }
  async copy() {
    if (!this.current.length || this.copying) return;
    const text = this.current.join('\n');
    this.copying = true;
    this.$('copy-words').disabled = true;
    try {
      await this.writeClipboard(text);
      this.$('word-status').textContent = text === this.current.join('\n') ? 'Words copied.' : 'Your previous words were copied.';
      this.emit('utility_copy');
    } catch {
      this.$('copy-fallback').hidden = false;
      this.$('manual-copy').value = text;
      this.$('manual-copy').focus();
      this.$('manual-copy').select();
      this.$('word-status').textContent = 'Automatic copy is unavailable. Copy the selected words below.';
    } finally {
      this.copying = false;
      this.$('copy-words').disabled = this.current.length === 0;
    }
  }
}
