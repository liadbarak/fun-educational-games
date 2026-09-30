(function(){'use strict';
const $=id=>document.getElementById(id);let state,auto=false,busy=false,timer=null,started=false,generation=0;
const suits=['♠','♥','♦','♣'],ranks={11:'J',12:'Q',13:'K',14:'A'};
function analytics(name,extra={}){if(typeof track==='function')track(name,{game_name:'war_card_game',...extra});}
function paintCard(id,card){const el=$(id);el.className='playing-card'+(card?' revealed':' back')+(card&&(card.suit===1||card.suit===2)?' red':'');el.textContent=card?(ranks[card.rank]||card.rank)+' '+suits[card.suit]:'✦';if(card&&!matchMedia('(prefers-reduced-motion: reduce)').matches)el.animate([{transform:'scaleX(.3)',opacity:.5},{transform:'scaleX(1)',opacity:1}],{duration:250});el.setAttribute('aria-label',card?(ranks[card.rank]||card.rank)+' of '+['spades','hearts','diamonds','clubs'][card.suit]:'Face-down card');}
function counts(){ $('you-count').textContent=state.hands[0].length; $('cpu-count').textContent=state.hands[1].length;$('pot').textContent=state.pile.length+' cards in the middle';$('rounds').textContent='Flips: '+state.rounds+' · Wars: '+state.wars;}
function controls(){
 $('flip').disabled=busy||auto||state.winner!==null;
 const gesture=matchMedia('(pointer: coarse)').matches?'Tap':'Click';
 $('flip').textContent='👆 '+gesture+(started?' to flip the next cards':' to flip your first cards');
 $('flip').classList.toggle('ready',!busy&&!auto&&state.winner===null);
 $('auto').textContent=auto?'Stop Auto Play':'Auto Play';$('auto').setAttribute('aria-pressed',String(auto));$('auto').disabled=state.winner!==null;
 $('flip').hidden=busy||auto||state.winner!==null;
 $('flip').parentElement.classList.toggle('waiting',busy||auto||state.winner!==null);
}
function stop(){auto=false;clearTimeout(timer);timer=null;controls();}
function say(title,detail){$('action').textContent=title;$('detail').textContent=detail;}
function reset(){generation++;clearTimeout(timer);auto=false;busy=false;started=false;state=WarModel.create();paintCard('you-card');paintCard('cpu-card');say('Ready for your first card?','One tap flips both cards.');$('stakes').replaceChildren();$('table').classList.remove('war');$('restart').textContent='New Game';$('restart').classList.remove('primary');counts();controls();}
const rankName=card=>({11:'Jack',12:'Queen',13:'King',14:'Ace'}[card.rank]||String(card.rank));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function flip(){
 if(busy||state.winner!==null)return;
 busy=true;const turn=generation;
 const wait=async ms=>{await pause(ms);return turn===generation;};
 if(!started){started=true;analytics('game_start');}controls();
 do {
  const before=state.hands.map(h=>h.length);
  if(state.war){
   const down=state.hands.map(h=>Math.min(3,Math.max(0,h.length-1)));
   $('stakes').replaceChildren();
   for(let p=0;p<2;p++){const stack=document.createElement('span');stack.textContent=(p===0?'You: ':'Computer: ')+(down[p]?'▰ '.repeat(down[p]):'No spare cards');$('stakes').append(stack);}
   say('⚔️ It’s WAR!',down[0]===down[1]?down[0]+' cards down each…':'You: '+down[0]+' down · Computer: '+down[1]+' down');
   if(!await wait(900))return;
   say('Battle card!','Revealing both cards automatically…');
   if(!await wait(500))return;
  }else{$('stakes').replaceChildren();say('Cards up!','Let’s see who wins.');}
  const event=WarModel.step(state);
  paintCard('you-card',event.cards[0]);paintCard('cpu-card',event.cards[1]);
  $('table').classList.toggle('war',state.war);
  if(!await wait(300))return;
  if(event.redeal){counts();say('An even finish — play on!','Both decks ran out. The tied pile is split equally.');if(!await wait(1000))return;}
  else if(state.war){counts();say('⚔️ Tie! It’s WAR!','Matching ranks — watch the next battle.');if(!await wait(1000))return;}
  else {
   const winner=event.winner;
   const comparison=event.cards[0]&&event.cards[1]&&event.cards[0].rank!==event.cards[1].rank?rankName(event.cards[winner])+' beats '+rankName(event.cards[1-winner]):'Opponent has no cards left to battle.';
   say(winner===0?(event.wasWar?'🎉 You won the WAR!':'🎉 You win this round!'):(event.wasWar?'Computer wins the WAR':'Computer wins this round'),comparison);
   if(!await wait(850))return;
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const target=document.querySelector(winner===0?'#you-count':'#cpu-count').getBoundingClientRect();
    for(const id of ['you-card','cpu-card']){const el=$(id),rect=el.getBoundingClientRect();el.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate('+(target.x+target.width/2-rect.x-rect.width/2)+'px,'+(target.y-rect.y)+'px) scale(.25)',opacity:0}],{duration:450});}
   }
   if(!await wait(450))return;
   counts();
   $('detail').textContent=comparison+' · '+(winner===0?'You':'Computer')+': '+before[winner]+' → '+state.hands[winner].length+' cards';
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches)$(winner===0?'you-count':'cpu-count').animate([{background:'#ffe697',transform:'scale(1.2)'},{background:'transparent',transform:'scale(1)'}],{duration:650});
  }
 }while(state.war);
 if(state.winner!==null){say(state.winner===0?'You Win! 🎉':'Computer Wins','All 52 cards collected. Play again?');$('restart').textContent='Play Again';$('restart').classList.add('primary');auto=false;analytics('game_over',{winner:state.winner===0?'player':'computer',rounds:state.rounds});}
 busy=false;controls();if(auto&&state.winner===null)timer=setTimeout(flip,1000);
}
$('flip').addEventListener('click',flip);
$('auto').addEventListener('click',()=>{if(auto)stop();else{auto=true;controls();if(!busy)flip();}});
$('restart').addEventListener('click',reset);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reset();analytics('game_view');
})();
