/* Pointer/tap/keyboard presentation for Dino Nestkeepers. */
class DinoGame {
  constructor(root,options={}){
    this.root=root;this.random=options.random||Math.random;this.analytics=options.analytics||(()=>{});this.auto=options.auto!==false;this.sound=options.sound||null;
    try{this.storage=options.storage===undefined?localStorage:options.storage;}catch{this.storage=null;}
    this.key='puzzleten:dino-nestkeepers:v1';let raw=null;try{raw=this.storage?.getItem(this.key);}catch{}
    this.prefs=DinoModel.preferences(raw);this.state=DinoModel.create();this.elements=new Map();this.timers=new Set();this.raf=0;this.selected=null;this.drag=null;this.mode='ready';this.paused=true;this.backup=null;this.destroyed=false;
    this.build();this.render();
    this.onVisibility=()=>{if(document.hidden)this.pause('Your eggs are waiting.');};
    this.onResize=()=>{if(this.mode==='play'&&!this.paused)this.pause('The board resized. Resume when you’re ready.');else this.cancelDrag();this.position();};
    this.onPageHide=()=>{this.pause('Welcome back. Your round is paused.');this.save();};
    document.addEventListener('visibilitychange',this.onVisibility);window.addEventListener('resize',this.onResize);window.addEventListener('pagehide',this.onPageHide);
    if(this.prefs.tutorialDone)this.sheet('Welcome to the valley','Match eggs. Hatch dinosaurs. Beat your best.','Play',()=>this.start());else this.tutorial();
    this.emit('game_view');
  }
  $(key){return this.root.querySelector('[data-dino="'+key+'"]');}
  emit(name,extra={}){try{this.analytics(name,{game_name:'dino_nestkeepers',...extra});}catch{}}
  playSound(name,...args){try{this.sound?.[name]?.(...args);}catch{}}
  later(fn,delay){const id=setTimeout(()=>{this.timers.delete(id);if(!this.destroyed)fn();},delay);this.timers.add(id);return id;}
  say(text){this.$('status').textContent=text;}
  dino(i){const s=DinoModel.species[i];return `<span class="dn-dino dn-${s.kind}" style="--dino:${s.color}" aria-hidden="true"><span class="dn-tail"></span><span class="dn-leg"></span><span class="dn-body"></span><span class="dn-neck"></span><span class="dn-head"></span><span class="dn-arm"></span>${i===2?'<span class="dn-horn"></span>':''}${i===3?'<span class="dn-plates"></span>':''}</span>`;}
  build(){
    this.root.innerHTML=`<div class="dn-stats"><span>Score <b data-dino="score">0</b></span><span aria-label="Lives"><b data-dino="lives">3 lives</b></span><span>Hatched <b data-dino="hatched">0</b></span><span>Best <b data-dino="best">0</b></span></div>
    <div class="dn-world"><div class="dn-field" data-dino="field" aria-label="Falling eggs"><div class="dn-mountain"></div><div class="dn-mountain m2"></div><div class="dn-mountain m3"></div><div class="dn-guide" data-dino="guide"></div><div data-dino="eggs"></div><span class="dn-hand" data-dino="hand" aria-hidden="true" hidden>☝</span></div><div class="dn-nests" data-dino="nests" aria-label="Dinosaur nests"></div></div>
    <p class="dn-status" data-dino="status" role="status" aria-live="polite"></p>
    <div class="dn-controls"><button data-dino="pause">Pause</button><button data-dino="collection">Collection</button><button data-dino="help">How to play</button><button data-dino="restart">Restart</button><button data-dino="sound" aria-pressed="false">Sound</button></div>
    <p class="dn-storage" data-dino="storage" hidden>Storage is unavailable. Your collection and best score won’t be saved.</p>
    <dialog data-dino="dialog" aria-labelledby="dn-dialog-title"><h2 id="dn-dialog-title" data-dino="dialog-title"></h2><div data-dino="dialog-content"></div><div class="dn-dialog-actions" data-dino="dialog-actions"></div></dialog>`;
    DinoModel.species.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.className='dn-nest';b.dataset.nest=i;b.addEventListener('click',()=>{if(this.selected!==null)this.deliver(this.selected,i);});this.$('nests').append(b);});
    const soundButton=this.$('sound');soundButton.hidden=!this.sound;
    const soundLabel=()=>{let muted=true;try{muted=this.sound?.isMuted()!==false;}catch{}soundButton.textContent=muted?'Sound off':'Sound on';soundButton.setAttribute('aria-pressed',String(!muted));};
    soundLabel();soundButton.onclick=()=>{try{this.sound.setMuted(!this.sound.isMuted());}catch{}soundLabel();};
    this.$('pause').onclick=()=>this.pause();this.$('collection').onclick=()=>this.collection();this.$('help').onclick=()=>this.tutorial();
    this.$('restart').onclick=()=>{this.freeze();this.sheet('Start a new round?','Your current score and nest progress will reset.','Restart',()=>{this.emit('game_restart');this.start();},()=>this.resume());};
    this.$('dialog').addEventListener('cancel',e=>{e.preventDefault();});
    this.onKey=e=>{if(e.target.closest('dialog'))return;if(e.key==='Escape'){if(this.drag)this.cancelDrag();else this.pause();}else if(/^[1-5]$/.test(e.key)&&this.selected!==null&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();this.deliver(this.selected,Number(e.key)-1);}};
    this.root.addEventListener('keydown',this.onKey);
  }
  sheet(title,content,label,action,cancel){
    this.freeze();const dialog=this.$('dialog');this.$('dialog-title').textContent=title;this.$('dialog-content').replaceChildren();
    if(typeof content==='string'){const p=document.createElement('p');p.textContent=content;this.$('dialog-content').append(p);}else this.$('dialog-content').append(content);
    const actions=this.$('dialog-actions');actions.replaceChildren();
    const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>{dialog.close();fn();};actions.append(b);};
    if(cancel)button('Keep playing',cancel);button(label,action);if(!dialog.open)dialog.showModal();
  }
  freeze(){this.paused=true;cancelAnimationFrame(this.raf);this.raf=0;this.cancelDrag();}
  pause(text='Take a breath. Your eggs are waiting.'){
    if(this.mode!=='play'||this.paused)return;this.sheet('Paused',text,'Resume',()=>this.resume());
  }
  resume(){if(this.mode==='tutorial'){this.paused=false;return;}if(this.state.status!=='playing')return;this.mode='play';this.paused=false;this.last=performance.now();this.loop();}
  clearEffects(){this.timers.forEach(clearTimeout);this.timers.clear();this.root.querySelectorAll('.dn-reward').forEach(e=>e.remove());}
  start(){
    this.freeze();this.clearEffects();this.backup=null;this.state=DinoModel.create();this.mode='play';this.paused=false;this.roundBest=this.prefs.best;this.overSent=false;this.$('guide').textContent='';this.$('hand').hidden=true;this.root.classList.remove('is-tutorial');
    DinoModel.spawn(this.state,this.random);this.render();this.say('Match the egg’s color and symbol. Three matching eggs hatch a dinosaur.');this.emit('game_start');this.last=performance.now();this.loop();
  }
  tutorial(){
    if(this.mode==='tutorial')return;
    if(this.mode==='play')this.backup={state:this.state,roundBest:this.roundBest,overSent:this.overSent};
    this.freeze();this.clearEffects();this.state=DinoModel.create();this.state.eggs=[{id:this.state.nextId++,type:0,x:23,y:38}];this.mode='tutorial';this.paused=false;
    this.$('guide').textContent='Drag the egg to its dinosaur';this.$('hand').hidden=false;this.root.classList.add('is-tutorial');this.render();this.say('Practice: drag the egg, or tap it and then the matching nest.');
  }
  finishTutorial(){
    this.prefs.tutorialDone=true;this.save();this.emit('dino_tutorial_complete');this.$('guide').textContent='';this.$('hand').hidden=true;this.root.classList.remove('is-tutorial');
    if(this.backup){const b=this.backup;this.backup=null;this.state=b.state;this.roundBest=b.roundBest;this.overSent=b.overSent;this.mode='play';this.render();this.sheet('Ready to continue?','Your round is exactly where you left it.','Resume',()=>this.resume());}
    else this.start();
  }
  createEgg(egg){
    const s=DinoModel.species[egg.type],b=document.createElement('button');b.type='button';b.className='dn-egg';b.dataset.egg=egg.id;b.dataset.type=egg.type;b.style.setProperty('--dino',s.color);b.textContent=s.symbol;b.setAttribute('aria-label',s.name+' egg, '+s.pattern);b.setAttribute('aria-pressed','false');
    b.onclick=()=>{if(this.suppressClick){this.suppressClick=false;return;}if(!this.paused){this.selected=egg.id;this.position();this.say('Choose the '+s.name+' nest, or press '+(egg.type+1)+'.');}};
    b.onpointerdown=e=>{
      this.suppressClick=false;if(this.paused||this.drag||e.button!==0)return;
      this.selected=egg.id;this.drag={id:egg.id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false,el:b};b.setPointerCapture(e.pointerId);this.position();
    };
    b.onpointermove=e=>{const d=this.drag;if(!d||d.id!==egg.id||d.pointer!==e.pointerId)return;if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>6)d.moved=true;if(!d.moved)return;e.preventDefault();const r=this.$('field').getBoundingClientRect();b.style.left=(e.clientX-r.left)+'px';b.style.top=(e.clientY-r.top)+'px';b.style.pointerEvents='none';this.highlight(e.clientX,e.clientY);};
    b.onpointerup=e=>{const d=this.drag;if(!d||d.id!==egg.id||d.pointer!==e.pointerId)return;const moved=d.moved;b.style.pointerEvents='none';const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-nest]');this.cancelDrag();if(!moved){this.selected=egg.id;this.position();return;}this.suppressClick=true;if(target&&this.root.contains(target))this.deliver(egg.id,Number(target.dataset.nest));else this.say('Released — the egg continues falling.');};
    b.onpointercancel=()=>{this.cancelDrag();this.say('Drag cancelled. No life lost.');};
    b.onlostpointercapture=()=>{if(this.drag?.id===egg.id)this.cancelDrag();};
    this.elements.set(egg.id,b);this.$('eggs').append(b);
  }
  highlight(x,y){this.$('nests').querySelectorAll('.is-target').forEach(b=>b.classList.remove('is-target'));const target=document.elementFromPoint(x,y)?.closest('[data-nest]');if(target&&this.root.contains(target)&&!target.disabled)target.classList.add('is-target');}
  cancelDrag(){const d=this.drag;this.drag=null;this.selected=null;if(d){d.el.style.pointerEvents='';if(d.el.hasPointerCapture(d.pointer))d.el.releasePointerCapture(d.pointer);}this.$('nests')?.querySelectorAll('.is-target').forEach(b=>b.classList.remove('is-target'));this.position();}
  position(){
    const h=this.$('field')?.clientHeight||180;
    this.state.eggs.forEach(e=>{const b=this.elements.get(e.id);if(!b)return;if(!(this.drag?.id===e.id&&this.drag.moved)){b.style.left=e.x+'%';b.style.top=(30+e.y/100*(h-54))+'px';}b.setAttribute('aria-pressed',String(this.selected===e.id));});
    if(this.mode==='tutorial'&&this.state.eggs.length){const field=this.$('field').getBoundingClientRect(),nest=this.$('nests').firstElementChild.getBoundingClientRect(),e=this.state.eggs[0],x=field.width*e.x/100+12,y=30+e.y/100*(h-54)+8,hand=this.$('hand');hand.style.left=x+'px';hand.style.top=y+'px';hand.style.setProperty('--hand-dx',(nest.x+nest.width/2-field.x-x)+'px');hand.style.setProperty('--hand-dy',(nest.y+nest.height/2-field.y-y)+'px');}
  }
  render(full=true){
    for(const [id,b] of this.elements)if(!this.state.eggs.some(e=>e.id===id&&String(e.type)===b.dataset.type)){b.remove();this.elements.delete(id);}
    this.state.eggs.forEach(e=>{if(!this.elements.has(e.id))this.createEgg(e);});this.position();
    const s=this.state;this.$('score').textContent=s.score;this.$('lives').textContent=s.lives+' '+(s.lives===1?'life':'lives');this.$('hatched').textContent=s.hatched;this.$('best').textContent=this.prefs.best;
    if(full)this.$('nests').querySelectorAll('button').forEach((b,i)=>{const locked=i>=s.active;b.disabled=locked;b.classList.toggle('is-locked',locked);b.setAttribute('aria-label',locked?'Locked species, '+(i===3?3:6)+' hatches to unlock':DinoModel.species[i].name+' nest, '+s.progress[i]+' of 3 eggs');b.innerHTML=locked?`<span class="dn-locked-symbol" aria-hidden="true">?</span><small>${i===3?3:6} hatches</small><span class="dn-progress" aria-hidden="true">○ ○ ○</span>`:this.dino(i)+`<small>${DinoModel.species[i].symbol} ${DinoModel.species[i].name}</small><span class="dn-progress" aria-hidden="true">${'●'.repeat(s.progress[i])+'○'.repeat(3-s.progress[i])}</span>`;});
    this.$('pause').disabled=this.mode!=='play';this.$('restart').disabled=this.mode==='tutorial';this.$('help').disabled=this.mode==='tutorial';
  }
  deliver(id,nest){
    if(this.paused)return;const egg=this.state.eggs.find(e=>e.id===id);if(!egg)return;
    if(this.mode==='tutorial'){if(nest===0){this.cancelDrag();this.finishTutorial();}else{this.cancelDrag();this.say('Look for the same color and symbol. Practice costs no lives.');}return;}
    const result=DinoModel.drop(this.state,id,nest);if(!result){this.selected=null;this.position();return;}
    this.cancelDrag();
    if(result.kind==='wrong'){this.say('Different nest — one life lost.');const b=this.$('nests').children[nest];b.classList.add('is-wrong');this.later(()=>b.classList.remove('is-wrong'),350);}
    else{
      this.playSound('chain',result.hatch?6:Math.min(this.state.streak,3));
      this.say((this.state.streak>=3?'Great streak ×'+this.state.streak+'! ':'Matched! ')+'+'+result.points+' points.');
      if(result.hatch){const first=!this.prefs.discovered.includes(result.type);if(first){this.prefs.discovered.push(result.type);this.emit('dino_species_discovered',{species:DinoModel.species[result.type].name});}
        this.reward(result.type);this.say((first?'Discovered! ':'HATCH! ')+DinoModel.species[result.type].name+' rescued. +'+result.points+' points.');this.emit('dino_hatched',{species:DinoModel.species[result.type].name,hatched:this.state.hatched});
      }
    }
    this.prefs.best=Math.max(this.prefs.best,this.state.score);this.save();this.render();
    if(this.state.status==='over')this.gameOver();
    else if(result.unlocked!==null&&result.unlocked!==undefined)this.sheet('A new nest is ready',DinoModel.species[result.unlocked].name+' joins this round. Its nest is ready before its eggs arrive.','Continue',()=>this.resume());
  }
  reward(type){
    this.root.querySelector('.dn-reward')?.remove();const b=document.createElement('div');b.className='dn-reward';b.setAttribute('aria-hidden','true');b.style.setProperty('--dino',DinoModel.species[type].color);b.innerHTML='<span class="dn-shell"></span><span class="dn-sparkles">✦ &nbsp; ✧ &nbsp; ✦</span>'+this.dino(type)+'<span class="dn-float">+50 · HATCH!</span>';this.root.querySelector('.dn-world').append(b);this.later(()=>b.remove(),1100);
  }
  collection(){
    const mode=this.mode;this.freeze();const gallery=document.createElement('div');gallery.className='dn-gallery';
    DinoModel.species.forEach((s,i)=>{const item=document.createElement('div');item.innerHTML=this.prefs.discovered.includes(i)?this.dino(i)+'<p>'+s.name+' ✓</p>':'<span class="dn-locked-symbol" aria-hidden="true">?</span><p>Not discovered</p>';gallery.append(item);});
    this.sheet('Dino collection',gallery,'Back',()=>{if(mode==='tutorial'){this.paused=false;}else if(mode==='play')this.resume();else if(mode==='over')this.gameOver(false);else this.sheet('Welcome to the valley','Your collection is saved in this browser.','Play',()=>this.start());});
  }
  gameOver(send=true){
    this.mode='over';this.freeze();const s=this.state;this.prefs.best=Math.max(this.prefs.best,s.score);this.save();this.render();
    if(send&&!this.overSent){this.overSent=true;this.emit('game_over',{score:s.score,seconds_played:Math.floor(s.elapsed),hatched:s.hatched,correct_eggs:s.correct,wrong_eggs:s.wrong,missed_eggs:s.missed});}
    this.sheet(s.score>this.roundBest?'New best score!':'Every egg is another chance',`${s.score} points · ${s.hatched} dinosaurs hatched. Best: ${this.prefs.best}. Collection: ${this.prefs.discovered.length} of 5 discovered.`,'Play again',()=>{this.emit('game_restart');this.start();});
  }
  advance(dt){if(this.paused||this.mode!=='play')return;const missed=DinoModel.step(this.state,dt,this.selected,this.random);if(missed.length)this.say('An egg slipped past — one life lost.');this.render(false);if(this.state.status==='over')this.gameOver();}
  loop(){if(!this.auto||this.raf||this.paused||this.mode!=='play'||document.hidden)return;this.raf=requestAnimationFrame(now=>{this.raf=0;const dt=Math.min(.05,(now-this.last)/1000);this.last=now;this.advance(dt);this.loop();});}
  save(){try{if(!this.storage)throw Error();this.storage.setItem(this.key,JSON.stringify(this.prefs));}catch{this.$('storage').hidden=false;}}
  destroy(){this.destroyed=true;this.freeze();this.clearEffects();document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('resize',this.onResize);window.removeEventListener('pagehide',this.onPageHide);this.root.removeEventListener('keydown',this.onKey);if(this.$('dialog').open)this.$('dialog').close();}
}
