(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./data.js'));else root.FashionModel=factory(root.FashionData);})(globalThis,function(data){
'use strict';
const byId=Object.fromEntries(data.items.map(item=>[item.id,item]));
function outfit(){return {hair:'hair-0',top:'top-0',bottom:'bottom-0',shoes:'shoes-0'};}
function wear(current,id){const item=byId[id];if(!item)return {...current};const next={...current};next[item.slot]=id;if(item.category==='dress'){delete next.top;delete next.bottom;}if(item.category==='top'||item.category==='bottom')delete next.dress;return next;}
function selected(current){return Object.entries(current).filter(([slot,id])=>byId[id]&&byId[id].slot===slot).map(([,id])=>byId[id]);}
function ready(current){return Boolean(current.shoes&&((current.top&&current.bottom)||current.dress));}
function score(current,theme){const all=selected(current),clothes=all.filter(i=>i.category!=='hair');const essential=['shoes',...(current.dress?['dress']:['top','bottom'])];const coverage=essential.filter(slot=>current[slot]).length/essential.length;
 const match=i=>theme.tags.some(t=>i.tags.includes(t));const ratio=clothes.length?clothes.filter(match).length/clothes.length:0;
 const themeMatch=Math.round(40*ratio*coverage);
 const colorMatch=Math.round(25*(clothes.length?clothes.filter(i=>theme.colors.includes(i.color)).length/clothes.length:0));
 const accessories=Math.min(20,all.filter(i=>i.category==='accessory').reduce((sum,i)=>sum+(match(i)?10:4),0));
 const styleBonus=Math.round(15*(all.length?all.filter(match).length/all.length:0)*coverage);
 return {themeMatch,colorMatch,accessories,styleBonus,total:themeMatch+colorMatch+accessories+styleBonus};}
function dayKey(date=new Date()){return date.toISOString().slice(0,10);}
function daily(date=new Date()){return data.themes[Math.floor(Date.parse(dayKey(date)+'T00:00:00Z')/86400000)%data.themes.length];}
function nextTheme(previous,random=Math.random){const choices=data.themes.filter(t=>t.id!==previous);return choices[Math.floor(random()*choices.length)];}
function readDaily(storage,date=new Date()){try{const value=JSON.parse(storage.getItem('fashion:daily:v1'));return value&&value.day===dayKey(date)&&Number.isInteger(value.best)&&value.best>=0&&value.best<=100?value:null;}catch{return null;}}
function saveDaily(storage,score,date=new Date()){const previous=readDaily(storage,date);const value={day:dayKey(date),best:Math.max(previous?.best||0,Math.max(0,Math.min(100,Math.round(score))))};try{storage.setItem('fashion:daily:v1',JSON.stringify(value));}catch{}return value;}
return {byId,outfit,wear,selected,ready,score,dayKey,daily,nextTheme,readDaily,saveDaily};});
