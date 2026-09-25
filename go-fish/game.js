/* DOM presentation, paced turn events and accessible two-tap controls. */
class GoFishGame {
  constructor(root, options={}) {
    this.root=root;this.M=GoFishModel;this.random=options.random||Math.random;
    this.analytics=options.analytics||(()=>{});this.delay=options.delay??1700;
    this.names=['You','Sarah','Alex'];this.selected=null;this.epoch=0;
    try { this.storage=options.storage??localStorage;this.taught=this.storage.getItem('go-fish:tutorial')==='done'; } catch { this.taught=false; }
    root.innerHTML=`<div class="gf-toolbar"><span class="gf-chip">YOU + 2 COMPUTER PLAYERS</span><button data-gf="restart" class="gf-small">New game</button></div>
      <div class="gf-layout"><div class="gf-table"><div class="gf-guidance" data-gf="guidance" role="status" aria-live="polite"><strong data-gf="headline"></strong><span data-gf="instruction"></span></div><div class="gf-opponents" data-gf="opponents"></div>
      <div class="gf-center"><div class="gf-stock"><div class="gf-back gf-deck" aria-hidden="true">✦</div><strong data-gf="deck"></strong></div>
      <div class="gf-announcement"><span class="gf-turn" data-gf="turn"></span><p data-gf="message" role="status" aria-live="polite" aria-atomic="true"></p></div></div>
      <div class="gf-flight" data-gf="flight" aria-hidden="true"></div>
      <div class="gf-player-heading"><h2>Your hand <span data-gf="count"></span></h2><span data-gf="score"></span></div>
      <div class="gf-tutorial" data-gf="tutorial"><span data-gf="lesson"></span><button data-gf="skip">Skip tips</button></div>
      <p class="gf-prompt" data-gf="prompt"></p><div class="gf-hand" data-gf="hand" role="group" aria-label="Your cards, grouped by rank"></div>
      <div class="gf-books" data-gf="books" aria-label="Your completed books"></div>
      <section class="gf-result" data-gf="result" hidden aria-labelledby="gf-result-title"><span class="gf-trophy" aria-hidden="true">✦</span><h2 id="gf-result-title" tabindex="-1"></h2><div data-gf="scores"></div><button data-gf="again" class="gf-primary">Play Again</button><a href="../#games">Explore more PuzzleTen games →</a></section></div>
      <aside class="gf-log" aria-labelledby="gf-log-title"><h2 id="gf-log-title">Around the table</h2><p class="gf-log-intro">The latest action first. Follow every ask and catch.</p><ol data-gf="log"></ol></aside></div>
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
    this.selected=null;this.busy=false;this.started=false;this.ended=false;this.history=[];
    this.$('result').hidden=true;this.$('flight').className='gf-flight';this.$('log').replaceChildren();
    this.render();this.say('Your turn! Pick a rank, then ask Sarah or Alex.');
    this.$('hand').classList.remove('gf-deal');void this.$('hand').offsetWidth;this.$('hand').classList.add('gf-deal');
  }
  focusRank(){this.$('hand').querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
  select(r){
    if(this.busy||this.state.turn!==0||this.state.status!=='playing')return;
    if(!this.M.ranks(this.state.hands[0]).includes(r))return;
    this.selected=r;
    if(!this.started){this.started=true;this.emit('game_start');}
    this.render();
    this.$('hand').querySelector('[data-rank="'+r+'"]')?.focus({preventScroll:true});
    this.$('message').textContent='Choose a player to ask for '+this.M.RANKS[r]+'s.';
  }
  play(target){
    if(this.busy||this.state.turn!==0||this.selected===null||this.$('confirm').open)return;
    const r=this.selected;
    if((!this.state.hands[target]?.length&&!this.state.deck.length)||target===0)return;
    this.finishTutorial();this.selected=null;this.run(target,r);
  }
  say(text){
    this.$('message').textContent=text;
    this.history.unshift(text);this.history=this.history.slice(0,10);
    this.$('log').replaceChildren(...this.history.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  }
  destroy(){this.epoch++;}
  render(){
    this.$('hand').classList.remove('gf-deal');
    const s=this.shown, ready=!this.busy&&s.turn===0&&s.status==='playing';
    this.$('guidance').classList.toggle('is-yours',ready);
    this.$('hand').classList.toggle('is-ready',ready);
    this.$('headline').textContent=s.status==='finished'?'Game complete':ready?'Your turn':s.turn===0?'Your turn · cards are moving':this.names[s.turn]+'’s turn';
    this.$('instruction').textContent=s.status==='finished'?'See the final scores below.':ready?(this.selected===null?'1. Click or tap a card rank in your hand ↓':'2. Click Sarah or Alex to ask for '+this.M.RANKS[this.selected]+'s.'):(s.turn===0?'Watch what happens — your cards will unlock in a moment.':'Watch '+this.names[s.turn]+' play. No need to click yet.');
    this.$('opponents').innerHTML=[1,2].map(p=>`<button class="gf-opponent ${s.turn===p?'is-turn':''} ${ready&&this.selected!==null?'can-ask':''}" data-target="${p}" ${!ready||this.selected===null||(!s.hands[p].length&&!s.deck.length)?'disabled':''} aria-label="Ask ${this.names[p]}${this.selected!==null?' for '+this.M.RANKS[this.selected]+'s':''}. ${s.hands[p].length} cards, ${s.books[p].length} books"><span class="gf-avatar" aria-hidden="true">${p===1?'☀':'✿'}</span><strong>${this.names[p]}</strong><span class="gf-seat-status">${s.turn===p?'Playing now':ready&&this.selected!==null?'Click to ask':'Waiting'}</span><span class="gf-fan" aria-hidden="true">${Array.from({length:Math.min(5,s.hands[p].length)},()=>'<i class="gf-back">✦</i>').join('')}</span><span>${s.hands[p].length} cards · <b>${s.books[p].length} books</b></span><span class="gf-mini-books">${s.books[p].length?s.books[p].map(r=>this.M.RANKS[r]).join(' · '):'No books yet'}</span>${ready&&this.selected!==null&&(s.hands[p].length||s.deck.length)?'<span class="gf-ask-label">Ask for '+this.M.RANKS[this.selected]+'s →</span>':''}</button>`).join('');
    this.$('deck').textContent=s.deck.length+' cards left';
    this.$('deck').previousElementSibling.classList.toggle('is-empty',!s.deck.length);
    this.$('turn').textContent=s.status==='finished'?'ALL BOOKS COLLECTED':s.turn===0?'YOUR TURN':this.names[s.turn].toUpperCase()+"’S TURN";
    this.$('count').textContent='('+s.hands[0].length+' cards)';
    this.$('score').textContent=s.books[0].length+' / 13 books';
    const rs=this.M.ranks(s.hands[0]);
    this.$('hand').innerHTML=rs.map((r,i)=>{
      const cards=s.hands[0].filter(c=>this.M.rank(c)===r).sort((a,b)=>a-b);
      return `<button class="gf-rank ${this.selected===r?'is-selected':''} ${!this.taught&&ready&&this.selected===null&&i===0?'is-guide':''}" data-rank="${r}" aria-pressed="${this.selected===r}" aria-label="${this.M.RANKS[r]}, ${cards.length} ${cards.length===1?'card':'cards'}: ${cards.map(c=>['spades','hearts','diamonds','clubs'][Math.floor(c/13)]).join(', ')}" ${ready?'':'disabled'}><span class="gf-card-top">${this.M.RANKS[r]}<small>×${cards.length}</small></span><span class="gf-suits">${cards.map(c=>`<span class="${[1,2].includes(Math.floor(c/13))?'gf-red':''}">${this.M.SUITS[Math.floor(c/13)]}</span>`).join('')}</span><span class="gf-card-bottom" aria-hidden="true">${this.M.RANKS[r]}</span></button>`;
    }).join('')||'<p class="gf-empty-hand">No cards in hand. You’ll draw up to five on your next turn if the deck has cards.</p>';
    this.$('books').innerHTML=s.books[0].length?'<span>Your books</span>'+s.books[0].map(r=>`<span class="gf-book">${this.M.RANKS[r]} <small>♠ ♥ ♦ ♣</small></span>`).join(''):'<span>Collect all four suits of a rank to make a book.</span>';
    this.$('tutorial').hidden=this.taught||!ready;
    this.$('lesson').textContent=this.selected===null?'1. Pick a card rank ↓':'2. Ask them for it ↑';
    this.$('prompt').textContent=ready?(this.selected===null?'Choose a rank from your hand.':'Selected '+this.M.RANKS[this.selected]+'s — choose Sarah or Alex above.'):(s.status==='finished'?'Well played!':s.turn===0?'Cards are moving — please wait.':this.names[s.turn]+' is playing. Your cards are paused.');
  }
  eventDelay(type){
    return this.delay*({ask:1.15,fish:.9,draw:1.15,transfer:1.2,book:1.4,refill:1.1}[type]||1);
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
      this.shown=e.view;this.render();
      const rank=this.M.RANKS[e.rank],who=this.names[e.player];
      if(e.type==='ask')this.say(`${who=== 'You'?'You asked':who+' asked'} ${e.target===0?'you':this.names[e.target]}: “Do you have any ${rank}s?”`);
      if(e.type==='fish')this.say(`${e.target===0?'You said':this.names[e.target]+' said'} “Go Fish!”`);
      if(e.type==='transfer'){
        this.say(`${this.names[e.target]} gave ${p===0?'you':who} ${rank}. ${p===0?'You get':who+' gets'} another go!`);
        this.fly(e.target,p,e.count+' × '+rank);
      }
      if(e.type==='draw'){
        this.say(e.again?`Nice catch! ${p===0?'You drew':who+' drew'} a ${rank} — ask again!`:p===0?`You drew ${this.M.RANKS[this.M.rank(e.card)]}${this.M.SUITS[Math.floor(e.card/13)]}. Your turn is over.`:`${who} took a card from the deck. Their turn is over.`);
        this.fly(-1,p,e.again||p===0?this.M.RANKS[this.M.rank(e.card)]:'✦');
      }
      if(e.type==='empty')this.say('The deck is empty. No card to draw — turn passes.');
      if(e.type==='book'){
        this.say(`Book complete! ${who=== 'You'?'You collected':who+' collected'} all four ${rank}s. ✦`);
        this.fly(e.player,e.player,rank+' ♠♥♦♣',true);this.emit('book_complete',{player:e.player,rank,score:e.view.books[e.player].length});
      }
      if(e.type==='refill'){this.say(`${who=== 'You'?'You draw':who+' draws'} ${e.count} cards for a fresh hand.`);this.fly(-1,e.player,'+'+e.count);}
      if(e.type==='finish'||e.type==='turn')continue;
      if(!await this.wait(this.eventDelay(e.type),epoch))return;
    }
    this.$('flight').className='gf-flight';
    this.shown=this.M.view(this.state);this.busy=false;this.render();
    if(this.state.status==='finished'){this.finish();return;}
    if(this.state.turn===0){this.$('message').textContent='Your turn! Choose a rank, then an opponent.';this.focusRank();}
    else {
      this.busy=true;this.render();
      this.$('message').textContent=this.names[this.state.turn]+' is thinking about who to ask…';
      if(!await this.wait(this.delay,epoch))return;
      this.busy=false;
      const move=this.M.choose(this.state,this.random);
      if(move)this.run(move.target,move.rank);
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
    this.say(title+' '+scores.map((n,p)=>this.names[p]+' — '+n+' books').join('. '));
    this.root.querySelector('#gf-result-title').focus({preventScroll:true});
    this.$('result').scrollIntoView({block:'nearest',behavior:'instant'});
    this.emit('game_over',{score:scores[0],moves:this.state.moves,result:winners.length>1?'tie':winners[0]===0?'win':'loss'});
  }
}
