(async()=>{
  const root=document.getElementById('fixture'),results=[];let game,events;
  const assert=(v,m)=>{if(!v)throw Error(m);};
  const random=()=>{let n=731;return ()=>((n=(n*1664525+1013904223)>>>0)/4294967296);};
  function setup(){game?.destroy();events=[];game=new GoFishGame(root,{random:random(),delay:0,storage:{getItem:()=>null,setItem:()=>{}},analytics:(name,data)=>events.push({name,data})});}
  async function test(name,run){setup();const li=document.createElement('li');try{await run();li.className='pass';li.textContent='PASS: '+name;results.push(true);}catch(e){li.className='fail';li.textContent='FAIL: '+name+' — '+e.message;results.push(false);}document.getElementById('results').append(li);}
  function preset(hands,deck=[],books=[[],[],[]]){game.state={hands,deck,books,known:[{},{},{}],turn:0,status:'playing',moves:0};game.shown=GoFishModel.view(game.state);game.render();}
  const flush=()=>new Promise(r=>setTimeout(r,30));
  await test('initial deal has five human cards, hidden opponents, 37 stock and no start event',()=>{
    assert(game.state.hands[0].length===5,'deal');assert(game.$('deck').textContent==='37 cards left','stock');
    assert(game.$('opponents').querySelectorAll('.gf-fan .gf-back').length===10,'face-down cards');assert(!events.some(e=>e.name==='game_start'),'idle counted as play');
    assert([...game.$('opponents').querySelectorAll('button')].every(b=>b.disabled),'opponents selectable too early');
  });
  await test('blocked browser storage does not prevent playing or skipping tips',()=>{
    game.destroy();game=new GoFishGame(root,{delay:0,storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
    assert(game.state.hands[0].length>0,'no hand');game.$('skip').click();assert(game.$('tutorial').hidden,'skip failed');
  });
  await test('two-step tutorial, selected highlight and first-interaction analytics',()=>{
    game.taught=false;game.render();assert(!game.$('tutorial').hidden,'tip missing');
    game.$('hand').querySelector('button').click();assert(game.$('hand').querySelector('[aria-pressed="true"]'),'no selection');
    assert(document.activeElement.dataset.target==='1','keyboard focus did not move to an opponent');
    assert(game.$('lesson').textContent.startsWith('2.'),'wrong step');assert(game.$('instruction').textContent.startsWith('2. Click Sarah'),'unclear target instruction');assert(!game.$('opponents').querySelector('button').disabled,'target blocked');
    game.$('hand').querySelector('button').click();assert(events.filter(e=>e.name==='game_start').length===1,'duplicate start');
    game.$('skip').click();assert(game.$('tutorial').hidden,'skip did not work');game.reset();assert(game.$('tutorial').hidden,'tips repeat');
  });
  await test('clicking rank then opponent transfers all matching cards and retains turn',async()=>{
    preset([[6,1],[19,32,2],[3]]);game.$('hand').querySelector('[data-rank="6"]').click();game.$('opponents').querySelector('[data-target="1"]').click();
    assert(game.busy,'input not locked');const moves=game.state.moves;game.play(1);assert(game.state.moves===moves,'double request');await flush();
    assert(game.state.hands[0].length===4,'transfer');assert(game.state.turn===0&&!game.busy,'extra turn');assert(game.$('hand').textContent.includes('×3'),'group count');
  });
  await test('matching draw announces Nice catch and keeps the turn',async()=>{
    preset([[6],[2],[3]],[19]);await game.run(1,6);assert(game.state.turn===0,'no extra turn');assert(game.history.some(t=>t.includes('Nice catch!')),'no catch feedback');
  });
  await test('drawn card is visible for both new and existing ranks',async()=>{
    for(const existing of [false,true]){
      preset([existing?[6,2]:[6],[3],[4]],[15]);
      game.delay=0;game.state.turn=0;
      // Pause at the draw event before computer turns can take that card away.
      game.wait=async()=>{if(game.lastDraw!==null)return false;return true;};
      await game.run(1,6);
      assert(game.state.hands[0].includes(15),'draw missing from model');
      assert(game.$('draw-note').textContent.includes('3♥'),'draw identity missing');
      assert(game.$('draw-note').textContent.includes(existing?'now 2 cards':'added to your hand'),'group explanation');
      assert(game.$('hand').querySelector('[data-rank="2"] .gf-new-card'),'draw badge missing');
      assert(game.$('count').textContent.includes(existing?'3 cards':'2 cards'),'hand count did not increase');
      game.lastDraw=null;game.busy=false;
    }
  });
  await test('book completion produces reward, collection and updated score',async()=>{
    preset([[6,19,32,1],[45,2],[3]]);await game.run(1,6);assert(game.$('books').querySelector('.gf-book'),'missing book');assert(game.$('score').textContent==='1 / 13 books','score');assert(events.some(e=>e.name==='book_complete'),'analytics');
  });
  await test('restart cancellation preserves game; confirmation cancels pending turn work',async()=>{
    game.delay=25;game.select(GoFishModel.ranks(game.state.hands[0])[0]);game.play(1);
    game.$('restart').click();const old=game.state;assert(game.$('confirm').open,'dialog missing');game.$('cancel').click();assert(game.state===old,'cancel reset');
    game.$('restart').click();game.$('new').click();const fresh=JSON.stringify(game.state);await new Promise(r=>setTimeout(r,80));
    assert(JSON.stringify(game.state)===fresh,'old action modified new game');assert(!game.busy,'new game locked');
  });
  await test('computer request resolves and returns controls to player',async()=>{
    preset([[0,13],[1],[2]],[3,4,5,6]);game.state.turn=2;game.shown=GoFishModel.view(game.state);await game.run(0,2);
    assert(game.state.turn===0&&!game.busy,'turn did not pass');assert([...game.$('hand').querySelectorAll('button')].every(b=>!b.disabled),'hand disabled');
    assert(!game.history.some(t=>t.includes('Alex drew 6')),'private computer draw exposed');
  });
  await test('win, final scores and Play Again work without opening instructions',async()=>{
    preset([[0,13,26],[39],[]],[],[[1,2,3,4,5,6],[7,8,9],[10,11,12]]);await game.run(1,0);
    assert(!game.$('result').hidden,'result hidden');assert(root.querySelector('#gf-result-title').textContent.includes('You Win'),'wrong winner');
    assert(game.$('scores').textContent.includes('7 books'),'wrong score');assert(events.filter(e=>e.name==='game_over').length===1,'missing completion');
    game.$('again').click();assert(game.state.status==='playing'&&game.$('result').hidden,'replay');
  });
  await test('opponent win and tied scores have clear result labels',()=>{
    for(const [books,title] of [[[[],[1,2],[3]],'Sarah Wins!'],[[[1,2],[3,4],[5]],'It’s a tie!']]){
      preset([[],[],[]],[],books);game.state.status='finished';game.ended=false;game.finish();assert(root.querySelector('#gf-result-title').textContent===title,'wrong result');
    }
  });
  await test('all 13 ranks fit narrow and wide layouts without horizontal overflow',()=>{
    preset([Array.from({length:13},(_,i)=>i),[13],[14]]);
    for(const width of [280,350,728,960]){root.style.width=width+'px';assert(root.scrollWidth<=width+1,'overflow at '+width);for(const b of game.$('hand').querySelectorAll('button')){assert(b.getBoundingClientRect().width>=44,'small target');assert(b.getBoundingClientRect().height>=44,'short target');}}
    root.style.width='';
  });
  await test('turn guidance distinguishes waiting from input and journal stays visible',()=>{
    assert(game.$('headline').textContent==='Your turn','human turn heading');assert(game.$('instruction').textContent.includes('card rank'),'missing first step');
    game.shown.turn=1;game.busy=true;game.render();assert(game.$('headline').textContent==='Sarah’s turn','CPU heading');assert(game.$('instruction').textContent.includes('No need to click'),'missing wait cue');
    assert(root.querySelector('.gf-log').tagName==='ASIDE','log still collapsed');
    for(let n=0;n<12;n++)game.say('Action '+n);assert(game.$('log').children.length===10,'journal bound');assert(game.$('log').firstChild.textContent==='Action 11','latest not first');
    game.delay=1700;assert(game.eventDelay('ask')>=1900,'requests too fast');assert(game.eventDelay('book')>=2300,'reward too fast');
  });
  await test('mobile feed keeps two recent actions and an expandable full history',()=>{
    game.say('Sarah asked you for 9s.');game.say('You said Go Fish!');game.say('Sarah took a card from the deck.');
    assert(game.$('recent').children.length===2,'recent feed size');
    assert(game.$('recent').firstChild.textContent==='Sarah took a card from the deck.','latest action missing');
    assert(game.$('mobile-log').textContent.includes('Sarah asked you'),'history missing older request');
    const details=game.$('mobile-log').parentElement;details.querySelector('summary').click();assert(details.open,'history did not expand');
    game.reset();assert(game.$('recent').children.length===1,'old actions survived restart');
  });
  await test('a complete game through the controller reaches thirteen books and final scores',async()=>{
    let steps=0;
    while(game.state.status==='playing'&&steps++<2500){
      if(!game.busy&&game.state.turn===0){
        const move=GoFishModel.choose(game.state,game.random);
        game.$('hand').querySelector('[data-rank="'+move.rank+'"]').click();
        game.$('opponents').querySelector('[data-target="'+move.target+'"]').click();
      }
      await new Promise(r=>setTimeout(r,5));
    }
    while(game.busy&&steps++<2600)await new Promise(r=>setTimeout(r,5));
    assert(game.state.status==='finished','game did not finish');assert(game.state.books.flat().length===13,'missing books');
    assert(!game.$('result').hidden,'no visible result');assert(events.filter(e=>e.name==='game_over').length===1,'completion tracking');
  });
  const failed=results.filter(x=>!x).length;document.getElementById('summary').textContent=`${results.length-failed} passed · ${failed} failed`;game.destroy();
})();
