/* Original Dino Nestkeepers rules. Pure state; no DOM, timers or storage. */
const DinoModel = (() => {
  const species = Object.freeze([
    {name:'T-Rex',color:'#86b577',symbol:'●',pattern:'spots',kind:'rex'},
    {name:'Brachiosaurus',color:'#77b6c6',symbol:'≋',pattern:'waves',kind:'brach'},
    {name:'Triceratops',color:'#d9b369',symbol:'▲',pattern:'triangles',kind:'tric'},
    {name:'Stegosaurus',color:'#b298d1',symbol:'◆',pattern:'diamonds',kind:'stego'},
    {name:'Ankylosaurus',color:'#d39b81',symbol:'+',pattern:'crosses',kind:'anky'}
  ].map(Object.freeze));
  function create(){return {score:0,lives:3,hatched:0,streak:0,progress:[0,0,0,0,0],active:3,eggs:[],nextId:1,elapsed:0,spawnClock:0,correct:0,wrong:0,missed:0,status:'playing'};}
  const speed=s=>Math.min(17,8+s.hatched*.7);
  const interval=s=>Math.max(1.7,3.5-s.hatched*.12);
  function spawn(s,random=Math.random,type){
    if(s.status!=='playing'||s.eggs.length>=3)return null;
    type=type===undefined?Math.floor(random()*s.active):type;
    if(!Number.isInteger(type)||type<0||type>=s.active)return null;
    // Four fixed lanes prevent newborn eggs from overlapping a held egg.
    const lanes=[15,38,62,85].filter(x=>!s.eggs.some(e=>e.y<24&&Math.abs(e.x-x)<18));
    if(!lanes.length)return null;
    const egg={id:s.nextId++,type,x:lanes[Math.floor(random()*lanes.length)],y:0};s.eggs.push(egg);return egg;
  }
  function drop(s,id,nest){
    if(s.status!=='playing'||!Number.isInteger(nest)||nest<0||nest>=s.active)return null;
    const index=s.eggs.findIndex(e=>e.id===id);if(index<0)return null;
    const egg=s.eggs.splice(index,1)[0];
    if(nest!==egg.type){s.lives--;s.wrong++;s.streak=0;if(s.lives===0)s.status='over';return {kind:'wrong',type:egg.type,points:0};}
    s.correct++;s.streak++;const points=10+(s.streak>=3?5:0);s.score+=points;s.progress[nest]++;
    let hatch=false,unlocked=null;
    if(s.progress[nest]===3){hatch=true;s.progress[nest]=0;s.hatched++;s.score+=50;const next=s.hatched>=6?5:s.hatched>=3?4:3;if(next>s.active){unlocked=next-1;s.active=next;}}
    return {kind:'correct',type:egg.type,points:points+(hatch?50:0),hatch,unlocked};
  }
  function step(s,dt,held=null,random=Math.random){
    if(s.status!=='playing'||!Number.isFinite(dt)||dt<=0)return [];
    dt=Math.min(dt,.1);s.elapsed+=dt;s.spawnClock+=dt;const missed=[];
    for(const egg of [...s.eggs]){
      if(egg.id!==held)egg.y+=speed(s)*dt;
      if(egg.y>=100){s.eggs=s.eggs.filter(e=>e.id!==egg.id);s.lives--;s.missed++;s.streak=0;missed.push(egg.id);if(s.lives===0){s.status='over';break;}}
    }
    if(s.spawnClock>=interval(s)){s.spawnClock=0;spawn(s,random);}
    return missed;
  }
  function preferences(raw){
    let p;try{p=JSON.parse(raw);}catch{}
    if(!p||p.version!==1)return {version:1,best:0,tutorialDone:false,discovered:[]};
    return {version:1,best:Number.isSafeInteger(p.best)&&p.best>=0?p.best:0,tutorialDone:p.tutorialDone===true,discovered:[...new Set(Array.isArray(p.discovered)?p.discovered.filter(i=>Number.isInteger(i)&&i>=0&&i<species.length):[])]};
  }
  return {species,create,speed,interval,spawn,drop,step,preferences};
})();
if(typeof module!=='undefined')module.exports=DinoModel;
