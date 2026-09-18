(async () => {
  const root=document.getElementById('fixture'), results=[];
  const assert=(condition,message)=>{if(!condition)throw Error(message);};
  let game,clock,events,values;
  const storage={getItem:k=>values[k]||null,setItem:(k,v)=>{values[k]=v;}};
  function setup(saved) {
    game?.destroy();clock=0;events=[];values=saved||{};
    game=new SudokuGame(root,{storage,storageKey:'test',now:()=>clock,random:()=>0,analytics:(name,p)=>events.push({name,...p})});
    return game;
  }
  function blank(){return game.puzzle.givens.indexOf(0);}
  function key(value){game.cells[game.selected].dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));}
  function number(n){game.$('numbers').children[n-1].click();}
  async function test(name,run){
    const li=document.createElement('li');
    try{setup();await run();li.className='pass';li.textContent='PASS: '+name;results.push(true);}
    catch(e){li.className='fail';li.textContent='FAIL: '+name+' — '+e.message;results.push(false);}
    document.getElementById('results').append(li);
  }
  await test('81 cells, 9 rows, fixed givens and accessible grid',()=>{
    assert(game.cells.length===81,'cell count');assert(root.querySelectorAll('[role=row]').length===9,'row count');
    const i=game.puzzle.givens.findIndex(Boolean),original=game.board[i];game.select(i);game.input(original%9+1);game.erase();
    assert(game.board[i]===original,'given changed');assert(!game.$('numbers').children[0].disabled,'pad unavailable for dragging');assert(game.cells[i].getAttribute('aria-readonly')==='true','given not announced');
  });
  await test('number pad and keyboard enter correct answers',()=>{
    const i=blank();game.cells[i].click();number(game.puzzle.solution[i]);assert(game.board[i]===game.puzzle.solution[i],'pad failed');
    game.$('erase').click();key(String(game.puzzle.solution[i]));assert(game.board[i]===game.puzzle.solution[i],'keyboard failed');
  });
  await test('notes toggle independently and never count as mistakes',()=>{
    const i=blank();game.select(i);key('n');number(2);number(7);assert(game.board[i]===0&&game.notes[i]===66,'notes failed');number(2);assert(game.notes[i]===64,'toggle off failed');assert(game.mistakes===0,'notes counted as mistake');
    assert(game.cells[i].getAttribute('aria-label').includes('notes 7'),'notes label');game.$('erase').click();assert(game.notes[i]===0,'erase notes');
  });
  await test('correct answers remove peer notes, but wrong answers do not',()=>{
    const i=blank(),n=game.puzzle.solution[i],peer=game.board.findIndex((v,j)=>!v&&j!==i&&Math.floor(j/9)===Math.floor(i/9));
    assert(peer>=0,'test fixture peer missing');game.select(peer);game.toggleNotes();game.input(n);game.toggleNotes();game.select(i);
    game.input(n%9+1);assert(game.notes[peer]&(1<<(n-1)),'wrong entry removed notes');game.input(n);assert(!(game.notes[peer]&(1<<(n-1))),'peer note retained');
  });
  await test('mistakes are visible, counted once per changed entry, and erasable',()=>{
    const i=blank(),wrong=game.puzzle.solution[i]%9+1;game.select(i);game.input(wrong);game.input(wrong);
    assert(game.mistakes===1,'duplicate counted');assert(game.cells[i].classList.contains('is-wrong'),'missing mistake class');assert(game.cells[i].getAttribute('aria-invalid')==='true','missing invalid label');
    key('Delete');assert(game.board[i]===0&&!game.cells[i].classList.contains('is-wrong'),'erase failed');
  });
  await test('row, column, box and equal-value highlights follow selection',()=>{
    game.select(40);assert(root.querySelectorAll('.is-related').length===21,'unit highlight count');
    const i=game.board.findIndex(Boolean);game.select(i);assert(root.querySelectorAll('.is-matching').length===game.board.filter(n=>n===game.board[i]).length,'matching values');
  });
  await test('arrows stay in the board and use roving keyboard focus',()=>{
    game.select(0);key('ArrowLeft');key('ArrowUp');assert(game.selected===0,'went out of bounds');key('ArrowRight');assert(game.selected===1,'arrow failed');
    assert(root.querySelectorAll('.sdk-cell[tabindex="0"]').length===1,'roving focus failed');key('End');assert(game.selected===8,'end failed');
  });
  await test('hint fixes selected editable cell and skips givens',()=>{
    const i=blank();game.select(i);game.$('hint').click();assert(game.board[i]===game.puzzle.solution[i]&&game.hints===1,'hint failed');
    const given=game.puzzle.givens.findIndex(Boolean);game.select(given);game.hint();assert(game.hints===2&&game.puzzle.givens[game.selected]===0,'hint changed given');
  });
  await test('timer counts active time and excludes hidden intervals',()=>{
    clock=12500;game.tick();assert(game.$('timer').textContent==='00:12','active timer');game.wasVisible=false;clock+=60000;game.tick();assert(game.elapsed===12500,'hidden interval counted');
  });
  await test('new game requires confirmation and cancellation keeps progress',()=>{
    const i=blank();game.select(i);game.input(game.puzzle.solution[i]);game.$('difficulty').value='hard';game.$('new').click();
    assert(game.$('dialog').open,'no confirmation');game.$('cancel').click();assert(game.board[i]===game.puzzle.solution[i]&&game.puzzle.difficulty==='easy','cancel lost progress');
  });
  await test('new game changes difficulty and resets notes/counters/time',()=>{
    const i=blank();game.select(i);game.input(game.puzzle.solution[i]%9+1);clock=5000;game.tick();game.$('difficulty').value='medium';game.$('new').click();game.$('confirm').click();
    assert(game.puzzle.difficulty==='medium'&&game.elapsed===0&&game.mistakes===0&&game.hints===0&&!game.notesMode,'not reset');
  });
  await test('new puzzle avoids immediate repeats per difficulty',()=>{
    const index=game.puzzle.index;game.$('new').click();assert(game.puzzle.index!==index,'repeated easy');const second=game.puzzle.index;
    game.start('hard');game.start('easy');assert(game.puzzle.index!==second,'forgot previous difficulty');
  });
  await test('storage round trip restores answers, notes, counts, time and mode',()=>{
    const i=blank();game.select(i);game.input(game.puzzle.solution[i]%9+1);game.hint();const j=game.board.findIndex(n=>n===0);game.select(j);game.toggleNotes();game.input(4);clock=23000;game.tick();game.save();
    const saved=JSON.parse(values.test);setup({...values});assert(game.board.join('')===saved.board.join('')&&game.notes.join(',')===saved.notes.join(','),'board/notes lost');assert(game.elapsed===23000&&game.mistakes===1&&game.hints===1&&game.notesMode,'metadata lost');
  });
  await test('real browser storage restores a separate game instance',()=>{
    const key='puzzleten:sudoku:test:'+Date.now();
    try {
      game.destroy();game=new SudokuGame(root,{storage:localStorage,storageKey:key});
      const i=blank();game.select(i);game.input(game.puzzle.solution[i]);const before=game.board.join('');game.destroy();
      game=new SudokuGame(root,{storage:localStorage,storageKey:key});assert(game.board.join('')===before,'real storage round trip failed');
      assert(game.$('status').textContent.includes('restored'),'not restored');
    } finally { localStorage.removeItem(key); }
  });
  await test('corrupt or tampered saved games are discarded safely',()=>{
    setup({test:'{invalid'});assert(game.board.length===81,'invalid JSON crashed');let s=JSON.parse(values.test);const i=game.puzzle.givens.findIndex(Boolean);s.board[i]=0;setup({test:JSON.stringify(s)});assert(game.board[i]===game.puzzle.givens[i],'tampered clue restored');
    s=JSON.parse(values.test);s.notes[0]=99999;setup({test:JSON.stringify(s)});assert(game.notes.every(n=>n===0),'invalid notes restored');
  });
  await test('storage and analytics failures never break gameplay',()=>{
    game.destroy();game=new SudokuGame(root,{storage:{getItem(){throw Error('blocked');},setItem(){throw Error('full');}},analytics(){throw Error('blocked');}});
    const i=blank();game.select(i);game.input(game.puzzle.solution[i]);assert(game.board[i]===game.puzzle.solution[i],'input failed');assert(game.$('save').textContent.includes('unavailable'),'storage notice missing');
  });
  await test('completing a real puzzle stops timer, locks edits and emits once',()=>{
    clock=10000;
    game.puzzle.givens.forEach((n,i)=>{if(!n){game.select(i);game.input(game.puzzle.solution[i]);}});
    assert(game.done&&!game.$('complete').hidden,'completion missing');const elapsed=game.elapsed;clock+=10000;game.tick();assert(game.elapsed===elapsed,'completed timer running');
    assert(events.filter(e=>e.name==='game_over').length===1,'completion event count');const board=game.board.join('');game.erase();game.hint();game.input(1);assert(game.board.join('')===board,'completed game editable');
    game.save();setup({...values});assert(game.done&&!game.$('complete').hidden,'completed state not restored');assert(events.filter(e=>e.name==='game_over').length===0,'duplicate restored completion event');
  });
  function drag(source, target, cancel=false) {
    // Synthetic pointers cannot acquire native capture; exercise the actual event handlers.
    source.setPointerCapture=()=>{};
    const a=source.getBoundingClientRect();
    const send=(type,x,y)=>source.dispatchEvent(new PointerEvent(type,{bubbles:true,button:0,pointerId:71,clientX:x,clientY:y,cancelable:true}));
    send('pointerdown',a.left+a.width/2,a.top+a.height/2);
    send('pointermove',target.x,target.y);
    send(cancel?'pointercancel':'pointerup',target.x,target.y);
  }
  function center(cell){const r=cell.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
  await test('clicked number is visibly selected, including in notes mode',()=>{
    number(2);assert(game.$('numbers').children[1].getAttribute('aria-pressed')==='true','missing selection');
    game.erase();game.toggleNotes();number(7);
    assert(root.querySelectorAll('.sdk-number[aria-pressed=true]').length===1,'multiple selections');
    assert(game.$('numbers').children[6].getAttribute('aria-pressed')==='true','notes selection missing');
  });
  await test('drag from pad enters answers and notes at the drop cell',()=>{
    root.scrollIntoView();const i=blank(),n=game.puzzle.solution[i];
    drag(game.$('numbers').children[n-1],center(game.cells[i]));assert(game.board[i]===n,'drop did not enter answer');
    game.erase();game.toggleNotes();drag(game.$('numbers').children[3],center(game.cells[i]));
    assert(game.notes[i]===8&&game.board[i]===0,'drop ignored notes mode');
  });
  await test('drag answer outside erases, cancellation and invalid drops preserve board',()=>{
    root.scrollIntoView();const i=blank(),n=game.puzzle.solution[i];game.select(i);game.input(n);
    const r=game.$('board').getBoundingClientRect(),outside={x:r.right+12,y:r.top+20};
    drag(game.cells[i],outside,true);assert(game.board[i]===n,'cancel erased answer');
    drag(game.cells[i],center(game.cells[i]));assert(game.board[i]===n,'in-board drop erased answer');
    drag(game.cells[i],outside);assert(game.board[i]===0,'outside drop did not erase');
    const given=game.puzzle.givens.findIndex(Boolean),before=game.board.join('');
    drag(game.$('numbers').children[0],center(game.cells[given]));assert(game.board.join('')===before,'fixed clue changed');
    drag(game.$('numbers').children[0],outside);assert(game.board.join('')===before,'outside pad drop changed board');
    assert(!document.querySelector('.sdk-drag-number'),'drag ghost leaked');
  });
  await test('every difficulty starts a valid playable board',()=>{
    for(const level of SudokuModel.levels){game.start(level);assert(game.puzzle.difficulty===level&&game.board.includes(0),'cannot start '+level);assert(SudokuModel.mistakes(game.board,game.puzzle.solution).length===0,'bad givens');}
  });
  const failed=results.filter(v=>!v).length;
  document.getElementById('summary').textContent=`${results.length-failed} passed · ${failed} failed`;
  window.TEST_RESULT={passed:results.length-failed,failed};game.destroy();
})();
