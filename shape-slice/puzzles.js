/* Authored challenge configurations and verified example solutions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SlicePuzzles=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const square=[[100,70],[300,70],[300,270],[100,270]],rect=[[70,100],[330,100],[330,240],[70,240]],triangle=[[200,55],[330,275],[70,275]],rhombus=[[200,45],[325,170],[200,295],[75,170]],trap=[[140,90],[260,90],[330,250],[70,250]];
  const regular=(n,r=125,angle=-Math.PI/2)=>Array.from({length:n},(_,i)=>[200+r*Math.cos(angle+i*Math.PI*2/n),170+r*Math.sin(angle+i*Math.PI*2/n)]);
  const pent=regular(5),hex=regular(6),oct=regular(8,125,Math.PI/8),irregular=[[80,95],[250,60],[330,155],[265,265],[95,240]];
  const P=[];
  function add(title,kind,shape,solution,extra={}){P.push({id:P.length+1,title,kind,polygons:[shape],solution,...extra});}
  add('Make 2 triangles','sides',square,[[100,70],[300,270]],{counts:[3,3],hint:'Connect two opposite corners.'});
  add('Make 2 rectangles','rectangles',rect,[[200,60],[200,280]],{hint:'A straight cut from edge to opposite edge.'});
  add('Turn a square into a pentagon','sides',square,[[200,70],[300,170]],{one:5,hint:'Can removing one corner give the shape an extra side?'});
  add('Make one piece a triangle','sides',triangle,[[80,180],[320,180]],{one:3});
  add('Cut off 25%','area',square,[[150,40],[150,300]],{ratio:.25});
  add('Find the mirror line','symmetry',triangle,[[200,30],[200,310]]);
  add('Create a pentagon','sides',rect,[[240,100],[330,180]],{one:5,hint:'Try clipping a corner.'});
  add('Hit both dots','targets',square,[[90,115],[310,225]],{targets:[[130,135],[270,205]]});
  add('Make 2 quadrilaterals','sides',trap,[[60,175],[340,175]],{counts:[4,4]});
  add('Give the rhombus equal halves','area',rhombus,[[50,170],[350,170]],{ratio:.5});
  add('Make 2 equal triangles','equalTriangles',rect,[[70,100],[330,240]]);
  add('Find a pentagon’s mirror line','symmetry',pent,[[200,20],[200,320]]);
  add('One piece twice the other','area',rect,[[70+260/3,50],[70+260/3,290]],{ratio:1/3});
  add('Slice through all 3 dots','targets',hex,[[70,100],[330,230]],{targets:[[130,130],[200,165],[270,200]]});
  add('Make a triangle + a quadrilateral','sides',triangle,[[60,165],[340,165]],{counts:[3,4]});
  add('Find the rhombus mirror line','symmetry',rhombus,[[60,170],[340,170]]);
  add('Create 2 pentagons','sides',hex,[[50,170],[350,170]],{counts:[5,5],hint:'Cut across the middle, between the corners.'});
  add('Halve this irregular shape','area',irregular,[[50,170],[350,170]],{ratio:.5,solveArea:true});
  add('Slice the shape. Avoid red.','avoid',square,[[245,30],[245,310]],{zones:[[[120,130],[180,130],[180,210],[120,210]]]});
  add('Cut only the purple shape','only',[[55,90],[175,90],[175,250],[55,250]],[[115,45],[115,300]],{polygons:[[[55,90],[175,90],[175,250],[55,250]],[[230,110],[340,170],[230,240]]],active:0});
  add('Cut 25% from the triangle','area',triangle,[[50,165],[350,165]],{ratio:.25});
  add('Make two mirror-image pieces','symmetry',trap,[[200,40],[200,290]]);
  add('Create a hexagon','sides',pent,[[175,65],[240,80]],{one:6,hint:'A new edge can add a side.',solveCorner:true});
  add('Hit the dots. Miss the red.','targets',rect,[[250,50],[250,290]],{targets:[[250,120],[250,220]],zones:[[[125,135],[205,135],[205,205],[125,205]]]});
  add('Make 2 triangles from the rhombus','sides',rhombus,[[200,45],[200,295]],{counts:[3,3]});
  add('Halve the octagon','area',oct,[[40,125],[360,215]],{ratio:.5});
  add('Make two equal triangles','equalTriangles',triangle,[[200,55],[200,275]]);
  add('Slice both shapes equally','doubleArea',square,[[40,170],[360,170]],{polygons:[[[45,100],[175,100],[175,240],[45,240]],[[225,100],[355,100],[355,240],[225,240]]],ratio:.5});
  add('Find another kind of mirror line','symmetry',square,[[100,70],[300,270]],{hint:'A mirror line does not have to be vertical.'});
  add('Make the smaller piece 40%','area',trap,[[40,170],[360,170]],{ratio:.4,solveArea:true});
  add('Create 2 quadrilaterals','sides',pent,[pent[0],[200,260]],{counts:[4,4],hint:'Start at a corner, not between two corners.'});
  add('Equal halves. Avoid red.','area',square,[[200,30],[200,310]],{ratio:.5,zones:[[[115,85],[175,85],[175,130],[115,130]]],hint:'The obvious diagonal is not your only option.'});
  // Fixed horizontal solutions calculated offline by monotone area bisection.
  P[17].solution=[[40,162.74543970505175],[360,162.74543970505175]];
  P[29].solution=[[40,168.73314657129316],[360,168.73314657129316]];
  P[22].solution=[[(pent[0][0]+pent[4][0])/2,(pent[0][1]+pent[4][1])/2],[(pent[0][0]+pent[1][0])/2,(pent[0][1]+pent[1][1])/2]];
  return {all:P,shapes:{square,rect,triangle,rhombus,trap,pent,hex,oct,irregular}};
});
