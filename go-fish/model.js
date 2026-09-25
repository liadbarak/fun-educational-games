/* Go Fish rules. Card ids 0..51 encode rank (id % 13) and suit (id / 13).
   AI knowledge comes only from public requests, transfers and completed books. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GoFishModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const SUITS = ['♠','♥','♦','♣'];
  const rank = card => card % 13;
  const ranks = hand => [...new Set(hand.map(rank))].sort((a,b) => a-b);
  const view = s => ({hands:s.hands.map(h=>h.slice()), books:s.books.map(b=>b.slice()), deck:s.deck.slice(), turn:s.turn, status:s.status});
  function event(s, events, type, data={}) { events.push({type,...data,view:view(s)}); }
  function collect(s, player, events) {
    for (const r of ranks(s.hands[player])) {
      if (s.hands[player].filter(c=>rank(c)===r).length !== 4) continue;
      s.hands[player] = s.hands[player].filter(c=>rank(c)!==r);
      s.books[player].push(r);
      for (const k of s.known) k[r] = false;
      event(s,events,'book',{player,rank:r});
    }
  }
  function prepare(s, events) {
    if (s.books.reduce((n,b)=>n+b.length,0)===13 || (!s.deck.length && s.hands.every(h=>!h.length))) {
      s.status='finished'; event(s,events,'finish'); return;
    }
    // At most three seats are skipped. Drawing a book can empty a new hand,
    // so refill again while stock remains before deciding this seat sits out.
    for (let seats=0;seats<3;seats++) {
      while (!s.hands[s.turn].length && s.deck.length) {
        const cards=s.deck.splice(Math.max(0,s.deck.length-5));
        s.hands[s.turn].push(...cards);
        event(s,events,'refill',{player:s.turn,count:cards.length});
        collect(s,s.turn,events);
      }
      if (s.hands[s.turn].length) return;
      s.turn=(s.turn+1)%3;
    }
    s.status='finished'; event(s,events,'finish');
  }
  function create(random=Math.random) {
    const deck=Array.from({length:52},(_,i)=>i);
    for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    const s={deck,hands:[[],[],[]],books:[[],[],[]],known:[{},{},{}],turn:0,status:'playing',moves:0};
    for(let n=0;n<5;n++) for(let p=0;p<3;p++) s.hands[p].push(deck.pop());
    const events=[];
    for(let p=0;p<3;p++) collect(s,p,events);
    prepare(s,events);
    return s;
  }
  function ask(s, player, target, r) {
    if(s.status!=='playing'||player!==s.turn||!Number.isInteger(target)||target<0||target>2||target===player||(!s.hands[target].length&&!s.deck.length)||!ranks(s.hands[player]).includes(r)) return null;
    const events=[];
    s.moves++;
    s.known[player][r]=true;
    event(s,events,'ask',{player,target,rank:r});
    const cards=s.hands[target].filter(c=>rank(c)===r);
    let again=false;
    if(cards.length){
      s.hands[target]=s.hands[target].filter(c=>rank(c)!==r);
      s.hands[player].push(...cards);
      s.known[target][r]=false;
      again=true;
      event(s,events,'transfer',{player,target,rank:r,count:cards.length});
    } else {
      s.known[target][r]=false;
      event(s,events,'fish',{player,target,rank:r});
      if(s.deck.length){
        const card=s.deck.pop();s.hands[player].push(card);again=rank(card)===r;
        // A matching draw is publicly announced; other drawn cards stay private.
        if(again) s.known[player][r]=true;
        event(s,events,'draw',{player,rank:r,card,again});
      } else event(s,events,'empty',{player});
    }
    collect(s,player,events);
    if(!again) s.turn=(player+1)%3;
    prepare(s,events);
    event(s,events,'turn',{player:s.turn,again:again&&s.turn===player});
    return events;
  }
  function choose(s, random=Math.random) {
    const p=s.turn, hand=s.hands[p], choices=[];
    for(const r of ranks(hand)) for(let target=0;target<3;target++) {
      if(target===p||(!s.hands[target].length&&!s.deck.length)) continue;
      const known=s.known[target][r];
      // Public clues are useful, but older "no" answers can become stale.
      const score=(known===true?10:known===false?-2:0)+hand.filter(c=>rank(c)===r).length*.2;
      choices.push({target,rank:r,score});
    }
    if(!choices.length) return null;
    const best=Math.max(...choices.map(c=>c.score));
    // Exploration avoids repeatedly trusting a stale absence after private draws.
    const pool=random()<.18?choices:choices.filter(c=>c.score===best);
    const choice=pool[Math.floor(random()*pool.length)];
    return {target:choice.target,rank:choice.rank};
  }
  return {RANKS,SUITS,rank,ranks,create,ask,choose,view};
});
