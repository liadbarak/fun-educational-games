/* Pure 4 × 4 garden rules. No DOM, timers, storage or assets. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CatMergeModel=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const SIZE=4, MAX=12;
  const NAMES=['Tiny Kitten','Playful Kitten','Curious Cat','Fluffy Cat','Fancy Cat','Trailblazer Cat','Wizard Cat','Royal Cat','Moonbeam Cat','Cosmic Cat','Phoenix Cat','Dreamkeeper'];
  function adjacent(a,b){return Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<16&&b<16&&Math.abs(Math.floor(a/4)-Math.floor(b/4))+Math.abs(a%4-b%4)===1;}
  function pairs(board){const found=[];board.forEach((v,a)=>{if(v&&v<MAX)for(let b=a+1;b<16;b++)if(board[b]===v&&adjacent(a,b))found.push([a,b]);});return found;}
  function status(board){return board.includes(MAX)?'won':board.includes(0)||pairs(board).length?'playing':'over';}
  function index(n,random){return Math.min(n-1,Math.max(0,Math.floor(random()*n)));}
  // Arrivals improve with the highest cat reached this round, never with a past collection.
  function next(highest,random){const cap=Math.max(1,Math.min(8,highest-3));return Math.max(1,cap-(random()<.7?0:1));}
  function create(random=Math.random){const board=Array(16).fill(0);[5,6,9,10,0,15].forEach(i=>board[i]=1);return {board,score:0,moves:0,merges:0,highest:1,next:next(1,random),status:'playing'};}
  function valid(state){return !!state&&Array.isArray(state.board)&&state.board.length===16&&state.board.every(v=>Number.isInteger(v)&&v>=0&&v<=MAX)&&Number.isSafeInteger(state.score)&&state.score>=0&&Number.isSafeInteger(state.moves)&&state.moves>=0&&Number.isSafeInteger(state.merges)&&state.merges>=0&&state.merges<=state.moves&&Number.isInteger(state.highest)&&state.highest>=Math.max(1,...state.board)&&state.highest<=MAX&&Number.isInteger(state.next)&&state.next>=1&&state.next<=Math.max(1,Math.min(8,state.highest-3))&&state.status===status(state.board)&&state.board.some(Boolean);}
  function act(state,from,to,random=Math.random){
    if(!valid(state)||state.status!=='playing'||!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>15||to<0||to>15||from===to||!state.board[from])return null;
    const rank=state.board[from], target=state.board[to];
    if(target&&(target!==rank||!adjacent(from,to)||rank===MAX))return null;
    const board=state.board.slice();board[from]=0;board[to]=target?rank+1:rank;
    const merged=!!target, points=merged?Math.pow(2,rank)*10:0, highest=Math.max(state.highest,board[to]);
    const merges=state.merges+(merged?1:0), breather=merged&&merges%3===0;
    let arrival=null;
    if(highest<MAX&&!breather){
      const empty=board.map((v,i)=>v===0?i:-1).filter(i=>i>=0);
      const friendly=empty.filter(i=>board.some((v,j)=>v===state.next&&adjacent(i,j)));
      const choices=friendly.length&&random()<.7?friendly:empty;
      const at=choices[index(choices.length,random)];board[at]=state.next;arrival={at,rank:state.next};
    }
    const result={board,score:state.score+points,moves:state.moves+1,merges,highest,next:next(highest,random),status:status(board)};
    return {state:result,merged,rank:board[to],points,arrival,breather,from,to};
  }
  return {SIZE,MAX,NAMES,adjacent,pairs,status,create,valid,act,next};
});
