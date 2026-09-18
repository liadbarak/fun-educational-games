/* Original canvas presentation; rules stay in model.js for independent tests. */
class ColorPopGame {
  constructor(root,options={}){
    this.root=root;this.random=options.random||Math.random;this.analytics=options.analytics||(()=>{});
    this.M=ColorPopModel;this.angle=-Math.PI/2;this.effects=[];this.raf=0;this.levelStartScore=0;
    this.palette=['#ed6588','#45bdae','#6589ed','#edb64e','#a378df','#ee8954'];
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.innerHTML=`<div class="cp-toolbar"><div><small>Score</small><strong data-cp="score">0</strong></div><div><small>Level</small><strong data-cp="level">1</strong></div><button data-cp="restart">Restart level</button></div>
    <div class="cp-goal"><span data-cp="goal"></span><progress data-cp="progress" value="0" max="30"></progress></div>
    <div class="cp-stage"><canvas width="420" height="620" tabindex="0" aria-label="Color Pop board. Left and right arrows aim; Space or Enter fires.">Use a browser with canvas support to play Color Pop.</canvas><div class="cp-overlay" data-cp="overlay" hidden><div><span class="cp-badge" aria-hidden="true">✦</span><h2 data-cp="title"></h2><p data-cp="result"></p><button data-cp="continue"></button></div></div></div>
    <p class="cp-status" data-cp="status" role="status" aria-live="polite">Aim for a group of the same color.</p>
    <div class="cp-controls"><button data-cp="left" aria-label="Aim left">↖</button><button data-cp="fire">Pop!</button><button data-cp="right" aria-label="Aim right">↗</button></div>
    <p class="cp-help">Aim, then release to fire. Match 3 or more. <span data-cp="pressure">5 misses until a new row.</span></p>
    <dialog data-cp="dialog"><h2>Restart this level?</h2><p>Your progress and points from this level will reset.</p><button data-cp="cancel">Keep playing</button><button data-cp="confirm">Restart level</button></dialog>`;
    this.canvas=root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');
    this.$('restart').onclick=()=>{cancelAnimationFrame(this.raf);this.raf=0;this.$('dialog').showModal();};
    this.$('dialog').addEventListener('close',()=>{if(this.shot||this.effects.length)this.animate();});
    this.$('cancel').onclick=()=>{this.$('dialog').close();};
    this.$('confirm').onclick=()=>{this.$('dialog').close();this.reset(this.state.level,this.levelStartScore);};
    this.$('continue').onclick=()=>{
      if(this.state.status==='won'){this.levelStartScore=this.state.score;this.reset(this.state.level+1,this.state.score);}
      else this.reset(this.state.level,this.levelStartScore);
      this.canvas.focus({preventScroll:true});
    };
    this.$('left').onclick=()=>this.aim(this.angle-.065);this.$('right').onclick=()=>this.aim(this.angle+.065);this.$('fire').onclick=()=>this.fire();
    this.canvas.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')this.aim(this.angle-.045);else if(e.key==='ArrowRight')this.aim(this.angle+.045);else this.fire();}
    });
    this.canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||this.pointer!==undefined||this.shot||this.state.status!=='playing')return;
      this.pointer=e.pointerId;this.canvas.setPointerCapture(e.pointerId);this.point(e);this.canvas.focus({preventScroll:true});
    });
    this.canvas.addEventListener('pointermove',e=>{if((this.pointer===e.pointerId||e.pointerType==='mouse')&&!this.shot)this.point(e);});
    this.canvas.addEventListener('pointerup',e=>{
      if(this.pointer!==e.pointerId)return;this.pointer=undefined;
      if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);
      const r=this.canvas.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){this.point(e);this.fire();}
    });
    this.canvas.addEventListener('pointercancel',()=>{this.pointer=undefined;});
    this.canvas.addEventListener('lostpointercapture',()=>{this.pointer=undefined;});
    this.onVisibility=()=>{if(document.hidden){cancelAnimationFrame(this.raf);this.raf=0;this.pointer=undefined;}else{this.lastFrame=performance.now();this.animate();}};
    document.addEventListener('visibilitychange',this.onVisibility);
    this.resize=new ResizeObserver(()=>this.size());this.resize.observe(this.canvas);
    this.reset(1,0);this.emit('game_view');
  }
  $(name){return this.root.querySelector('[data-cp="'+name+'"]');}
  emit(name,extra={}){try{this.analytics(name,{game_name:'color_pop',level:this.state.level,...extra});}catch{}}
  reset(level,score){
    cancelAnimationFrame(this.raf);this.raf=0;this.shot=null;this.effects=[];this.feedback=null;this.pointer=undefined;this.started=false;
    this.state=this.M.create(level,this.random,score);this.angle=-Math.PI/2;this.$('overlay').hidden=true;this.$('status').textContent='Aim for a group of the same color.';this.update();this.size();
  }
  size(){const d=Math.min(2,window.devicePixelRatio||1),w=this.canvas.clientWidth||420;this.canvas.width=Math.round(w*d);this.canvas.height=Math.round(w*620/420*d);this.draw();}
  point(e){const r=this.canvas.getBoundingClientRect(),x=(e.clientX-r.left)*420/r.width,y=(e.clientY-r.top)*620/r.height;this.aim(Math.atan2(Math.min(-12,y-568),x-210));}
  aim(angle){if(this.shot||this.state.status!=='playing')return;this.angle=Math.max(-Math.PI+.22,Math.min(-.22,angle));this.draw();}
  fire(){
    if(this.shot||this.state.status!=='playing'||this.$('dialog').open||document.hidden)return;
    if(!this.started){this.started=true;this.emit('game_start');}
    const route=this.M.trace(this.state,this.angle);this.shot={...route,segment:1,x:210,y:568,color:this.state.current};
    this.update();this.animate();
  }
  update(){
    const s=this.state;this.$('score').textContent=s.score.toLocaleString();this.$('level').textContent=s.level;
    this.$('goal').textContent=`Clear ${s.goal} bubbles · ${Math.min(s.goal,s.cleared)} / ${s.goal}`;this.$('progress').max=s.goal;this.$('progress').value=Math.min(s.goal,s.cleared);
    this.$('pressure').textContent=`${5-s.misses} ${5-s.misses===1?'miss':'misses'} until a new row.`;
    for(const k of ['fire','left','right'])this.$(k).disabled=!!this.shot||s.status!=='playing';
  }
  settle(){
    const shot=this.shot,phase=this.state.phase;this.shot=null;
    const result=this.M.resolve(this.state,shot.cell,this.random);if(!result)return;
    const now=performance.now();
    for(const b of result.popped)this.effects.push({...this.M.center(b.r,b.c,phase),color:b.color,type:'pop',born:now});
    for(const b of result.dropped)this.effects.push({...this.M.center(b.r,b.c,phase),color:b.color,type:'drop',born:now});
    if(result.points){this.feedback={born:now,big:result.dropped.length>=4};this.effects.push({x:shot.x,y:shot.y,type:'score',text:'+'+result.points,born:now});this.$('status').textContent=(this.state.combo>1?`Combo ×${this.state.combo}! `:'Nice match! ')+(result.dropped.length?`${result.dropped.length} floating bubbles dropped. `:'')+`+${result.points} points.`;}
    else this.$('status').textContent=result.descended?'A new row arrived. Look for a match!':'No match yet. Try connecting three of the same color.';
    if(this.state.status!=='playing'){
      const won=this.state.status==='won';this.$('overlay').hidden=false;this.$('title').textContent=won?'Colorfully done!':'At the danger line';
      this.$('result').textContent=won?`Level ${this.state.level} complete · ${this.state.score.toLocaleString()} points`:`You cleared ${this.state.cleared} bubbles. Score: ${this.state.score.toLocaleString()}. Try a new approach.`;
      this.$('continue').textContent=won?'Next Level':'Try again';this.$('status').textContent=won?'Level complete! Choose Next Level to continue.':'The bubbles reached the danger line. Try again.';
      this.emit(won?'level_complete':'game_over',{score:this.state.score,cleared:this.state.cleared});
      if(won)for(let i=0;i<20;i++)this.effects.push({x:40+this.random()*340,y:80+this.random()*180,color:i%6,type:'pop',born:now+this.random()*120});
    }
    this.update();
  }
  animate(){if(this.raf||document.hidden)return;this.lastFrame=performance.now();this.raf=requestAnimationFrame(t=>this.frame(t));}
  frame(now){
    this.raf=0;const dt=Math.min(40,Math.max(0,now-this.lastFrame));this.lastFrame=now;
    if(this.$('dialog').open)return;
    if(this.shot){let remaining=dt*.85;while(this.shot&&remaining>0){const s=this.shot,to=s.path[s.segment],distance=Math.hypot(to.x-s.x,to.y-s.y);
      if(distance<=remaining){remaining-=distance;s.x=to.x;s.y=to.y;if(++s.segment>=s.path.length)this.settle();}
      else{s.x+=(to.x-s.x)*remaining/distance;s.y+=(to.y-s.y)*remaining/distance;remaining=0;}
    }}
    this.effects=this.effects.filter(e=>now-e.born<(this.reduced?180:e.type==='drop'?620:550));this.draw(now);
    if(this.shot||this.effects.length)this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  bubble(x,y,color,r=19,alpha=1){
    const c=this.ctx;c.save();c.globalAlpha=alpha;
    const g=c.createRadialGradient(x-r*.35,y-r*.45,1,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.28,this.palette[color]);g.addColorStop(1,this.palette[color]);
    c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle='#ffffffaa';c.lineWidth=1.5;c.stroke();
    // A stable symbol for each color makes matching less dependent on color vision.
    c.fillStyle='#25344d';c.font=`700 ${Math.max(10,r*.8)}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText(['●','◆','✦','+','–','○'][color],x,y+1);c.restore();
  }
  draw(now=performance.now()){
    if(!this.state)return;const c=this.ctx,M=this.M;c.setTransform(this.canvas.width/420,0,0,this.canvas.height/620,0,0);c.clearRect(0,0,420,620);
    c.fillStyle='#f5f8ff';c.fillRect(0,0,420,620);
    if(this.feedback&&!this.reduced){const fade=1-(now-this.feedback.born)/350;if(fade>0){c.strokeStyle=`rgba(164,128,220,${fade*.45})`;c.lineWidth=this.feedback.big?12:6;c.strokeRect(3,3,414,614);}}
    c.fillStyle='#e7eafa';c.fillRect(0,0,420,6);
    c.save();c.setLineDash([5,6]);c.strokeStyle='#d59aaf';c.lineWidth=1;c.beginPath();c.moveTo(8,M.DANGER);c.lineTo(412,M.DANGER);c.stroke();c.restore();
    c.font='10px system-ui';c.fillStyle='#9a657c';c.textAlign='right';c.fillText('DANGER LINE',407,M.DANGER+14);
    for(const b of this.state.board.values()){const p=M.center(b.r,b.c,this.state.phase);this.bubble(p.x,p.y,b.color);}
    if(!this.shot&&this.state.status==='playing'){
      const route=M.trace(this.state,this.angle);c.save();c.strokeStyle='#64749799';c.lineWidth=3;c.setLineDash([1,11]);c.lineCap='round';c.beginPath();route.path.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();
      if(route.cell){const p=M.center(route.cell.r,route.cell.c,this.state.phase);c.beginPath();c.arc(p.x,p.y,18,0,Math.PI*2);c.strokeStyle='#768ab080';c.lineWidth=2;c.stroke();}
    }
    c.fillStyle='#e0e7f8';c.beginPath();c.ellipse(210,584,45,15,0,0,Math.PI*2);c.fill();
    c.save();c.translate(210,568);c.rotate(this.angle+Math.PI/2);c.fillStyle='#6677ae';c.beginPath();c.roundRect(-11,-40,22,34,8);c.fill();c.restore();
    if(!this.shot)this.bubble(210,568,this.state.current,23);else this.bubble(this.shot.x,this.shot.y,this.shot.color);
    this.bubble(320,567,this.state.next,15);c.font='11px system-ui';c.fillStyle='#626c87';c.textAlign='center';c.fillText('NEXT',320,599);
    c.fillText('COLOR POP',80,599);
    for(const e of this.effects){const age=Math.max(0,now-e.born),t=age/550;if(age===0)continue;
      if(e.type==='score'){c.save();c.globalAlpha=Math.max(0,1-t);c.fillStyle='#3a5181';c.font='800 24px system-ui';c.textAlign='center';c.fillText(e.text,e.x,Math.max(30,e.y)-(this.reduced?0:t*35));c.restore();}
      else if(e.type==='drop')this.bubble(e.x,e.y+(this.reduced?0:t*t*180),e.color,19,Math.max(0,1-t));
      else if(!this.reduced){c.save();c.globalAlpha=Math.max(0,1-t);c.strokeStyle=this.palette[e.color];c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,19+t*18,0,Math.PI*2);c.stroke();c.fillStyle=this.palette[e.color];for(let j=0;j<5;j++){const a=j*Math.PI*2/5;c.beginPath();c.arc(e.x+Math.cos(a)*t*42,e.y+Math.sin(a)*t*42,3*(1-t),0,Math.PI*2);c.fill();}c.restore();}
    }
  }
  destroy(){cancelAnimationFrame(this.raf);this.resize.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);}
}
