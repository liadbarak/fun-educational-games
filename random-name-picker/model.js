const NamePicker = (() => {
  const random = typeof module !== 'undefined' ? require('../shared/random-tools.js') : RandomTools;
  const parse = text => text.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  function pick(pool, count = 1, source) {
    if (!pool.length) throw Error('Enter at least one name, or reset your list.');
    if (![1, 2, 3, 5].includes(count) || count > pool.length) throw Error('Choose no more names than are available.');
    const indexes = random.numbers(0, pool.length - 1, count, true, source);
    const selected = new Set(indexes);
    return {winners: indexes.map(index => pool[index]), remaining: pool.filter((_, index) => !selected.has(index))};
  }
  return {parse, pick};
})();
if (typeof module !== 'undefined') module.exports = NamePicker;
