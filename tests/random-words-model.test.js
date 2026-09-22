const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../random-word-generator/words.js');
const model = require('../random-word-generator/model.js');
const random = require('../shared/random-tools.js');
const all = Object.values(data.pools).flat();
test('curated data has 1,200+ distinct lowercase words and no duplicate categories', () => {
  assert(all.length >= 1200);
  assert.equal(new Set(all).size, all.length);
  assert(all.every(word => /^[a-z]+$/.test(word)));
  for (const [type, words] of Object.entries(data.pools)) {
    assert(words.length >= 100, type);
    assert(Object.isFrozen(words));
  }
  assert(data.pools.nouns.includes('lighthouse'));
  assert(data.pools.verbs.includes('swim'));
  assert(data.pools.adjectives.includes('happy'));
});
test('game modes contain only known words, no duplicates, and differ from each other', () => {
  for (const words of Object.values(data.modes)) {
    assert(words.length > 100 && words.length < all.length);
    assert.equal(new Set(words).size, words.length);
    assert(words.every(word => all.includes(word)));
  }
  assert.notDeepEqual([...data.modes.pictionary].sort(), [...data.modes.charades].sort());
  assert(data.modes.pictionary.includes('lighthouse'));
  assert(!data.modes.charades.includes('lighthouse'));
  assert(data.modes.charades.includes('pretend'));
  assert(!data.modes.pictionary.includes('pretend'));
});
test('every mode/type/count combination returns a complete, unique valid batch', () => {
  let seed = 19;
  const source = () => (seed = (seed * 1664525 + 1013904223) >>> 0);
  for (const mode of model.modes) for (const type of model.types) for (const count of model.quantities) {
    const pool = model.pool(type, mode);
    assert(pool.length >= 10);
    for (let draw = 0; draw < 30; draw++) {
      const words = model.generate({mode, type, count}, source);
      assert.equal(words.length, count);
      assert.equal(new Set(words).size, count);
      assert(words.every(word => pool.includes(word)));
    }
  }
});
test('every word is reachable in a single draw, including both endpoints', () => {
  for (const mode of model.modes) for (const type of model.types) {
    const pool = model.pool(type, mode);
    pool.forEach((word, i) => assert.equal(model.generate({mode, type}, () => i)[0], word));
  }
});
test('single-word draws avoid the previous word without removing it permanently', () => {
  const first = model.generate({}, () => 0);
  const second = model.generate({previous: first}, () => 0);
  assert.notDeepEqual(second, first);
  assert.deepEqual(model.generate({previous: second}, () => 0), first);
  assert.equal(model.pool().length, all.length);
});
test('sampling leaves immutable pools unchanged and fresh result arrays independent', () => {
  const before = model.pool().join(',');
  const words = model.generate({count: 10}, () => 0);
  words[0] = 'changed';
  assert.equal(model.pool().join(','), before);
  assert.notEqual(model.generate({}, () => 0)[0], 'changed');
});
test('invalid counts, types and modes fail clearly', () => {
  for (const count of [0, 2, 11, -1, 1.5, NaN, '3']) assert.throws(() => model.generate({count}), /Choose/);
  assert.throws(() => model.generate({type: 'unknown'}), /valid/);
  assert.throws(() => model.generate({mode: 'unknown'}), /valid/);
});
test('the shared random helper rejects modulo-biased values', () => {
  const values = [4294967295, 7];
  assert.equal(random.integer(0, 9, () => values.shift()), 7);
  assert.equal(values.length, 0);
});
