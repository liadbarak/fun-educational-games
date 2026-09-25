const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../go-fish/model.js');
function seeded(seed){return ()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);}
function fixture(hands,deck=[]){return {hands:hands.map(h=>h.slice()),deck:deck.slice(),books:[[],[],[]],known:[{},{},{}],turn:0,status:'playing',moves:0};}
function integrity(s){
  const cards=[...s.deck,...s.hands.flat(),...s.books.flatMap(b=>b.flatMap(r=>[r,r+13,r+26,r+39]))];
  assert.equal(cards.length,52);assert.equal(new Set(cards).size,52);
  assert(cards.every(c=>Number.isInteger(c)&&c>=0&&c<52));
  for(const h of s.hands)for(const r of M.ranks(h))assert(h.filter(c=>M.rank(c)===r).length<4);
  if(s.status==='playing')assert(s.hands[s.turn].length>0);
}
test('deal conserves a 52-card deck; five cards per player except automatic books',()=>{
  for(let n=0;n<200;n++){const s=M.create(seeded(n));integrity(s);assert.equal(s.deck.length,37);s.hands.forEach((h,p)=>assert.equal(h.length+s.books[p].length*4,5));assert.equal(s.turn,0);}
});
test('request transfers ALL matching cards and grants an extra turn',()=>{
  const s=fixture([[6,1],[19,32,2],[3]]);const events=M.ask(s,0,1,6);
  assert.deepEqual(s.hands[0],[6,1,19,32]);assert.deepEqual(s.hands[1],[2]);assert.equal(s.turn,0);
  assert.equal(events.find(e=>e.type==='transfer').count,2);assert.equal(s.known[0][6],true);assert.equal(s.known[1][6],false);
});
test('a matching fish draw grants another turn; a different rank passes it',()=>{
  for(const match of [true,false]){const s=fixture([[6],[2],[3]],[match?19:7]);const es=M.ask(s,0,1,6);assert(es.some(e=>e.type==='fish'));assert.equal(es.find(e=>e.type==='draw').again,match);assert.equal(s.turn,match?0:1);assert.equal(s.deck.length,0);}
});
test('four suits become one book and are removed; empty winner refills for extra turn',()=>{
  const s=fixture([[6,19,32],[45,2],[3]],[8,9,10,11,12,0]);const es=M.ask(s,0,1,6);
  assert.deepEqual(s.books[0],[6]);assert.equal(s.hands[0].length,5);assert.equal(s.deck.length,1);assert.equal(s.turn,0);
  assert(es.some(e=>e.type==='book'));assert(es.some(e=>e.type==='refill'));assert(s.known.every(k=>k[6]===false));
});
test('empty deck passes on misses and skips empty hands',()=>{
  const s=fixture([[0],[],[1]]);s.turn=2;M.ask(s,2,0,1);assert.equal(s.turn,0);
  const es=M.ask(s,0,2,0);assert.equal(s.turn,2);assert(es.some(e=>e.type==='empty'));
});
test('empty next player refills from remaining stock, even if less than five',()=>{
  const s=fixture([[0],[],[1]],[3,4,5]);M.ask(s,0,2,0);assert.equal(s.turn,1);assert.equal(s.hands[1].length,2);assert.equal(s.deck.length,0);
});
test('matching draw completing a book refills; nonmatching book draw still passes',()=>{
  let s=fixture([[0,13,26],[1],[2]],[4,5,39]);let es=M.ask(s,0,1,0);assert.deepEqual(s.books[0],[0]);assert.equal(s.turn,0);assert.equal(s.hands[0].length,2);assert(es.find(e=>e.type==='draw').again);
  s=fixture([[0,1,14,27],[2],[3]],[40]);es=M.ask(s,0,1,0);assert.deepEqual(s.books[0],[1]);assert.equal(s.turn,1);assert.equal(es.find(e=>e.type==='draw').again,false);
});
test('invalid actions cannot mutate game state',()=>{
  const s=fixture([[0],[1],[2]],[3]);const before=JSON.stringify(s);
  for(const args of [[1,0,1],[0,0,0],[0,1,2],[0,3,0],[0,-1,0],[0,1.5,0]])assert.equal(M.ask(s,...args),null);
  assert.equal(JSON.stringify(s),before);s.status='finished';assert.equal(M.ask(s,0,1,0),null);
});
test('the last book ends the game with thirteen books',()=>{
  const s=fixture([[0,13,26],[39],[]]);s.books=[[1,2,3,4],[5,6,7,8],[9,10,11,12]];
  M.ask(s,0,1,0);assert.equal(s.status,'finished');assert.equal(s.books.flat().length,13);integrity(s);
});
test('AI uses public requests and never hidden ranks of opponents',()=>{
  const a=fixture([[0,1],[13,2],[3,4]]);a.known[1][0]=true;
  assert.deepEqual(M.choose(a,()=>.5),{target:1,rank:0});
  const b=fixture([[0,1],[8,9],[10,11]]);b.known=a.known.map(k=>({...k}));
  assert.deepEqual(M.choose(a,()=>.5),M.choose(b,()=>.5));
});
test('event snapshots preserve chronology and do not alias live state',()=>{
  const s=fixture([[0],[1],[2]],[13]);const es=M.ask(s,0,1,0);
  assert.equal(es.find(e=>e.type==='fish').view.hands[0].length,1);assert.equal(es.find(e=>e.type==='draw').view.hands[0].length,2);
  s.hands[0].push(26);assert.equal(es.find(e=>e.type==='draw').view.hands[0].length,2);
});
test('500 seeded complete games preserve every card and terminate with 13 books',()=>{
  for(let seed=1;seed<=500;seed++){
    const random=seeded(seed),s=M.create(random);let steps=0;
    while(s.status==='playing'&&steps++<3000){const move=M.choose(s,random);assert(move,'legal request exists');assert(M.ask(s,s.turn,move.target,move.rank));integrity(s);}
    assert.equal(s.status,'finished','seed '+seed+' must finish');assert.equal(s.books.flat().length,13);assert.equal(s.deck.length,0);assert(s.hands.every(h=>!h.length));
  }
});

test('when both opponents have empty hands, stock keeps the game moving',()=>{
 const s=fixture([[0],[],[]],[1,2,3,4,5,6]);const move=M.choose(s,()=>.5);assert(move);
 M.ask(s,0,move.target,move.rank);assert.equal(s.turn,1);assert.equal(s.hands[1].length,5);assert.equal(s.deck.length,0);
});
