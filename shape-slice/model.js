(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./geometry')):factory(root.SliceGeometry);if(typeof module==='object'&&module.exports)module.exports=api;else root.SliceModel=api;})(typeof globalThis!=='undefined'?globalThis:this,G=>{
  const clamp=v=>Math.max(0,Math.min(100,v));
  function evaluate(puzzle,a,b){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==2||b.length!==2||![...a,...b].every(Number.isFinite)||G.distance(a,b)<12)return {pass:false,message:'Draw a longer line across the shape.',pieces:[],quality:0};
    const raw=G.line(a,b),l=['sides','rectangles','equalTriangles'].includes(puzzle.kind)?G.snap(puzzle.kind==='rectangles'?G.align(raw,puzzle.polygons[0]):raw,puzzle.polygons):raw,splits=puzzle.polygons.map(p=>G.split(p,l));
    const pieces=splits.flatMap((pair,i)=>(pair||[puzzle.polygons[i]]).map((poly,j)=>({poly,source:i,side:pair?(j===0?1:-1):0})));
    const base={line:l,pieces,quality:0,pass:false,metric:'',ratios:splits.map(pair=>pair?pair.map(G.area).map(v=>v/pair.reduce((n,p)=>n+G.area(p),0)):null)};
    const expected=puzzle.kind==='only'?[puzzle.active]:puzzle.polygons.map((_,i)=>i);
    if(expected.some(i=>!splits[i]))return {...base,message:'Cross the shape, not just an edge or corner.'};
    if((puzzle.zones||[]).some(z=>G.split(z,l)))return {...base,message:'The cut crossed red. Try a different route.',blocked:true};
    if(puzzle.kind==='only'&&splits.some((s,i)=>i!==puzzle.active&&s))return {...base,message:'Leave the pale shape uncut.',blocked:true};
    const pair=splits[expected[0]],counts=pair.map(p=>G.clean(p).length).sort((a,b)=>a-b);
    let pass=false,quality=100,metric='',message='';
    if(puzzle.kind==='sides'){pass=puzzle.one?counts.includes(puzzle.one):counts.join(',')===puzzle.counts.slice().sort((a,b)=>a-b).join(',');message=pass?'Those shapes fit perfectly.':`You made ${counts[0]}- and ${counts[1]}-sided pieces.`;}
    else if(puzzle.kind==='rectangles'){pass=pair.every(G.rectangle);message=pass?'Two rectangles. Nicely done!':'Rectangles need four right angles. Try a straighter edge-to-edge cut.';}
    else if(['area','doubleArea','equalTriangles'].includes(puzzle.kind)){
      const target=puzzle.ratio||.5;quality=Math.min(...expected.map(i=>clamp(100*(1-Math.abs(Math.min(...base.ratios[i])-target)/target))));pass=quality>=80;metric='Area accuracy';message=pass?'A well-balanced slice.':`Aim for ${Math.round(target*100)}% in the smaller piece.`;
      if(puzzle.kind==='equalTriangles'&&!counts.every(n=>n===3)){pass=false;message='Aim through corners to make two triangles.';}
    }else if(puzzle.kind==='symmetry'){quality=clamp(100*(1-G.symmetryError(puzzle.polygons[0],l)/(.25*G.span(puzzle.polygons[0]))));pass=quality>=85;metric='Symmetry';message=pass?'The pieces reflect across your cut.':'The pieces do not mirror yet. Adjust the angle or position.';}
    else if(puzzle.kind==='targets'){const distances=puzzle.targets.map(p=>Math.abs(G.signed(p,l)));quality=clamp(100*(1-Math.max(...distances)/40));pass=distances.every(d=>d<=8);metric='Target accuracy';message=pass?'Every target hit.':'Pass through the center of every dot.';}
    else if(puzzle.kind==='avoid'||puzzle.kind==='only'){pass=true;message=puzzle.kind==='only'?'Only the purple shape was sliced.':'A clean route around the red area.';}
    // Keep grading on full precision; rounding is for display only.
    const rounded=Math.round(quality*10)/10;
    const label=!pass?'TRY ANOTHER CUT':!metric?'SOLVED':quality>=99.95?'PERFECT CUT':quality>=95?'EXCELLENT CUT':quality>=85?'GREAT CUT':'SOLVED';
    return {...base,pass,quality:rounded,metric,message,label,counts};
  }
  function create(){return {score:0,streak:0,bestStreak:0,records:{}};}
  function award(state,id,result){
    const records={...state.records},previous=records[id];let streak=state.streak;
    if(!result.pass||result.quality<95)streak=0;else if(!previous)streak++;
    let delta=0;
    if(result.pass){const multiplier=previous?.multiplier||1+Math.min(4,Math.max(0,streak-1))*.1;const points=Math.round((result.metric?200+result.quality*3:200)*multiplier);if(!previous||points>previous.points){delta=points-(previous?.points||0);records[id]={points,multiplier};}}
    return {state:{score:state.score+delta,streak,bestStreak:Math.max(state.bestStreak,streak),records},delta};
  }
  return {evaluate,create,award};
});
