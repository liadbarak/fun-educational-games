/* Shared unbiased random helper; all vocabulary remains bundled locally. */
const WordGenerator = (() => {
  const data = typeof module !== 'undefined' ? require('./words.js') : WordData;
  const random = typeof module !== 'undefined' ? require('../shared/random-tools.js') : RandomTools;
  const types = Object.freeze(['all', 'nouns', 'verbs', 'adjectives']);
  const modes = Object.freeze(['everyday', 'pictionary', 'charades', 'hangman']);
  const quantities = Object.freeze([1, 3, 5, 10]);
  const all = Object.freeze(Object.values(data.pools).flat());
  const cache = new Map();
  function pool(type = 'all', mode = 'everyday') {
    if (!types.includes(type) || !modes.includes(mode)) throw Error('Choose a valid word type and game mode.');
    const key = (mode === 'everyday' ? type : 'all') + ':' + mode;
    if (!cache.has(key)) {
      const base = type === 'all' ? all : data.pools[type];
      cache.set(key, Object.freeze([...(mode === 'everyday' ? base : data.modes[mode])]));
    }
    return cache.get(key);
  }
  function generate({count = 1, type = 'all', mode = 'everyday', previous = []} = {}, source) {
    if (!quantities.includes(count)) throw Error('Choose 1, 3, 5, or 10 words.');
    let words = pool(type, mode);
    if (count === 1 && previous.length === 1 && words.length > 1) words = words.filter(word => word !== previous[0]);
    if (count > words.length) throw Error('There are not enough words for this selection.');
    return random.numbers(0, words.length - 1, count, true, source).map(index => words[index]);
  }
  return {types, modes, quantities, pool, generate};
})();
if (typeof module !== 'undefined') module.exports = WordGenerator;
