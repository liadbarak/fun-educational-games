/* Uniform integer draws with rejection sampling; usable in browsers and Node tests. */
const RandomTools = (() => {
  const LIMIT = 1000000000;
  function integer(min, max, source = () => crypto.getRandomValues(new Uint32Array(1))[0]) {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max || max - min + 1 > 4294967296) throw new Error('Invalid integer sampling range.');
    const size = max - min + 1;
    const ceiling = Math.floor(4294967296 / size) * size;
    let value;
    do { value = source(); } while (value >= ceiling);
    return min + value % size;
  }
  function numbers(min, max, count, unique, source) {
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Choose between 1 and 100 numbers.');
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < -LIMIT || max > LIMIT || min > max) throw new Error('Enter a valid whole-number range between −1,000,000,000 and 1,000,000,000.');
    if (unique && count > max - min + 1) throw new Error('Your range has fewer numbers than requested. Reduce the quantity or allow repeats.');
    // Partial Fisher–Yates using a sparse map: bounded work even for huge ranges.
    const swaps = new Map();
    return Array.from({length: count}, (_, i) => {
      const remaining = max - min + 1 - i;
      if (!unique) return integer(min, max, source);
      const pick = integer(0, remaining - 1, source);
      const value = swaps.get(pick) ?? pick;
      swaps.set(pick, swaps.get(remaining - 1) ?? remaining - 1);
      return min + value;
    });
  }
  function coins(count, bestOfThree = false, source) {
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Choose between 1 and 100 coins.');
    const results = [];
    let heads = 0, tails = 0;
    for (let i = 0; i < (bestOfThree ? 3 : count); i++) {
      const face = integer(0, 1, source) === 0 ? 'Heads' : 'Tails';
      results.push(face);
      if (face === 'Heads') heads++; else tails++;
      if (bestOfThree && (heads === 2 || tails === 2)) break;
    }
    return {results, heads, tails, winner: bestOfThree ? (heads === 2 ? 'Heads' : 'Tails') : null};
  }
  return {integer, numbers, coins};
})();
if (typeof module !== 'undefined') module.exports = RandomTools;
