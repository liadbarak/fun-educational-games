/* DOM presentation, paced turn events and accessible two-tap controls. */
class GoFishGame {
  constructor(root, options={}) {
    this.root=root;this.M=GoFishModel;this.random=options.random||Math.random;
    this.analytics=options.analytics||(()=>{});this.delay=options.delay??1700;
    this.names=['You','Sarah','Alex'];this.selected=null;this.epoch=0;
    try { this.storage=options.storage??localStorage;this.taught=this.storage.getItem('go-fish:tutorial')==='done'; } catch { this.taught=false; }
    root.innerHTML=`<div class="gf-toolbar"><span class="gf-chip">YOU + 2 COMPUTER PLAYERS</span><button data-gf="restart" class="gf-small">New game</button></div>
      <div class="gf-layout"><div class="gf-table"><div class="gf-opponents" data-gf="opponents"></div>
      <div class="gf-center"><div class="gf-stock"><div class="gf-back gf-deck" aria-hidden="true">✦</div><strong data-gf="deck"></strong></div>
      <div class="gf-action-panel" data-gf="action"><div role="status" aria-live="polite" aria-atomic="true" aria-label="Current Action"><span class="gf-action-route" data-gf="route"></span><p class="gf-action-message" data-gf="message"></p><p class="gf-action-detail" data-gf="detail"></p></div><button class="gf-skip" data-gf="skip">Skip tips</button></div></div>
      <div class="gf-flight" data-gf="flight" aria-hidden="true"></div>
      <div class="gf-player-heading"><h2>Your hand <span data-gf="count"></span></h2><span data-gf="score"></span></div>
      <div class="gf-hand" data-gf="hand" role="group" aria-label="Your cards, grouped by rank"></div>
      <div class="gf-books" data-gf="books" aria-label="Your completed books"></div>
      <section class="gf-result" data-gf="result" hidden aria-labelledby="gf-result-title"><span class="gf-trophy" aria-hidden="true">✦</span><h2 id="gf-result-title" tabindex="-1"></h2><div data-gf="scores"></div><button data-gf="again" class="gf-primary">Play Again</button><a href="../#games">Explore more PuzzleTen games →</a></section></div>
      <details class="gf-history" data-gf="history"><summary><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4v5h5M3 9a9 9 0 1 1 0 7M12 7v5l3 2"/></svg> Game History</summary><p>Previous actions, newest first.</p><ol data-gf="log"></ol></details></div>
      <dialog data-gf="confirm"><h2>Start a new game?</h2><p>This will replace your current game.</p><div><button data-gf="cancel">Keep playing</button><button data-gf="new" class="gf-primary">New game</button></div></dialog>`;
    this.$('hand').addEventListener('click',e=>{
      const b=e.target.closest('[data-rank]');if(!b)return;
      this.select(Number(b.dataset.rank));
      if(e.detail===0)this.$('opponents').querySelector('button:not(:disabled)')?.focus({preventScroll:true});
    });
    this.$('opponents').addEventListener('click',e=>{const b=e.target.closest('[data-target]');if(b)this.play(Number(b.dataset.target));});
    this.$('skip').onclick=()=>{this.finishTutorial();this.render();};
    this.$('again').onclick=()=>{this.reset();this.focusRank();};
    this.$('restart').onclick=()=>{this.$('confirm').showModal();};
    this.$('cancel').onclick=()=>this.$('confirm').close();
    this.$('new').onclick=()=>{this.$('confirm').close();this.reset();this.focusRank();};
    this.reset();this.emit('game_view');
  }
  $(key){return this.root.querySelector('[data-gf="'+key+'"]');}
  emit(name, data={}){try{this.analytics(name,{game_name:'go_fish',...data});}catch{}}
  finishTutorial(){this.taught=true;try{this.storage.setItem('go-fish:tutorial','done');}catch{}}
  reset(){
    this.epoch++;this.state=this.M.create(this.random);this.shown=this.M.view(this.state);
    this.selected=null;this.lastDraw=null;this.busy=false;this.started=false;this.ended=false;this.history=[];
    this.$('history').open=false;this.$('result').hidden=true;this.$('flight').className='gf-flight';this.$('log').replaceChildren();
    this.render();this.say('Cards dealt — five cards each.');
    this.$('hand').classList.remove('gf-deal');void this.$('hand').offsetWidth;this.$('hand').classList.add('gf-deal');
  }
  focusRank(){this.$('hand').querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
  select(r){
    if(this.busy||this.state.turn!==0||this.state.status!=='playing')return;
    if(!this.M.ranks(this.state.hands[0]).includes(r))return;
    this.selected=r;this.lastDraw=null;
    if(!this.started){this.started=true;this.emit('game_start');}
    this.render();
    this.$('hand').querySelector('[data-rank="'+r+'"]')?.focus({preventScroll:true});
  }
  play(target){
    if(this.busy||this.state.turn!==0||this.selected===null||this.$('confirm').open)return;
    const r=this.selected;
    if((!this.state.hands[target]?.length&&!this.state.deck.length)||target===0)return;
    this.finishTutorial();this.selected=null;this.run(target,r);
  }
  // This is the sole live announcement. History records events separately.
  showAction(route,message,detail='',kind='event'){
    this.$('action').dataset.kind=kind;
    this.$('route').textContent=route;
    this.$('message').textContent=message;
    this.$('detail').textContent=detail;
  }
  yourTurn(){
    this.showAction('YOUR TURN',this.selected===null?'Choose a card to ask for':'Ask for '+this.M.RANKS[this.selected]+'s',this.selected===null?(this.taught?'Tap a rank in your hand below.':'Tap a rank below, then choose an opponent.'):'Choose Sarah or Alex above.','ready');
  }
  say(text){
    this.history.unshift(text);this.history=this.history.slice(0,10);
    this.$('log').replaceChildren(...this.history.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  }
  destroy(){this.epoch++;}
  render(){
    this.$('hand').classList.remove('gf-deal');
    const s=this.shown, ready=!this.busy&&s.turn===0&&s.status==='playing';
    this.$('hand').classList.toggle('is-ready',ready);
    if(ready)this.yourTurn();
    this.$('skip').hidden=this.taught||!ready;
    this.$('opponents').innerHTML=[1,2].map(p=>`<button class="gf-opponent ${s.turn===p?'is-turn':''} ${ready&&this.selected!==null?'can-ask':''}" data-target="${p}" ${!ready||this.selected===null||(!s.hands[p].length&&!s.deck.length)?'disabled':''} aria-label="Ask ${this.names[p]}${this.selected!==null?' for '+this.M.RANKS[this.selected]+'s':''}. ${s.hands[p].length} cards, ${s.books[p].length} books"><span class="gf-avatar" aria-hidden="true"><svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" focusable="false"><circle cx="16" cy="11" r="6"/><path d="M5 29v-3a11 11 0 0 1 22 0v3z"/></svg></span><strong>${this.names[p]}</strong><span class="gf-fan" aria-hidden="true">${Array.from({length:Math.min(5,s.hands[p].length)},()=>'<i class="gf-back">✦</i>').join('')}</span><span class="gf-seat-count">${s.hands[p].length} cards · <b>${s.books[p].length} books</b></span><span class="gf-mini-books">${s.books[p].length?s.books[p].map(r=>this.M.RANKS[r]).join(' · '):'No books yet'}</span></button>`).join('');
    this.$('deck').textContent=s.deck.length?s.deck.length+' cards left':'Deck empty';
    this.$('deck').previousElementSibling.classList.toggle('is-empty',!s.deck.length);
    this.$('count').textContent='('+s.hands[0].length+' cards)';
    this.$('score').textContent=s.books[0].length+' / 13 books';
    const drawn=this.lastDraw;
    const rs=this.M.ranks(s.hands[0]);
    this.$('hand').innerHTML=rs.map((r,i)=>{
      const cards=s.hands[0].filter(c=>this.M.rank(c)===r).sort((a,b)=>a-b);
      return `<button class="gf-rank ${drawn!==null&&cards.includes(drawn)?'is-drawn':''} ${this.selected===r?'is-selected':''} ${!this.taught&&ready&&this.selected===null&&i===0?'is-guide':''}" data-rank="${r}" aria-pressed="${this.selected===r}" aria-label="${this.M.RANKS[r]}, ${cards.length} ${cards.length===1?'card':'cards'}: ${cards.map(c=>['spades','hearts','diamonds','clubs'][Math.floor(c/13)]).join(', ')}" ${ready?'':'disabled'}><span class="gf-card-top">${this.M.RANKS[r]}<small>×${cards.length}</small></span><span class="gf-suits">${cards.map(c=>`<span class="${[1,2].includes(Math.floor(c/13))?'gf-red':''}">${this.M.SUITS[Math.floor(c/13)]}</span>`).join('')}</span>${drawn!==null&&cards.includes(drawn)?'<span class="gf-new-card">+1 drawn</span>':''}<span class="gf-card-bottom" aria-hidden="true">${this.M.RANKS[r]}</span></button>`;
    }).join('')||'<p class="gf-empty-hand">No cards in hand. You’ll draw up to five on your next turn if the deck has cards.</p>';
    this.$('books').innerHTML=s.books[0].length?'<span>Your books</span>'+s.books[0].map(r=>`<span class="gf-book">${this.M.RANKS[r]} <small>♠ ♥ ♦ ♣</small></span>`).join(''):'<span>Collect all four suits of a rank to make a book.</span>';
  }
  eventDelay(type){
    return this.delay*({ask:1.2,fish:1,draw:1.3,transfer:1.25,book:1.5,refill:1.1}[type]||1);
  }
  async wait(ms, epoch){
    await new Promise(resolve=>setTimeout(resolve,ms));
    while(epoch===this.epoch&&(document.hidden||this.$('confirm').open)) await new Promise(resolve=>setTimeout(resolve,150));
    return epoch===this.epoch;
  }
  async run(target,r){
    if(this.busy)return;
    const epoch=this.epoch,p=this.state.turn;
    const events=this.M.ask(this.state,p,target,r);if(!events)return;
    this.busy=true;this.render();
    for(const e of events){
      if(epoch!==this.epoch)return;
      if(e.type==='draw'&&e.player===0)this.lastDraw=e.card;
      this.shown=e.view;this.render();
      this.presentEvent(e,p,target,r);
      if(e.type==='finish'||e.type==='turn')continue;
      if(!await this.wait(this.eventDelay(e.type),epoch))return;
    }
    this.$('flight').className='gf-flight';
    this.shown=this.M.view(this.state);this.busy=false;this.render();
    if(this.state.status==='finished'){this.finish();return;}
    if(this.state.turn===0){this.yourTurn();this.focusRank();}
    else {
      this.busy=true;this.render();
      this.showAction(this.names[this.state.turn]+'’S TURN','Choosing a player…','','thinking');
      if(!await this.wait(this.delay*.65,epoch))return;
      this.busy=false;
      const move=this.M.choose(this.state,this.random);
      if(move)this.run(move.target,move.rank);
    }
  }
  presentEvent(e,player,target,requested){
    const rank=this.M.RANKS[e.rank],who=this.names[e.player];
    const route=this.names[player]+' → '+this.names[target];
    const next=e.again?(player===0?'You can ask again.':who+' can ask again.'):'Turn passes.';
    if(e.type==='ask'){
      this.showAction(route,'“Do you have any '+rank+'s?”');
      this.say(`${player===0?'You asked':who+' asked'} ${target===0?'you':this.names[target]} for ${rank}s.`);
    }
    if(e.type==='fish'){
      this.showAction(route,'Go Fish! 🎣',this.names[target]+' has no '+rank+'s.','fish');
      this.say(`${target===0?'You said':this.names[target]+' said'} “Go Fish!” to ${player===0?'you':this.names[player]} (${rank}s).`);
    }
    if(e.type==='transfer'){
      const text=`${this.names[e.target]} gave ${player===0?'you':who} ${rank}.`;
      this.showAction(route,text,player===0?'You get another go!':who+' gets another go!','success');
      this.say(text+' '+(player===0?'You get':who+' gets')+' another go!');
      this.fly(e.target,player,e.count+' × '+rank);
    }
    if(e.type==='draw'){
      const card=this.M.RANKS[this.M.rank(e.card)]+this.M.SUITS[Math.floor(e.card/13)];
      const text=player===0?'You drew '+card:who+' draws '+(e.again?'a '+this.M.RANKS[requested]:'a card');
      const count=e.view.hands[0].filter(c=>this.M.rank(c)===this.M.rank(e.card)).length;
      const location=player===0?(count>1?'Added to your '+this.M.RANKS[this.M.rank(e.card)]+' group (now '+count+' cards).':'Added to your hand below.') : '';
      this.showAction(this.names[player],e.again?'Nice catch! '+text:text,[location,next].filter(Boolean).join(' '),e.again?'success':'draw');
      this.say((e.again?'Nice catch! ':'')+text+'. '+next);
      this.fly(-1,player,e.again||player===0?this.M.RANKS[this.M.rank(e.card)]:'✦');
    }
    if(e.type==='empty'){
      this.showAction(route,'No cards left to draw','Turn passes.');
      this.say(this.names[player]+' could not draw: the deck is empty. Turn passes.');
    }
    if(e.type==='book'){
      this.showAction(who,'Book complete! '+rank+'s','All four suits collected.','success');
      this.say(`${who==='You'?'You collected':who+' collected'} all four ${rank}s — book complete!`);
      this.fly(e.player,e.player,rank+' ♠♥♦♣',true);this.emit('book_complete',{player:e.player,rank,score:e.view.books[e.player].length});
    }
    if(e.type==='refill'){
      this.showAction(who,'A fresh hand',`${who==='You'?'You draw':who+' draws'} ${e.count} cards from the deck.`);
      this.say(`${who==='You'?'You drew':who+' drew'} ${e.count} cards for a fresh hand.`);this.fly(-1,e.player,'+'+e.count);
    }
  }
  fly(from,to,text,book=false){
    const f=this.$('flight');f.textContent=text;f.className='gf-flight';
    const pos=p=>p===-1?[22,43]:p===0?[50,88]:p===1?[26,15]:[74,15];
    const a=pos(from),b=pos(to);
    f.style.setProperty('--from-x',a[0]+'%');f.style.setProperty('--from-y',a[1]+'%');
    f.style.setProperty('--to-x',b[0]+'%');f.style.setProperty('--to-y',b[1]+'%');
    void f.offsetWidth;f.classList.add(book?'gf-reward':'gf-moving');
  }
  finish(){
    if(this.ended)return;this.ended=true;
    const scores=this.state.books.map(b=>b.length),best=Math.max(...scores),winners=scores.map((n,p)=>n===best?p:-1).filter(p=>p>=0);
    const title=winners.length>1?'It’s a tie!':winners[0]===0?'You Win! 🎉':this.names[winners[0]]+' Wins!';
    this.$('result').hidden=false;this.root.querySelector('#gf-result-title').textContent=title;
    this.$('scores').innerHTML=scores.map((n,p)=>`<p class="${n===best?'gf-winner':''}">${this.names[p]} <strong>${n} ${n===1?'book':'books'}</strong></p>`).join('');
    this.showAction('GAME COMPLETE','All 13 books collected','See the final scores below.','finished');
    this.say(title+' '+scores.map((n,p)=>this.names[p]+' — '+n+' books').join('. '));
    this.root.querySelector('#gf-result-title').focus({preventScroll:true});
    this.$('result').scrollIntoView({block:'nearest',behavior:'instant'});
    this.emit('game_over',{score:scores[0],moves:this.state.moves,result:winners.length>1?'tie':winners[0]===0?'win':'loss'});
  }
}
