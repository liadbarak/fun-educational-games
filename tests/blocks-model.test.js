// Run: node --test tests/blocks-model.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { SIZE, SHAPES, Game } = require('../blocks/model.js');

const singleHand = () => new Game(() => 0);

test('every offered shape is connected, unique within itself and can fit on an empty board', () => {
  const game = singleHand();
  SHAPES.forEach((shape, id) => {
    const keys = new Set(shape.cells.map(cell => cell.join(',')));
    assert.equal(keys.size, shape.cells.length);
    assert.ok(keys.has('0,0'), 'the dotted top-left block must be occupied');
    const reached = new Set(['0,0']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [r,c] of shape.cells) {
        if (reached.has(`${r},${c}`)) continue;
        if ([[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(p => reached.has(p.join(',')))) {
          reached.add(`${r},${c}`); changed = true;
        }
      }
    }
    assert.equal(reached.size, keys.size, shape.name);
    assert.ok(game.hasSpace(id));
  });
});

test('invalid placements do not change the board, score or hand', () => {
  const game = singleHand();
  game.hand = [7, 0, 0]; // 2x2 square
  for (const [r,c] of [[7,7],[-1,0],[0,-1],[8,0],[0,8],[0.5,0]]) {
    const before = JSON.stringify(game);
    assert.equal(game.place(0,r,c).ok, false);
    assert.equal(JSON.stringify(game), before);
  }
  assert.ok(game.place(0,0,0).ok);
  const before = JSON.stringify(game);
  assert.equal(game.place(1,1,1).ok, false, 'cannot overlap');
  assert.equal(game.place(0,4,4).ok, false, 'cannot reuse a spent piece');
  assert.equal(JSON.stringify(game), before);
});

test('a row and column clear simultaneously, counting the intersection once', () => {
  const game = singleHand();
  for (let i=1;i<SIZE;i++) { game.board[i]=1; game.board[i*SIZE]=1; }
  const result = game.place(0,0,0);
  assert.equal(result.lines,2);
  assert.equal(result.cleared.length,15);
  assert.equal(result.points,21);
  assert.equal(game.score,21);
  assert.equal(game.lines,2);
  assert.ok(game.board.every(v => v === 0));
});

test('two full rows clear together without shifting any other blocks', () => {
  const game = singleHand();
  game.hand = [2,0,0];
  for (let c=1;c<8;c++) { game.board[c]=1; game.board[8+c]=1; }
  game.board[56]=3;
  const result=game.place(0,0,0);
  assert.equal(result.lines,2);
  assert.equal(result.points,22);
  assert.equal(game.board[56],3);
  assert.equal(game.board.filter(Boolean).length,1);
});

test('new pieces arrive only after all three are used', () => {
  const game=singleHand();
  assert.equal(game.place(2,0,0).newHand,false);
  assert.equal(game.place(0,1,0).newHand,false);
  assert.deepEqual(game.hand,[null,0,null]);
  assert.equal(game.place(1,2,0).newHand,true);
  assert.deepEqual(game.hand,[0,0,0]);
  assert.equal(game.score,3);
});

test('game continues if any remaining piece fits, even when another cannot', () => {
  const game=singleHand();
  game.board=Array.from({length:64},(_,i)=>(Math.floor(i/8)+i%8)%2);
  game.hand=[8,0,0];
  assert.equal(game.hasSpace(8),false);
  assert.equal(game.hasMove(),true);
  assert.equal(game.place(2,0,0).over,false);
});

test('game ends when none of the remaining pieces fits', () => {
  const game=singleHand();
  game.board=Array.from({length:64},(_,i)=>(Math.floor(i/8)+i%8)%2);
  game.hand=[0,7,8];
  const result=game.place(0,0,0);
  assert.equal(result.over,true);
  const before=JSON.stringify(game);
  assert.equal(game.place(1,4,4).ok,false);
  assert.equal(JSON.stringify(game),before);
});

test('no-move detection also runs after a new hand is dealt', () => {
  const game=new Game(()=>7/SHAPES.length); // squares cannot fit checkerboard
  game.board=Array.from({length:64},(_,i)=>(Math.floor(i/8)+i%8)%2);
  game.hand=[null,null,0];
  const result=game.place(2,0,0);
  assert.equal(result.newHand,true);
  assert.equal(result.over,true);
});

test('line clearing can rescue an otherwise unplaceable remaining piece', () => {
  const game=singleHand();
  game.hand=[0,7,null];
  game.board=Array.from({length:64},(_,i)=>(Math.floor(i/8)+i%8)%2);
  for(let c=1;c<8;c++) game.board[c]=1;
  game.board[8]=0; game.board[9]=0;
  assert.equal(game.hasSpace(7),false);
  const result=game.place(0,0,0);
  assert.equal(result.lines,1);
  assert.equal(result.over,false);
  assert.equal(game.fits(7,0,0),true);
});

test('reset clears score, board and game-over state', () => {
  const game=singleHand();
  game.place(0,0,0); game.over=true; game.reset();
  assert.equal(game.score,0); assert.equal(game.lines,0); assert.equal(game.moves,0);
  assert.equal(game.over,false); assert.equal(game.board.filter(Boolean).length,0);
  assert.equal(game.hand.length,3);
});

test('seeded full runs preserve the board and hand invariants', () => {
  let seed=72;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let run=0;run<20;run++) {
    const game=new Game(random);
    for(let move=0;move<300 && !game.over;move++) {
      const options=[];
      game.hand.forEach((id,slot)=>{
        for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(game.fits(id,r,c)) options.push([slot,r,c]);
      });
      assert.ok(options.length);
      const oldScore=game.score;
      const result=game.place(...options[Math.floor(random()*options.length)]);
      assert.ok(result.ok); assert.ok(game.score>oldScore);
      assert.equal(game.board.length,64);
      assert.ok(game.board.every(v=>Number.isInteger(v) && v>=0 && v<=3));
      for(let i=0;i<8;i++) {
        assert.ok(game.board.slice(i*8,(i+1)*8).some(v=>!v));
        assert.ok(Array.from({length:8},(_,r)=>game.board[r*8+i]).some(v=>!v));
      }
      assert.equal(game.over,!game.hasMove());
    }
  }
});
