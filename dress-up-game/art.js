/* Original PuzzleTen vector paper-doll artwork. Shared 240 × 420 rig. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./data.js'),require('./model.js'));else root.FashionArt=factory(root.FashionData,root.FashionModel);})(globalThis,function(data,model){
'use strict';
const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const line=d=>path(d,'none','stroke="#302b3c" stroke-opacity=".3" stroke-width="1.8" stroke-linecap="round"');
function item(i){if(!i)return '';const c=i.color,s=i.shape;let art='';
if(i.category==='hair'){
 const styles={bob:'M87 93Q70 44 98 34Q146 16 157 60L158 109L139 118L138 74Q112 84 91 67L97 110Z',curls:'M83 109Q65 93 76 78Q63 60 82 51Q72 31 96 31Q111 15 126 28Q153 18 159 42Q180 49 166 70Q181 90 160 108L142 112L141 71Q115 80 97 62L98 109Z',pony:'M141 42Q182 19 184 61Q174 98 185 125Q153 125 154 76L146 72Q114 83 89 65L86 80Q75 33 111 29Q136 22 147 45Z',sweep:'M85 91Q69 47 103 32Q155 12 159 66L149 85L142 55Q126 85 93 76Z',waves:'M85 67Q74 26 120 26Q168 25 157 76Q174 103 156 146L135 137L140 69Q110 82 91 63L104 141L77 147Q62 112 85 67Z',buns:'M79 49Q58 47 66 29Q78 16 91 32Q122 12 148 32Q160 16 175 31Q183 52 159 52L151 83L142 65Q109 78 90 65L87 84Z',crop:'M82 72Q73 57 81 47Q77 27 94 30Q98 16 112 25Q127 13 138 26Q156 21 160 42Q175 51 158 73L147 56Q117 71 89 59Z',braid:'M84 77Q71 28 119 27Q158 20 157 74L146 78L139 59Q114 81 89 65ZM147 90Q173 99 150 111Q171 124 148 133Q165 150 143 158L140 145Q133 127 142 117Q133 100 147 90Z',fringe:'M82 106L82 58Q80 25 121 27Q160 24 159 65L158 120L139 124L143 73L96 74L100 124L81 117Z'};
 art=path(styles[s],c)+line('M94 48Q112 34 137 43');
}else if(i.category==='top'){
 const torso='M96 134L108 128Q120 138 132 128L145 135L145 216Q120 224 94 214Z';
 if(['tee','sport','stripe','prism'].includes(s))art=path('M96 132L108 128Q120 140 132 128L145 133L165 155L149 168L142 156L145 213Q118 222 94 213L97 156L86 168L73 156Z',c);
 else if(['blouse','knit','collar'].includes(s))art=path('M96 132L108 128L132 128L146 132Q161 136 165 161L163 202L150 201L143 160L145 214L94 214L96 163L87 203L74 200L77 157Q80 139 96 132Z',c);
 else if(s==='wrap')art=path('M95 134L108 128L121 146L133 128L146 135L153 188L142 194L144 216L93 216L96 192L84 188Z',c)+line('M108 132L137 183L94 205');
 else art=path(torso,c);
 art+=line('M96 211Q120 217 143 211');
 if(s==='sport'||s==='stripe')art+=path('M94 163H145V170H94ZM94 180H145V187H94','#f7f2e7');
 if(s==='lace')art+=path('M100 138L105 146L110 138L116 147L122 138L128 147L136 138','none','stroke="#b9a5c2" stroke-width="3"')+line('M104 155V204M137 155V204');
 if(s==='orbit')art+='<ellipse cx="120" cy="174" rx="15" ry="8" fill="none" stroke="#fff" stroke-width="3" transform="rotate(-30 120 174)"/>';
 if(s==='prism')art+=path('M104 163H113V195H104','#deb68a')+path('M113 163H123V195H113','#dd8fa7')+path('M123 163H134V195H123','#83a991');
 if(s==='knit')art+=line('M102 150V208M111 150V208M121 150V208M132 150V208');
 if(s==='collar'||s==='blouse'||s==='vest')art+=path('M106 128L119 140L110 153L99 134M133 128L120 140L130 153L141 135','#f6eedf')+line('M120 145V210');
 if(s==='tank')art+=line('M105 135V155M134 135V155');
}else if(i.category==='bottom'){
 const shapes={wide:'M95 207H145L153 358H125L119 260L111 358H85Z',cargo:'M95 207H145L149 354H127L119 262L110 354H88Z',tailored:'M95 207H145L139 358H122L120 255L113 358H94Z',shorts:'M95 207H145L151 265H123L119 237L114 265H89Z',pleat:'M95 207H145L162 279H78Z',mini:'M95 207H145L154 258H86Z',midi:'M95 207H145L156 328H85Z',tiers:'M95 207H145L151 246L160 274L166 305H74L80 274L89 246Z',flare:'M95 207H145L136 285L158 356H123L119 261L114 285L117 356H82L96 285Z',cords:'M95 207H145L146 356H126L120 266L110 356H90Z'};
 art=path(shapes[s],c)+line('M95 215H144');
 if(['wide','cargo','tailored','cords','flare','shorts'].includes(s))art+=line('M120 218V250M98 219L101 238M141 219L138 238');
 if(s==='cargo')art+=path('M90 270H110V288H90M129 270H148V288H129','none','stroke="#535b40" stroke-width="2"');
 if(s==='pleat')art+=line('M100 222L92 275M112 223L108 275M128 223L133 275M139 222L151 275');
 if(s==='tiers')art+=line('M89 246H151M80 274H160');
 if(s==='cords')art+=line('M99 229V349M105 229V349M132 229V349M138 229V349');
}else if(i.category==='dress'){
 const bodice='M99 133L108 127Q120 140 132 127L142 134L142 208H96Z';
 const skirts={gown:'M96 200H142L170 364Q120 380 70 364Z',sundress:'M96 200H142L162 314Q120 330 77 314Z',party:'M96 200H142L167 280Q120 298 73 280Z',column:'M96 200H142L148 362H126L121 326L111 362H91Z',fairy:'M96 200H142L161 257L148 290L126 279L105 306L77 276Z',pinafore:'M96 200H142L151 281H88Z',rainbow:'M96 200H142L161 319L120 308L77 323Z',shift:'M96 184H142L152 273H87Z',sweater:'M96 192H142L147 302H90Z'};
 art=path(bodice,c)+path(skirts[s],c)+line('M98 201Q120 207 141 201');
 if(s==='sweater')art+=path('M99 132L80 143L76 214L88 216L103 152M140 132L158 143L165 214L153 216L136 152',c)+line('M105 149V290M117 149V294M132 149V290');
 if(s==='gown')art+=path('M104 207Q104 311 79 357M136 207Q139 304 160 357','none','stroke="#ffffff" stroke-opacity=".4" stroke-width="3"');
 if(s==='fairy')art+=path('M99 207L120 262L143 207M120 262L106 291M120 262L149 274','none','stroke="#d8edbf" stroke-width="3"');
 if(s==='rainbow')art+=path('M97 208L111 208L100 310L84 315Z','#dd8fa7')+path('M115 210H130L137 311L119 304Z','#deb68a')+path('M135 209L143 209L155 311L144 313Z','#83a991');
 if(s==='pinafore')art+=path('M109 239H132V260H109Z','#ccd6df')+line('M103 141V188M136 141V188');
 if(s==='shift')art+=path('M105 157L111 169L125 170L115 181L117 194L105 187L93 194L96 180L87 169L100 168Z','#f8f5e7');
 if(s==='party')art+='<g fill="#f6e4d8"><circle cx="109" cy="232" r="3"/><circle cx="136" cy="255" r="3"/><circle cx="99" cy="269" r="3"/></g>';
 if(s==='sundress')art+=line('M104 141L111 195M135 141L128 195');
}else if(i.category==='shoes'){
 const left=s==='boot'?'M92 321H113L112 372L87 381H76Q71 373 82 366L93 362Z':s==='ankle'?'M92 344H113L111 373L86 381H76Q72 372 84 367L92 364Z':s==='heel'?'M92 363L107 370L112 358L115 378H109L106 373L83 382H75Q73 374 92 363Z':s==='sandal'?'M94 365H112L108 377L78 382Q70 378 80 373Z':'M93 358H111L111 374L88 381H76Q70 374 82 369Z';
 art=path(left,c)+`<g transform="translate(240 0) scale(-1 1)">${path(left,c)}</g>`;
 if(s==='platform')art+=path('M76 379H112V386H76M128 379H164V386H128','#62536a');
 if(s==='sneaker'||s==='loafer')art+=line('M91 366H105M88 370H103M135 366H149M137 370H151');
 if(s==='flat')art+=path('M90 365L98 357L104 367M136 367L143 357L150 365','none','stroke="#e3c1b4" stroke-width="3"');
}else if(i.category==='layer'){
 const shape={denim:'M95 132L107 128L110 146L103 209L83 206L89 163L77 193L66 187L80 145ZM132 128L145 132L159 145L175 187L163 194L150 162L157 206L136 209L129 145Z',cardigan:'M95 132L107 128L103 254L84 252L91 166L77 217L65 211L80 145ZM132 128L145 132L160 145L175 211L163 217L149 166L155 252L137 254Z',biker:'M95 132L106 128L120 151L103 213L82 210L89 163L76 209L64 201L79 144ZM132 128L145 132L161 147L175 201L163 209L149 162L156 209L137 212L126 151Z',coat:'M94 132L107 128L119 152L110 305H79L89 169L75 235L63 230L78 145ZM132 128L146 132L161 147L175 229L162 235L150 169L161 305H129L121 152Z',cape:'M101 128L109 130L100 218L66 234L85 156ZM131 130L140 128L158 156L178 234L141 218Z',bolero:'M97 133L108 128L104 160L88 167L83 184L68 175L81 147ZM132 128L144 133L158 146L173 175L158 184L151 165L136 160Z'};
 art=path(shape[s],c)+line('M98 139L94 163M142 139L147 163');
}else{
 const shapes={glasses:'M92 78Q105 71 115 79L112 90H96ZM125 79Q137 71 149 78L145 90H129ZM113 80H128',clips:'M89 61L105 55L107 61L91 67ZM136 53L150 61L147 68L132 60Z',leaves:'M86 55Q115 24 152 53L143 48L139 36L132 44L123 30L117 42L103 33L103 46L89 46Z',stars:'M86 51L90 42L94 51L103 53L96 59L97 68L90 63L82 67L84 58L77 53ZM145 47L149 40L153 47L161 49L154 54L155 62L148 57L141 61L143 53L136 49Z',beret:'M78 52Q73 27 107 20Q144 15 161 39L153 56L85 62Z',band:'M82 62Q117 32 157 61L154 68Q118 43 86 71Z',pearls:'M103 132Q119 161 138 132',pendant:'M104 130L121 155L137 130M121 153L115 162L121 170L127 162Z',scarf:'M104 125Q118 134 137 126L145 145L129 149L140 192L127 195L118 149L99 147Z',beads:'M102 131Q120 164 140 131',satchel:'M153 227H186V267H153ZM154 227Q160 208 182 225M140 142L171 226',tote:'M156 225H188L193 275H152ZM160 225Q169 199 184 225',clutch:'M157 238H191V257H157Z',crossbody:'M149 230H182L185 258H147ZM99 140L166 231'};
 if(s==='pearls'||s==='beads')art=path(shapes[s],'none',`stroke="${c}" stroke-width="5" stroke-dasharray="1 7" stroke-linecap="round"`);
 else art=path(shapes[s],c,`stroke="${c}" stroke-width="2" stroke-linejoin="round"`);
}
return `<g stroke="#332d3d" stroke-opacity=".2" stroke-width="1.2" stroke-linejoin="round">${art}</g>`;
}
function figure(outfit,skinIndex=1){const skin=data.skins[skinIndex]||data.skins[1];let art='<ellipse cx="120" cy="389" rx="58" ry="7" fill="#463b54" opacity=".1"/>';
 art+=path('M106 112H134V134L146 143L146 219Q142 236 143 258L138 363L125 368L119 264L113 368L96 365L95 257Q99 231 94 215L96 145Z',skin);
 art+=path('M96 137Q81 138 77 157L63 225L67 263Q74 273 80 264L77 229L98 172ZM143 138Q160 139 164 158L177 226L173 263Q167 271 161 263L164 228L142 171Z',skin);
 art+=path('M89 61Q86 35 120 35Q154 36 151 63L148 94Q143 117 121 122Q100 117 92 95Z',skin);
 art+=path('M105 85Q110 80 115 85M129 85Q135 80 140 84','none','stroke="#392c33" stroke-width="2.2" stroke-linecap="round"');
 art+=path('M123 87L120 98L125 99M113 106Q122 112 133 104','none','stroke="#875448" stroke-width="1.5" stroke-linecap="round"');
 art+='<circle cx="110" cy="85" r="1.8" fill="#2c2932"/><circle cx="135" cy="85" r="1.8" fill="#2c2932"/>';
 // A neutral base outfit always covers the character, even when garments are removed.
 art+=path('M104 133H136L141 211H97ZM97 211H142L145 247H122L119 231L115 247H93Z','#e4d8d0');
 for(const slot of ['shoes','bottom','top','dress','layer','hair','head','neck','bag'])art+=item(model.byId[outfit[slot]]);
 return art;
}
function svg(outfit,skin=1){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 15 150 385" role="img" aria-label="Your styled fashion illustration">${figure(outfit,skin)}</svg>`;}
function thumb(i){const boxes={hair:'55 15 135 145',top:'60 120 125 110',bottom:'65 200 105 165',dress:'65 120 110 265',shoes:'65 310 110 80',layer:'55 120 130 190',accessory:i.slot==='head'?'65 15 110 95':i.slot==='neck'?'85 115 75 85':'125 185 80 100'};return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${boxes[i.category]}" aria-hidden="true">${item(i)}</svg>`;}
return {svg,figure,thumb,item};});
