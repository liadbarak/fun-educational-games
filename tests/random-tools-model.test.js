const {test} = require('node:test');
const assert = require('node:assert/strict');
const R = require('../shared/random-tools.js');
const sequence = values => { let i = 0; return () => values[i++ % values.length]; };
test('inclusive endpoints and negative ranges', () => {
  assert.equal(R.integer(-5, 5, () => 0), -5);
  assert.equal(R.integer(-5, 5, () => 10), 5);
  assert.deepEqual(R.numbers(7, 7, 3, false), [7, 7, 7]);
});
test('rejection sampling discards the biased tail', () => {
  assert.equal(R.integer(1, 10, sequence([4294967295, 4294967290, 9])), 10);
});
test('draws with replacement can repeat', () => {
  assert.deepEqual(R.numbers(1, 10, 4, false, () => 0), [1, 1, 1, 1]);
});
test('sampling without replacement terminates even with a constant source', () => {
  const result = R.numbers(-3, 3, 7, true, () => 0);
  assert.deepEqual([...result].sort((a,b) => a-b), [-3,-2,-1,0,1,2,3]);
});
test('maximum supported range works with no repeats', () => {
  const result = R.numbers(-1000000000, 1000000000, 100, true);
  assert.equal(new Set(result).size, 100);
  assert.ok(result.every(v => v >= -1000000000 && v <= 1000000000));
});
test('all ordered pairs from three unique choices are reachable equally', () => {
  const outputs = new Set();
  for(let first=0; first<3; first++) for(let second=0; second<2; second++) outputs.add(R.numbers(1,3,2,true,sequence([first,second])).join(','));
  assert.equal(outputs.size,6);
});
test('invalid bounds, counts, and impossible unique draws are rejected', () => {
  for(const args of [[2,1,1,false],[NaN,2,1,false],[1,2.5,1,false],[-1000000001,2,1,false],[0,1000000001,1,false],[1,2,0,false],[1,2,101,false],[1,2,1.5,false],[1,2,3,true]]) assert.throws(() => R.numbers(...args));
});
test('coins count every independent result', () => {
  const batch = R.coins(100,false,sequence([0,1]));
  assert.equal(batch.heads,50);assert.equal(batch.tails,50);assert.equal(batch.results.length,100);assert.equal(batch.winner,null);
});
test('best of three stops at two wins and supports both winners', () => {
  assert.deepEqual(R.coins(3,true,() => 0).results,['Heads','Heads']);
  const batch=R.coins(3,true,sequence([0,1,1]));
  assert.equal(batch.winner,'Tails');assert.equal(batch.results.length,3);
});
test('invalid coin counts rejected', () => {
  for(const n of [0,101,NaN,1.1]) assert.throws(() => R.coins(n));
});
