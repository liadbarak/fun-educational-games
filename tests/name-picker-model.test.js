const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../random-name-picker/model.js');
test('pasted lists trim, skip blanks, preserve duplicates and Unicode', () => {
  assert.deepEqual(model.parse(' Emma \r\n\nNoah\nEmma\n 李 \n'), ['Emma','Noah','Emma','李']);
});
test('one entry and empty input', () => {
  assert.deepEqual(model.pick(['Emma'],1,()=>0),{winners:['Emma'],remaining:[]});
  assert.throws(()=>model.pick([],1),/at least/);
});
test('all allowed quantities select distinct entries and preserve source', () => {
  const pool=['A','B','C','D','E'];
  for(const count of [1,2,3,5]) {
    const result=model.pick(pool,count,()=>0);
    assert.equal(result.winners.length,count); assert.equal(new Set(result.winners).size,count);
    assert.equal(result.remaining.length,5-count);
  }
  assert.equal(pool.length,5);
  for(const count of [0,4,6,NaN]) assert.throws(()=>model.pick(pool,count));
  assert.throws(()=>model.pick(['A'],2));
});
test('duplicate entries are independently eligible and removed individually', () => {
  const result=model.pick(['Emma','Emma','Noah'],1,()=>0);
  assert.deepEqual(result.remaining,['Emma','Noah']);
  assert.deepEqual(model.pick(['Emma','Emma'],2,()=>0).winners,['Emma','Emma']);
});
test('all indexes reachable and repeated removal exhausts the pool', () => {
  const pool=['A','B','C'];
  pool.forEach((name,i)=>assert.equal(model.pick(pool,1,()=>i).winners[0],name));
  let rest=pool; for(let i=0;i<3;i++)rest=model.pick(rest,1,()=>0).remaining;
  assert.equal(rest.length,0);
});
