const {test} = require('node:test');
const assert = require('node:assert/strict');
const puzzles = require('../sudoku/puzzles.js');
const model = require('../sudoku/model.js');
// Independent bounded solver used only by tests; not shipped as a page script.
function solutions(encoded) {
  const board=[...encoded].map(Number), found=[];
  const peers=Array.from({length:81},(_,i)=>Array.from({length:81},(_,j)=>j).filter(j=>j!==i&&(Math.floor(i/9)===Math.floor(j/9)||i%9===j%9||(Math.floor(i/27)===Math.floor(j/27)&&Math.floor(i%9/3)===Math.floor(j%9/3)))));
  function search() {
    let at=-1, options=[];
    for(let i=0;i<81;i++)if(!board[i]){
      const used=new Set(peers[i].map(j=>board[j]));const available=[1,2,3,4,5,6,7,8,9].filter(v=>!used.has(v));
      if(!available.length)return;
      if(at===-1||available.length<options.length){at=i;options=available;}
      if(options.length===1)break;
    }
    if(at===-1){found.push(board.join(''));return;}
    for(const n of options){board[at]=n;search();board[at]=0;if(found.length===2)return;}
  }
  search();return found;
}
test('120 distinct puzzles: valid givens, complete solutions, and exactly one solution each',()=>{
  const seen=new Set();
  for(const [difficulty,entries] of Object.entries(puzzles)){
    assert.equal(entries.length,30);
    for(const packed of entries){
      assert.match(packed,/^[0-9]{81}[1-9]{81}$/);
      const clue=packed.slice(0,81),solution=packed.slice(81),board=[...solution].map(Number);
      assert.ok(!seen.has(clue),'duplicate puzzle');seen.add(clue);
      for(let i=0;i<81;i++){
        assert.ok(clue[i]==='0'||clue[i]===solution[i],difficulty+' clue mismatch');
        assert.deepEqual(model.conflicts(board,i),[],difficulty+' invalid solution');
      }
      assert.deepEqual(solutions(clue),[solution],difficulty+' solution count');
    }
  }
  assert.equal(seen.size,120);
});
test('every alternative can be selected, without immediate repeats',()=>{
  for(const difficulty of model.levels)for(let previous=0;previous<30;previous++){
    const indices=new Set();
    for(let k=0;k<29;k++)indices.add(model.select(puzzles,difficulty,previous,()=> (k+.5)/29).index);
    assert.equal(indices.size,29);assert.ok(!indices.has(previous));
  }
});
test('first and last puzzle accessible on initial selection',()=>{
  assert.equal(model.select(puzzles,'easy',-1,()=>0).index,0);
  assert.equal(model.select(puzzles,'easy',-1,()=>.999999).index,29);
});
test('single-entry collection is safe and invalid difficulties fail',()=>{
  assert.equal(model.select({easy:[puzzles.easy[0]]},'easy',0).index,0);
  assert.throws(()=>model.select(puzzles,'unknown'));
});
test('completion requires a full matching board',()=>{
  const p=model.select(puzzles,'hard');assert.ok(!model.complete(p.givens,p.solution));assert.ok(model.complete(p.solution,p.solution));
});
test('hint corrects selected editable cell without touching givens',()=>{
  const p=model.select(puzzles,'expert'),i=p.givens.indexOf(0);const h=model.hint(p.givens,p,i);
  assert.deepEqual(h,{index:i,value:p.solution[i]});assert.equal(model.hint(p.solution,p),null);
});
test('mistakes distinguish blanks from wrong numbers',()=>{
  const p=model.select(puzzles,'medium'),b=p.givens.slice(),i=b.indexOf(0);assert.deepEqual(model.mistakes(b,p.solution),[]);
  b[i]=p.solution[i]%9+1;assert.deepEqual(model.mistakes(b,p.solution),[i]);
});
