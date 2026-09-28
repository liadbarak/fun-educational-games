/* Convex polygon geometry in board coordinates. All V1 shapes are convex. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SliceGeometry=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const EPS=1e-7;
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1],cross=(a,b)=>a[0]*b[1]-a[1]*b[0],distance=(a,b)=>Math.hypot(...sub(a,b));
  function area(p){return Math.abs(p.reduce((s,v,i)=>s+cross(v,p[(i+1)%p.length]),0))/2;}
  function clean(poly){let p=poly.filter((v,i)=>!i||distance(v,poly[i-1])>EPS);if(p.length>1&&distance(p[0],p[p.length-1])<EPS)p.pop();let changed=true;while(changed&&p.length>2){changed=false;for(let i=0;i<p.length;i++){const a=sub(p[i],p[(i+p.length-1)%p.length]),b=sub(p[(i+1)%p.length],p[i]);if(Math.abs(cross(a,b))<=EPS*(Math.hypot(...a)+Math.hypot(...b))&&dot(a,b)>=-EPS){p.splice(i,1);changed=true;break;}}}return p;}
  function line(a,b){const d=distance(a,b);if(!Number.isFinite(d)||d<EPS)return null;const n=[-(b[1]-a[1])/d,(b[0]-a[0])/d];return {a:a.slice(),b:b.slice(),n,c:dot(n,a)};}
  const signed=(p,l)=>dot(p,l.n)-l.c;
  function clip(poly,l,side){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=signed(a,l)*side,db=signed(b,l)*side;const ina=da>=-EPS,inb=db>=-EPS;if(ina)out.push(a.slice());if(ina!==inb){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return clean(out);}
  function split(poly,l){if(!l)return null;const a=clip(poly,l,1),b=clip(poly,l,-1),minimum=Math.max(EPS,area(poly)*1e-8);return area(a)>minimum&&area(b)>minimum?[a,b]:null;}
  function centroid(p){let twice=0,x=0,y=0;p.forEach((a,i)=>{const b=p[(i+1)%p.length],c=cross(a,b);twice+=c;x+=(a[0]+b[0])*c;y+=(a[1]+b[1])*c;});return Math.abs(twice)>EPS?[x/(3*twice),y/(3*twice)]:p[0]||[0,0];}
  function rectangle(poly){const p=clean(poly);return p.length===4&&p.every((v,i)=>{const a=sub(p[(i+3)%4],v),b=sub(p[(i+1)%4],v);return Math.abs(dot(a,b))<=Math.hypot(...a)*Math.hypot(...b)*1e-6;});}
  function convex(p){if(p.length<3||area(p)<=EPS)return false;let sign=0;for(let i=0;i<p.length;i++){const c=cross(sub(p[(i+1)%p.length],p[i]),sub(p[(i+2)%p.length],p[(i+1)%p.length]));if(Math.abs(c)<EPS)continue;if(sign&&Math.sign(c)!==sign)return false;sign=Math.sign(c);}return !!sign;}
  function reflect(p,l){const d=signed(p,l);return [p[0]-2*d*l.n[0],p[1]-2*d*l.n[1]];}
  function segmentDistance(p,a,b){const v=sub(b,a),len=dot(v,v),t=len?Math.max(0,Math.min(1,dot(sub(p,a),v)/len)):0;return distance(p,[a[0]+t*v[0],a[1]+t*v[1]]);}
  function boundaryDistance(p,poly){return Math.min(...poly.map((a,i)=>segmentDistance(p,a,poly[(i+1)%poly.length])));}
  function symmetryError(poly,l){const reflected=poly.map(p=>reflect(p,l));return Math.max(...reflected.map(p=>boundaryDistance(p,poly)),...poly.map(p=>boundaryDistance(p,reflected)));}
  function span(poly){return Math.hypot(Math.max(...poly.map(p=>p[0]))-Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[1]))-Math.min(...poly.map(p=>p[1])));}
  // Snap only near vertices; scoring and drawing use this exact returned line.
  function snap(l,polys,tolerance=5){if(!l)return null;const near=polys.flat().filter(p=>Math.abs(signed(p,l))<=tolerance);if(!near.length)return l;let pair=null,dist=0;for(const a of near)for(const b of near)if(distance(a,b)>dist){pair=[a,b];dist=distance(a,b);}if(pair&&dist>40)return line(...pair);const p=near.reduce((a,b)=>Math.abs(signed(a,l))<Math.abs(signed(b,l))?a:b);return {...l,a:p.slice(),b:[p[0]+l.b[0]-l.a[0],p[1]+l.b[1]-l.a[1]],c:dot(l.n,p)};}
  function align(l,poly,tolerance=.04){const direction=sub(l.b,l.a),length=Math.hypot(...direction);let best=null,error=tolerance;poly.forEach((p,i)=>{const edge=sub(poly[(i+1)%poly.length],p),n=Math.hypot(...edge),e=Math.abs(cross(direction,edge))/(length*n);if(e<error){best=edge;error=e;}});if(!best)return l;const middle=[(l.a[0]+l.b[0])/2,(l.a[1]+l.b[1])/2];return line(middle,[middle[0]+best[0],middle[1]+best[1]]);}
  return {align,EPS,area,clean,line,signed,split,centroid,rectangle,convex,reflect,symmetryError,span,snap,distance};
});
