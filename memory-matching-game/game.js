/* Uses the site's track() and Prefs helpers; no separate analytics service. */
(() => {
  const $=id=>document.getElementById(id);
  let game, buttons=[], mismatch, ticker, started=false, progress=false, elapsed=0, since=null;
  const seconds=()=>Math.floor((elapsed+(since===null?0:performance.now()-since))/1000);
  const format=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const emit=(name,extra={})=>track(name,{game_name:'memory-matching-game',theme:game.theme,difficulty:game.difficulty,...extra});
  const key=()=>`memory-best-v1:${game.theme}:${game.difficulty}`;
  function best() {
    const value=Prefs.read(key(),null);
    return value && Number.isInteger(value.moves) && value.moves>=game.pairs && Number.isInteger(value.seconds) && value.seconds>=0 ? value:null;
  }
  function pauseClock() { if(since!==null) {elapsed+=performance.now()-since;since=null;} }
  function draw() {
    buttons.forEach((button,i)=>{
      const matched=game.matched.has(i), shown=matched||game.open.includes(i);
      button.classList.toggle('revealed',shown); button.classList.toggle('matched',matched);
      button.setAttribute('aria-label',`Card ${i+1}: ${shown?game.cards[i].name:'face down'}${matched?', matched':''}`);
      button.setAttribute('aria-disabled',String(matched||game.open.includes(i)||game.open.length===2||game.complete));
    });
    $('moves').textContent=game.moves; $('matches').textContent=`${game.matches} / ${game.pairs}`;
    $('time').textContent=format(seconds());
  }
  function finish() {
    pauseClock(); clearInterval(ticker);
    const result={moves:game.moves,seconds:seconds()}, record=MemoryModel.better(result,best());
    if(record) Prefs.write(key(),result);
    const saved=best(); $('best').textContent=saved?`${saved.moves} moves · ${format(saved.seconds)}`:'Not saved';
    $('completion').hidden=false;
    $('summary').textContent=`All ${game.pairs} pairs found in ${result.moves} moves and ${format(result.seconds)}.${record?' New personal best!':''}`;
    $('announcement').textContent=$('summary').textContent;
    emit('game_over',{moves:result.moves,duration_sec:result.seconds,completed:true,new_best:record});
  }
  function celebrate(i) {
    const paired=buttons.filter((_,j)=>game.matched.has(j)&&game.cards[j].id===game.cards[i].id);
    paired.forEach(button=>{
      button.classList.remove('match-pop');
      // Restart the animation for this newly matched pair only.
      void button.offsetWidth;
      button.classList.add('match-pop');
    });
    const cheer=$('match-cheer');
    cheer.textContent=['Lovely pair!','You found it!','Memory magic!','Perfect match!'][game.matches%4];
    cheer.classList.remove('celebrate'); void cheer.offsetWidth; cheer.classList.add('celebrate');
  }
  function flip(i) {
    const outcome=game.flip(i); if(outcome==='ignored') return;
    if(!started) { started=true;since=performance.now();ticker=setInterval(()=>{$('time').textContent=format(seconds());},250);emit('game_start'); }
    draw();
    if(!progress && game.moves>=3) {progress=true;emit('game_progress',{moves:game.moves,matches:game.matches});}
    if(outcome==='miss') {
      $('announcement').textContent=`${game.cards[game.open[0]].name} and ${game.cards[i].name}. No match. Try again.`;
      mismatch=setTimeout(()=>{game.conceal();draw();},950);
    } else if(outcome==='match') { celebrate(i); $('announcement').textContent=`${game.cards[i].name} pair found. ${game.matches} of ${game.pairs} pairs.`; }
    else if(outcome==='complete') { celebrate(i); finish(); }
  }
  function reset(reason) {
    if(game && reason) emit(reason==='settings'?'game_settings':'game_restart',{next_theme:$('theme').value,next_difficulty:$('difficulty').value,moves:game.moves});
    clearTimeout(mismatch);clearInterval(ticker); elapsed=0;since=null;started=false;progress=false;
    game=new MemoryModel.Game($('theme').value,$('difficulty').value);
    $('match-cheer').classList.remove('celebrate'); $('match-cheer').textContent='';
    $('completion').hidden=true; $('announcement').textContent='New board ready. Flip any two cards.';
    $('board').replaceChildren(); $('board').dataset.difficulty=game.difficulty;
    buttons=game.cards.map((item,i)=>{
      const button=document.createElement('button');button.type='button';button.className='memory-card';
      const back=document.createElement('span');back.className='card-back';back.textContent='?';back.setAttribute('aria-hidden','true');
      const face=document.createElement('span');face.className='card-face';face.setAttribute('aria-hidden','true');
      if(game.theme==='letters') {face.classList.add('letter');face.textContent=item.name;}
      else {const img=document.createElement('img');img.src=`art/${game.theme}-${item.id}.svg`;img.alt='';img.draggable=false;face.append(img);
        const label=document.createElement('span');label.textContent=item.name;face.append(label);}
      button.append(back,face);button.addEventListener('click',()=>flip(i));
      button.addEventListener('keydown',e=>{
        const cols=getComputedStyle($('board')).gridTemplateColumns.split(' ').length;
        const offsets={ArrowRight:1,ArrowLeft:-1,ArrowDown:cols,ArrowUp:-cols};
        if(e.key in offsets){e.preventDefault();buttons[(i+offsets[e.key]+buttons.length)%buttons.length].focus();}
      });
      $('board').append(button);return button;
    });
    const saved=best();$('best').textContent=saved?`${saved.moves} moves · ${format(saved.seconds)}`:'Set your first best';draw();
  }
  $('theme').addEventListener('change',()=>reset('settings'));
  $('difficulty').addEventListener('change',()=>reset('settings'));
  $('new-game').addEventListener('click',()=>reset('restart'));
  $('play-again').addEventListener('click',()=>{reset('restart');buttons[0].focus();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseClock();else if(started&&!game.complete)since=performance.now();});
  window.addEventListener('pagehide',pauseClock);
  window.addEventListener('pageshow',()=>{if(started&&!game.complete&&!document.hidden)since=performance.now();});
  reset();
})();
