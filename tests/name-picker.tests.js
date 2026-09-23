(async()=>{
 const fixture=document.querySelector('#fixture'), template=fixture.innerHTML;
 let page,events; const results=[];
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const input=text=>{page.$('names').value=text;page.$('names').dispatchEvent(new Event('input'));};
 async function test(name,run){
  fixture.innerHTML=template;events=[];page=new NamePickerPage(document.querySelector('#name-tool'),{delay:0,source:()=>0,analytics:(event,params)=>events.push({event,params})});
  const li=document.createElement('li');try{await run();li.textContent='PASS '+name;results.push(true);}catch(e){li.textContent='FAIL '+name+': '+e.message;results.push(false);}document.querySelector('#tests').append(li);
 }
 await test('empty default and pasted list normalization',()=>{assert(page.$('pick-name').disabled,'empty enabled');assert(!page.$('remove-picked').checked,'removal default');input(' Emma \n\nNoah\nEmma ');assert(page.pool.length===3,'count');assert(page.$('entered-count').textContent==='3 names entered','label');});
 await test('single entry, reveal, and repeated pick without removal',async()=>{input('Emma');await page.pick();assert(page.$('name-results').textContent==='Emma','winner');assert(!page.$('pick-again').hidden,'again hidden');await page.pick();assert(page.pool.length===1,'removed unexpectedly');});
 await test('multiple winners, removal, exhaustion and Reset List',async()=>{input('A\nB\nC\nD\nE');page.$('pick-count').value='5';page.$('remove-picked').checked=true;await page.pick();assert(page.$('name-results').children.length===5,'batch');assert(page.pool.length===0 && page.$('pick-again').disabled,'exhaustion');page.$('reset-list').click();assert(page.pool.length===5,'reset');assert(page.$('names').value==='A\nB\nC\nD\nE','original changed');});
 await test('duplicate names remove one entry; oversized options disabled',async()=>{input('Emma\nEmma');assert(page.$('pick-count').options[2].disabled,'3 allowed');page.$('remove-picked').checked=true;await page.pick();assert(page.pool.length===1 && page.pool[0]==='Emma','duplicate handling');});
 await test('editing starts a fresh list and names never enter analytics',async()=>{input('Private Person');await page.pick();input('Other Person\nNext Person');assert(page.pool.length===2 && page.$('name-results').children.length===0,'stale list');assert(!JSON.stringify(events).includes('Person'),'names leaked');});
 await test('HTML input is displayed as text',async()=>{input('<img src=x onerror=alert(1)>');await page.pick();assert(!page.$('name-results').querySelector('img'),'HTML injected');assert(page.$('name-results').textContent.includes('<img'),'text missing');});
 await test('short cycle locks controls and prevents concurrent draws',async()=>{input('A\nB');page.delay=40;const pending=page.pick();assert(page.busy && page.$('names').disabled,'not locked');await page.pick();await pending;assert(!page.busy && !page.$('names').disabled,'not released');assert(events.filter(e=>e.event==='utility_use').length===1,'double draw');});
 document.querySelector('#summary').textContent=`${results.filter(Boolean).length} passed · ${results.filter(x=>!x).length} failed`;
})();
