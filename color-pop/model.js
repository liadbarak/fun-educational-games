/* Original Color Pop rules and geometry. No browser dependency. */
const ColorPopModel = (() => {
  const W=420, H=620, R=20, DY=Math.sqrt(3)*R, TOP=24, DANGER=476, LAUNCH={x:210,y:568};
  const key=(r,c)=>r+','+c;
  function valid(r,c,phase=0){return r>=0&&r<18&&c>=0&&c<10-((r+phase)%2);}
  function center(r,c,phase=0){return {x:R+c*2*R+((r+phase)%2)*R,y:TOP+r*DY};}
  function neighbors(r,c,phase=0){
    const odd=(r+phase)%2;
    return [[r,c-1],[r,c+1],[r-1,c-(odd?0:1)],[r-1,c+(odd?1:0)],[r+1,c-(odd?0:1)],[r+1,c+(odd?1:0)]].filter(([a,b])=>valid(a,b,phase));
  }
  function colors(s){return [...new Set([...s.board.values()].map(b=>b.color))];}
  function pick(s,random=Math.random){const options=colors(s);return options[Math.floor(random()*options.length)]??0;}
  function makeRow(s,row,random,count){
    for(let c=0;valid(row,c,s.phase);c++){
      const near=neighbors(row,c,s.phase).map(([r,c])=>s.board.get(key(r,c))).filter(Boolean);
      const color=near.length&&random()<.46?near[Math.floor(random()*near.length)].color:Math.floor(random()*count);
      s.board.set(key(row,c),{r:row,c,color});
    }
  }
  function create(level=1,random=Math.random,score=0){
    const s={board:new Map(),phase:0,level,score,cleared:0,goal:Math.min(75,30+(level-1)*5),misses:0,combo:0,status:'playing',colorCount:level>=4?6:5};
    const rows=Math.min(8,5+Math.floor((level-1)/2));
    for(let r=0;r<rows;r++)makeRow(s,r,random,s.colorCount);
    // Original staggered lower edge, with no floating starting bubbles.
    if(level>1)for(let c=0;valid(rows,c,s.phase);c++)if((c+level)%3!==0){const parent=s.board.get(key(rows-1,Math.min(c,8)));s.board.set(key(rows,c),{r:rows,c,color:parent.color});}
    s.current=pick(s,random);s.next=pick(s,random);return s;
  }
  function cluster(s,start,same=false){
    const first=s.board.get(start);if(!first)return [];
    const seen=new Set([start]),queue=[first];
    for(let i=0;i<queue.length;i++)for(const [r,c] of neighbors(queue[i].r,queue[i].c,s.phase)){
      const k=key(r,c),b=s.board.get(k);
      if(b&&!seen.has(k)&&(!same||b.color===first.color)){seen.add(k);queue.push(b);}
    }
    return queue;
  }
  function detached(s){
    const connected=new Set();
    for(const b of s.board.values())if(b.r===0&&!connected.has(key(b.r,b.c)))for(const n of cluster(s,key(b.r,b.c)))connected.add(key(n.r,n.c));
    return [...s.board.values()].filter(b=>!connected.has(key(b.r,b.c)));
  }
  function descend(s,random){
    s.phase=1-s.phase;
    s.board=new Map([...s.board.values()].map(b=>{const n={...b,r:b.r+1};return [key(n.r,n.c),n];}));
    makeRow(s,0,random,s.colorCount);s.misses=0;
  }
  function resolve(s,cell,random=Math.random){
    if(s.status!=='playing')return null;
    if(!cell||!valid(cell.r,cell.c,s.phase)||s.board.has(key(cell.r,cell.c))){s.status='lost';return {popped:[],dropped:[],points:0};}
    const b={r:cell.r,c:cell.c,color:s.current};s.board.set(key(b.r,b.c),b);
    let popped=cluster(s,key(b.r,b.c),true),dropped=[];
    if(popped.length>=3){
      popped.forEach(b=>s.board.delete(key(b.r,b.c)));dropped=detached(s);dropped.forEach(b=>s.board.delete(key(b.r,b.c)));s.combo++;
    }else{popped=[];s.combo=0;s.misses++;}
    const points=popped.length*10+dropped.length*20+(popped.length?Math.max(0,s.combo-1)*15:0);
    s.score+=points;s.cleared+=popped.length+dropped.length;
    let descended=false;
    if(s.cleared>=s.goal||s.board.size===0)s.status='won';
    else{
      if(s.misses>=5){descend(s,random);descended=true;}
      if([...s.board.values()].some(b=>center(b.r,b.c,s.phase).y+R>=DANGER))s.status='lost';
    }
    // Never leave an unmatchable color in the launcher after its last bubble disappears.
    const available=colors(s);s.current=available.includes(s.next)?s.next:pick(s,random);s.next=pick(s,random);
    return {popped,dropped,points,descended};
  }
  function trace(s,angle){
    angle=Math.max(-Math.PI+.22,Math.min(-.22,angle));
    let p={...LAUNCH},dx=Math.cos(angle),dy=Math.sin(angle);const path=[{...p}];
    for(let bounce=0;bounce<12;bounce++){
      let distance=(TOP-p.y)/dy,type='top',hit=null;
      const wall=(dx>0?(W-R-p.x)/dx:(R-p.x)/dx);
      if(wall>1e-6&&wall<distance){distance=wall;type='wall';}
      for(const b of s.board.values()){
        const q=center(b.r,b.c,s.phase),ox=p.x-q.x,oy=p.y-q.y,proj=ox*dx+oy*dy;
        const disc=proj*proj-(ox*ox+oy*oy-4*R*R);
        if(disc>=0){const t=-proj-Math.sqrt(disc);if(t>=-.001&&t<distance){distance=Math.max(0,t);type='bubble';hit=b;}}
      }
      p={x:p.x+dx*distance,y:p.y+dy*distance};path.push({...p});
      if(type==='wall'){dx=-dx;continue;}
      const candidates=hit?neighbors(hit.r,hit.c,s.phase):Array.from({length:10},(_,c)=>[0,c]).filter(([r,c])=>valid(r,c,s.phase));
      const empty=candidates.filter(([r,c])=>!s.board.has(key(r,c))).map(([r,c])=>({r,c,...center(r,c,s.phase)}));
      empty.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
      return {path,cell:empty[0]||null};
    }
    return {path,cell:null};
  }
  return {W,H,R,DY,TOP,DANGER,LAUNCH,key,valid,center,neighbors,colors,pick,create,cluster,detached,resolve,trace,descend};
})();
if(typeof module!=='undefined')module.exports=ColorPopModel;
