/* Accessible DOM board: tap/tap, keyboard, or Pointer Events drag. */
class CatMergeGame {
  constructor(root,options={}){
    this.root=root;this.M=CatMergeModel;this.art=CatMergeArt;this.random=options.random||Math.random;this.analytics=options.analytics||(()=>{});this.sound=options.sound;this.selected=null;this.timers=[];this.discoveryMs=options.discoveryMs??1200;
    try{this.storage=options.storage||localStorage;}catch{}
    this.best=0;this.discovered=[1];this.taught=false;
    try{const saved=JSON.parse(this.storage.getItem('cat-merge:v1'));if(saved){this.best=Number.isSafeInteger(saved.best)&&saved.best>=0?saved.best:0;this.discovered=[...new Set([1,...(Array.isArray(saved.discovered)?saved.discovered:[]).filter(v=>Number.isInteger(v)&&v>=1&&v<=12)])];this.taught=saved.taught===true;if(this.M.valid(saved.round))this.state=saved.round;}}catch{}
    this.state=this.state||this.M.create(this.random);this.best=Math.max(this.best,this.state.score);
    for(const v of this.state.board)if(v&&!this.discovered.includes(v))this.discovered.push(v);
    root.innerHTML=`<div class="cm-topbar"><div class="cm-stats"><span>Score<strong data-cm="score">0</strong></span><span>Best<strong data-cm="best">0</strong></span></div><div class="cm-actions"><button data-cm="sound" aria-label="Toggle sound"></button><button data-cm="restart">Restart</button></div></div>
    <div class="cm-goal"><div><span class="cm-eyebrow">YOUR NEXT DISCOVERY</span><strong data-cm="goal"></strong></div><div class="cm-next"><span>Next arrival</span><div data-cm="next"></div></div></div>
    <div class="cm-message"><p data-cm="message" role="status" aria-live="polite" aria-atomic="true"></p><button data-cm="skip">Skip tip</button></div>
    <div class="cm-garden"><div class="cm-board" data-cm="board" role="group" aria-label="Cat garden: four rows and four columns"></div><div class="cm-effects" data-cm="effects" aria-hidden="true"></div><div class="cm-discovery" data-cm="discovery" hidden aria-hidden="true"></div></div>
    <div class="cm-board-note"><span data-cm="space"></span><span>Match neighbors · Keep room</span></div>
    <details class="cm-collection" data-cm="collection"><summary>✦ Cat Collection <span data-cm="progress"></span></summary><p>Your discoveries stay, even when a new garden begins.</p><div class="cm-collection-grid" data-cm="cats"></div></details>
    <section class="cm-result" data-cm="result" hidden aria-labelledby="cm-end"><h2 id="cm-end" tabindex="-1"></h2><p data-cm="summary"></p><button class="cm-primary" data-cm="again">Play Again</button><a href="../#games">Explore more games →</a></section>
    <dialog data-cm="confirm"><h2>Start a fresh garden?</h2><p>Your best score and Cat Collection will stay saved.</p><div><button data-cm="cancel">Keep playing</button><button class="cm-primary" data-cm="new">Start again</button></div></dialog>`;
    this.cells=Array.from({length:16},(_,i)=>{const b=document.createElement('button');b.className='cm-cell';b.dataset.cell=i;b.type='button';this.$('board').append(b);return b;});
    this.$('board').addEventListener('click',e=>{if(this.suppressClick){this.suppressClick=false;return;}const cell=e.target.closest('[data-cell]');if(cell)this.choose(Number(cell.dataset.cell));});
    this.$('board').addEventListener('keydown',e=>{const b=e.target.closest('[data-cell]');if(!b)return;const i=Number(b.dataset.cell),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4}[e.key];if(delta){e.preventDefault();this.cells[Math.max(0,Math.min(15,i+delta))].focus();}if(e.key==='Escape'){this.selected=null;this.render();this.say('Selection cleared. Choose a cat.');}});
    this.$('board').addEventListener('pointerdown',e=>this.down(e));
    this.$('board').addEventListener('pointermove',e=>this.drag(e));
    this.$('board').addEventListener('pointerup',e=>this.up(e));
    this.$('board').addEventListener('pointercancel',()=>this.cancelDrag());
    this.$('board').addEventListener('lostpointercapture',()=>this.cancelDrag());
    this.$('skip').onclick=()=>{this.taught=true;this.save();this.render();this.say('Match neighboring cats, or move a cat to an empty space.');};
    this.$('restart').onclick=()=>{this.cancelDrag();this.$('confirm').showModal();};
    this.$('cancel').onclick=()=>this.$('confirm').close();
    this.$('new').onclick=()=>{this.$('confirm').close();this.reset();};
    this.$('again').onclick=()=>this.reset();
    this.$('sound').onclick=()=>{if(this.sound){this.sound.setMuted(!this.sound.isMuted());this.renderSound();}};
    this.render();this.renderSound();this.say(this.state.status==='playing'?(this.taught?'Welcome to your garden. Match neighboring cats.':'Tap a glowing kitten, then its matching neighbor.'):'Your last garden is complete. Play again to start fresh.');this.showEnd(false);this.emit('game_view');
  }
  $(key){return this.root.querySelector('[data-cm="'+key+'"]');}
  emit(name,data={}){try{this.analytics(name,{game_name:'cat_merge',...data});}catch{}}
  say(text){this.$('message').textContent=text;}
  later(fn,time){const id=setTimeout(fn,time);this.timers.push(id);return id;}
  save(){try{this.storage.setItem('cat-merge:v1',JSON.stringify({best:this.best,discovered:this.discovered,taught:this.taught,round:this.state}));}catch{}}
  renderSound(){this.$('sound').textContent=this.sound?.isMuted()?'Sound off':'Sound on';this.$('sound').setAttribute('aria-pressed',String(!!this.sound&&!this.sound.isMuted()));this.$('sound').hidden=!this.sound;}
  render(){
    const s=this.state, hint=!this.taught?this.M.pairs(s.board)[0]:null;
    this.cells.forEach((b,i)=>{const v=s.board[i], selected=this.selected===i, match=this.selected!==null&&this.M.adjacent(this.selected,i)&&v&&v===s.board[this.selected];b.innerHTML=v?this.art.svg(v)+`<span class="cm-level">${v}</span>`:'<span class="cm-empty" aria-hidden="true">·</span>';b.style.setProperty('--coat',v?this.art.coats[v-1]:'#fff');b.classList.toggle('is-selected',selected);b.classList.toggle('is-match',!!match);b.classList.toggle('is-tip',!!hint&&hint.includes(i));b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',`Row ${Math.floor(i/4)+1}, column ${i%4+1}: ${v?this.M.NAMES[v-1]+', level '+v:'empty space'}${match?', matching neighbor':''}`);b.disabled=s.status!=='playing'||this.discovering;});
    this.$('score').textContent=s.score.toLocaleString();this.$('best').textContent=this.best.toLocaleString();
    const goal=Array.from({length:12},(_,i)=>i+1).find(v=>!this.discovered.includes(v));
    this.$('goal').textContent=goal?(goal===12?'The secret final cat':this.M.NAMES[goal-1]):'Collection complete!';
    this.$('next').innerHTML=this.art.svg(s.next)+`<b>${s.next}</b>`;this.$('next').setAttribute('aria-label',this.M.NAMES[s.next-1]);
    this.$('progress').textContent=this.discovered.length+' / 12';this.$('space').textContent=s.board.filter(v=>!v).length+' spaces · '+(3-s.merges%3)+' merges to a free space';
    this.$('cats').innerHTML=this.M.NAMES.map((name,i)=>{const found=this.discovered.includes(i+1);return `<div class="cm-collection-cat">${this.art.svg(i+1,!found)}<b>${found?name:'???'}</b><small>Level ${i+1}</small></div>`;}).join('');
    this.$('skip').hidden=this.taught||s.status!=='playing';
  }
  choose(i){
    if(this.discovering||this.state.status!=='playing'||this.$('confirm').open)return;
    if(this.selected===null){if(!this.state.board[i]){this.say('Choose a cat first, then a matching neighbor or an empty space.');return;}this.selected=i;this.render();this.say('Now tap a matching neighbor to merge, or an empty space to move.');return;}
    if(this.selected===i){this.selected=null;this.render();this.say('Choose a cat to merge or move.');return;}
    const from=this.selected;
    if(!this.play(from,i)){if(this.state.board[i])this.selected=i;this.render();this.say('Only identical neighbors merge. Move a cat to an empty space to bring a pair together.');}
  }
  play(from,to){
    if(this.discovering)return false;
    const result=this.M.act(this.state,from,to,this.random);if(!result)return false;
    if(!this.started){this.started=true;this.emit('game_start');}
    this.state=result.state;this.selected=null;this.best=Math.max(this.best,this.state.score);
    const fresh=result.merged&&!this.discovered.includes(result.rank);
    if(result.merged){this.taught=true;if(fresh)this.discovered.push(result.rank);}
    this.save();this.render();
    const text=result.merged?`${this.M.NAMES[result.rank-1]}! +${result.points} points.`:'Cat moved. A new cat arrived.';
    this.say((result.breather?'Breathing room! No new arrival. ':'')+(fresh?'New cat discovered! ':'')+text+(fresh?` Collection: ${this.discovered.length} of 12.`:''));
    if(result.merged){this.sound?.chain(Math.min(6,result.rank));this.burst(to,result.points);this.cells[to].classList.remove('cm-pop');void this.cells[to].offsetWidth;this.cells[to].classList.add('cm-pop');}else this.sound?.place();
    if(result.arrival){const b=this.cells[result.arrival.at];b.classList.remove('cm-arrive');void b.offsetWidth;b.classList.add('cm-arrive');}
    if(fresh){this.discover(result.rank);this.emit('cat_discovered',{level:result.rank});}
    this.showEnd(true);return true;
  }
  discover(rank){const box=this.$('discovery');clearTimeout(this.discoveryTimer);box.hidden=false;box.innerHTML=`<span>✦ NEW CAT DISCOVERED</span>${this.art.svg(rank)}<strong>${this.M.NAMES[rank-1]}</strong><small>Cat Collection: ${this.discovered.length} / 12</small>`;this.discovering=this.discoveryMs>0;this.$('board').setAttribute('aria-busy',String(this.discovering));this.cells.forEach(b=>b.disabled=true);this.discoveryTimer=this.later(()=>{box.hidden=true;this.discovering=false;this.$('board').setAttribute('aria-busy','false');this.render();},this.discoveryMs);}
  burst(at,points){const layer=this.$('effects'),x=(at%4+.5)*25,y=(Math.floor(at/4)+.5)*25;const fx=document.createElement('div');fx.className='cm-burst';fx.style.left=x+'%';fx.style.top=y+'%';fx.innerHTML=`<b>+${points}</b>`+Array.from({length:6},(_,i)=>`<i style="--dx:${Math.cos(i*Math.PI/3)*52}px;--dy:${Math.sin(i*Math.PI/3)*48}px;--rot:${i*60}deg"></i>`).join('');layer.append(fx);this.later(()=>fx.remove(),750);}
  showEnd(focus){if(this.state.status==='playing')return;this.$('result').hidden=false;this.root.querySelector('#cm-end').textContent=this.state.status==='won'?'You found the Dreamkeeper!':'Your garden is full';this.$('summary').textContent=`Score: ${this.state.score.toLocaleString()} · Best: ${this.best.toLocaleString()} · Cats discovered: ${this.discovered.length}/12 · Highest cat: ${this.M.NAMES[this.state.highest-1]}. ${this.state.status==='over'?'No neighboring pairs remain. Your collection is safe.':'All twelve evolutions are within reach of your collection.'}`;if(focus){this.say(this.state.status==='won'?'You discovered the final cat! Your garden is complete.':'Game over. The garden is full and no neighboring cats match.');if(this.state.status==='won')this.sound?.chain(6);else this.sound?.gameOver();this.root.querySelector('#cm-end').focus({preventScroll:true});this.later(()=>this.$('result').scrollIntoView({block:'nearest'}),this.state.status==='won'?this.discoveryMs:0);this.emit('game_over',{score:this.state.score,highest_cat:this.state.highest,won:this.state.status==='won'});}}
  reset(){this.timers.forEach(clearTimeout);this.timers=[];this.discovering=false;this.$('board').setAttribute('aria-busy','false');this.cancelDrag();this.state=this.M.create(this.random);this.selected=null;this.started=false;this.$('effects').replaceChildren();this.$('discovery').hidden=true;this.$('result').hidden=true;this.save();this.render();this.say('Fresh garden! Match neighboring kittens to begin.');this.cells[5].focus({preventScroll:true});}
  down(e){const b=e.target.closest('[data-cell]');if(this.discovering||!b||e.button!==0||!e.isPrimary||this.state.status!=='playing')return;const from=Number(b.dataset.cell);if(!this.state.board[from])return;this.suppressClick=false;this.pointer={id:e.pointerId,from,x:e.clientX,y:e.clientY,moved:false};b.setPointerCapture(e.pointerId);}
  drag(e){const p=this.pointer;if(!p||p.id!==e.pointerId)return;if(!p.moved&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<8)return;p.moved=true;if(!this.ghost){this.ghost=document.createElement('div');this.ghost.className='cm-ghost';this.ghost.innerHTML=this.art.svg(this.state.board[p.from]);this.root.append(this.ghost);}this.ghost.style.left=e.clientX+'px';this.ghost.style.top=e.clientY+'px';}
  up(e){const p=this.pointer;if(!p||p.id!==e.pointerId)return;if(p.moved){this.suppressClick=true;const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cell]');if(b&&this.$('board').contains(b)){if(!this.play(p.from,Number(b.dataset.cell)))this.say('Drop on an empty space or an identical neighboring cat.');}else this.say('Cat returned safely. Drop inside the garden.');this.later(()=>this.suppressClick=false,0);}this.cancelDrag();}
  cancelDrag(){this.pointer=null;this.ghost?.remove();this.ghost=null;}
  destroy(){this.timers.forEach(clearTimeout);this.cancelDrag();}
}
