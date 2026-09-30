(function(){
'use strict';
const D=FashionData,M=FashionModel,A=FashionArt,$=id=>document.getElementById(id);
let current=M.outfit(),skin=1,category='top',mode='challenge',theme=M.nextTheme(null),finished=false,result=null,started=false,dailyDate=null,shareURL=null,shareRevision=0;
const emit=(name,extra={})=>{if(typeof track==='function')track(name,{game_name:'dress_up',mode,theme:mode==='free'?'free':theme.id,...extra});};
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
function begin(){if(started)return;started=true;emit('dress_up_game_started');emit(mode==='free'?'free_dress_up_started':mode==='daily'?'daily_challenge_started':'fashion_challenge_started');}
function dailyLabel(){const today=M.daily();const saved=M.readDaily(storage);$('daily').textContent="Today's Challenge: "+today.name+(saved?' · Best '+saved.best+'/100':'');}
function announcement(message){$('notice').textContent=message;}
function paint(){
 $('portrait').innerHTML=A.svg(current,skin);
 $('outfit-label').textContent=M.selected(current).map(i=>i.name).join(' · ');
 $('theme-label').textContent=mode==='free'?'Your own style':(mode==='daily'?"Today's theme: ":'Theme: ')+theme.name;
 $('theme-hint').textContent=mode==='free'?'Mix anything you love. No scores, no rules.':`Try ${theme.tags.join(' + ')} pieces. Several looks can score well.`;
 const names={'#647c9d':'denim','#faf5e7':'cream','#ac90ca':'lilac','#afbdcf':'silver','#dd8fa7':'pink','#bad05e':'lime','#519fae':'ocean','#deb68a':'sand','#d6ad65':'gold','#c78546':'amber','#745248':'cocoa','#73779f':'periwinkle','#ae486e':'berry','#83a991':'sage','#849964':'moss','#393443':'charcoal','#3b3845':'ink','#8d9470':'olive','#d69ab1':'rose','#b4bbcc':'pearl'};
 $('palette').textContent=mode==='free'?'': 'Palette: '+theme.colors.map(c=>names[c]).join(' · ');
 $('free').setAttribute('aria-pressed',String(mode==='free'));$('challenge').setAttribute('aria-pressed',String(mode!=='free'));$('daily').setAttribute('aria-pressed',String(mode==='daily'));
 $('finish').textContent=mode==='free'?'✨ Finish My Look':'✨ Rate My Look';$('finish').disabled=!M.ready(current);
 $('next').textContent=mode==='free'?'Try Another Look':'🎲 Next Challenge';
 $('retry').textContent=mode==='free'?'Fashion Challenge':'Try This Theme Again';
 $('wardrobe').hidden=finished;$('result').hidden=!finished;$('finish').hidden=finished;$('result-actions').hidden=!finished;
 $('skin-options').hidden=finished;
 $('step').textContent=finished?'Your look is ready!':!started?'Choose a style to start 👇':M.ready(current)?'Choose your outfit, then finish your look.':'Add shoes and a dress, or a top + bottom.';
 dailyLabel();
}
function cards(){
 const previousScroll=$('items').scrollTop;
 $('categories').replaceChildren();
 Object.entries(D.categories).forEach(([id,name])=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.setAttribute('aria-pressed',String(category===id));b.onclick=()=>{category=id;cards();Array.from($('categories').children).find(el=>el.textContent===name).focus({preventScroll:true});$('items').scrollTop=0;};$('categories').append(b);if(!started&&category===id)b.classList.add('first-step');});
 $('items').replaceChildren();
 D.items.filter(i=>i.category===category).forEach(i=>{const b=document.createElement('button');b.type='button';b.className='item';const on=current[i.slot]===i.id;b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',i.name+(on?', selected':''));b.innerHTML=A.thumb(i)+`<span>${i.name}</span><small>${i.tags.slice(0,2).join(' · ')}</small>`;b.onclick=()=>{begin();current=M.wear(current,i.id);paint();cards();Array.from($('items').children).find(el=>el.getAttribute('aria-label')===i.name+', selected').focus({preventScroll:true});announcement('Wearing '+i.name+'.');emit('clothing_item_selected',{item_id:i.id,category:i.category});};$('items').append(b);});
 $('items').scrollTop=previousScroll;
 $('remove').textContent=category==='accessory'?'Remove accessories':'Remove '+D.categories[category].toLowerCase();
}
function clearShare(){shareRevision++;if(shareURL){URL.revokeObjectURL(shareURL);shareURL=null;}$('download').hidden=true;$('share-status').textContent='';}
function start(nextMode,nextTheme,reset=true){clearShare();mode=nextMode;theme=nextTheme||M.nextTheme(theme.id);dailyDate=mode==='daily'?M.dayKey():null;finished=false;started=false;result=null;if(reset)current=M.outfit();paint();cards();announcement('Choose a style to start.');}
function scoreLook(){if(mode==='daily'&&dailyDate!==M.dayKey()){refreshDay();return;}if(finished||!M.ready(current))return;begin();finished=true;emit('look_completed');clearShare();
 if(mode==='free'){$('score').textContent='Made by you.';$('reaction').textContent='Your own mix. Your own style.';$('breakdown').replaceChildren();}
 else{result=M.score(current,theme);$('score').textContent=result.total+' / 100';
 $('reaction').textContent=result.total>=85?'Beautiful theme match! Make another?':result.accessories<20?'Nice start — try a matching accessory next.':result.themeMatch<30?'A fresh look! Try more '+theme.tags[0]+' pieces.':'Looking good! Try colors from this theme.';
 $('breakdown').replaceChildren();[['Theme Match',result.themeMatch,40],['Color Match',result.colorMatch,25],['Accessories',result.accessories,20],['Style Bonus',result.styleBonus,15]].forEach(([label,value,max])=>{const row=document.createElement('div');row.innerHTML=`<span>${label}</span><strong>${value} / ${max}</strong><meter min="0" max="${max}" value="${value}" aria-label="${label}"></meter>`;$('breakdown').append(row);});
 emit('challenge_completed',{score:result.total});
 if(mode==='daily'){M.saveDaily(storage,result.total,new Date(dailyDate+'T12:00:00Z'));emit('daily_challenge_completed',{score:result.total});}}
 paint();announcement(mode==='free'?'Look complete. Try another look or a fashion challenge.':'Look complete. Try the theme again or choose Next Challenge.');$('score').focus({preventScroll:true});
}
$('finish').onclick=scoreLook;
$('free').onclick=()=>start('free',theme,false);
$('challenge').onclick=()=>start('challenge',M.nextTheme(theme.id),false);
$('daily').onclick=()=>{start('daily',M.daily(),false);begin();};
$('next').onclick=()=>{emit('next_challenge_started');start(mode==='free'?'free':'challenge',M.nextTheme(theme.id));};
$('retry').onclick=()=>{start(mode==='free'?'challenge':mode,theme,false);};
$('remove').onclick=()=>{begin();if(category==='accessory'){delete current.head;delete current.neck;delete current.bag;}else delete current[category];paint();cards();announcement('Removed '+D.categories[category].toLowerCase()+'.');};
D.skins.forEach((color,index)=>{const button=document.createElement('button');button.className='skin';button.type='button';button.style.background=color;button.setAttribute('aria-label','Skin tone '+(index+1));button.setAttribute('aria-pressed',String(skin===index));button.onclick=()=>{skin=index;for(const [j,b] of Array.from($('skins').children).entries())b.setAttribute('aria-pressed',String(j===index));paint();announcement('Skin tone updated. This does not affect scoring.');};$('skins').append(button);});
async function share(){emit('share_clicked');const revision=++shareRevision;const outfit={...current},tone=skin,title=mode==='free'?'My original look':theme.name,points=mode==='free'?'Free Dress Up':result.total+' / 100';$('share').disabled=true;$('share-status').textContent='Preparing your look…';
 try{const source=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="#f5eee6"/><rect x="28" y="28" width="544" height="744" rx="28" fill="#fffaf4"/><text x="300" y="78" text-anchor="middle" fill="#493d56" font-family="sans-serif" font-size="21">PUZZLETEN • THE STYLE STUDIO</text><text x="300" y="120" text-anchor="middle" fill="#493d56" font-family="sans-serif" font-size="28">${title}</text><g transform="translate(144 145) scale(1.3)">${A.figure(outfit,tone)}</g><text x="300" y="726" text-anchor="middle" fill="#493d56" font-family="sans-serif" font-size="28">${points}</text></svg>`;
 const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));const image=new Image();try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});}finally{URL.revokeObjectURL(url);}
 const canvas=document.createElement('canvas');canvas.width=600;canvas.height=800;canvas.getContext('2d').drawImage(image,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Image unavailable');if(revision!==shareRevision)return;
 const file=new File([blob],'puzzleten-my-look.png',{type:'image/png'});shareURL=URL.createObjectURL(blob);$('download').href=shareURL;$('download').hidden=false;
 if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'My PuzzleTen look'});$('share-status').textContent='Your look is ready.';}catch(error){$('share-status').textContent=error.name==='AbortError'?'Sharing cancelled. You can still save your look.':'Use Save My Look below to share the image yourself.';}}
 else $('share-status').textContent='Your image is ready. Save it below to share wherever you like.';
 }catch{$('share-status').textContent='Could not prepare the image. Please try again.';}finally{$('share').disabled=false;}}
$('share').onclick=share;
function refreshDay(){dailyLabel();if(mode==='daily'&&dailyDate!==M.dayKey()){start('daily',M.daily());announcement('A new day, a new fashion challenge!');}}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDay();});
 setInterval(refreshDay,60000);
paint();cards();announcement('Choose a style to start 👇');emit('game_view');
})();
