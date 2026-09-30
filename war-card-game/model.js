(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WarModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function shuffle(cards,random=Math.random){for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
function create(random=Math.random){const deck=shuffle(Array.from({length:52},(_,id)=>({id,rank:2+id%13,suit:Math.floor(id/13)})),random);return {hands:[deck.slice(0,26),deck.slice(26)],pile:[],war:false,winner:null,rounds:0,wars:0};}
function finish(state,winner,random){state.hands[winner].push(...shuffle(state.pile.splice(0),random));state.war=false;if(!state.hands[1-winner].length)state.winner=winner;}
function step(state,random=Math.random){
 if(state.winner!==null)return null;
 const down=[0,0];const wasWar=state.war;
 if(wasWar){for(let p=0;p<2;p++){down[p]=Math.min(3,Math.max(0,state.hands[p].length-1));state.pile.push(...state.hands[p].splice(0,down[p]));}}
 const cards=state.hands.map(hand=>hand.shift()||null);state.pile.push(...cards.filter(Boolean));state.rounds++;
 let winner=null;
 if(!cards[0]||!cards[1]){if(cards[0])winner=0;else if(cards[1])winner=1;else { // Both exhausted on a tie: redeal the tied pot and continue.
 const pot=shuffle(state.pile.splice(0),random);pot.forEach((card,i)=>state.hands[i%2].push(card));state.war=false;return {cards,down,redeal:true,wasWar,pot:pot.length};}}
 else if(cards[0].rank!==cards[1].rank)winner=cards[0].rank>cards[1].rank?0:1;
 const pot=state.pile.length;
 if(winner!==null)finish(state,winner,random);else{state.war=true;state.wars++;if(!state.hands[0].length&&state.hands[1].length){winner=1;finish(state,1,random);}else if(!state.hands[1].length&&state.hands[0].length){winner=0;finish(state,0,random);}}
 return {cards,down,winner,pot,tie:winner===null,wasWar};
}
return {create,step,shuffle};});
