(async()=>{
  const results=[],fixture=document.getElementById('fixture');let game,events,root,next;
  const html=await (await fetch('../yes-or-no-generator/')).text();
  const template=new DOMParser().parseFromString(html,'text/html').querySelector('#yes-no-tool');
  const assert=(v,m)=>{if(!v)throw Error(m);};
  function setup(){root=document.importNode(template,true);fixture.replaceChildren(root);events=[];next=0;game=new YesNoPage(root,{source:()=>next,analytics:(name,data)=>events.push({name,data})});}
  async function test(name,fn){setup();const li=document.createElement('li');try{await fn();li.className='pass';li.textContent='PASS: '+name;results.push(true);}catch(e){li.className='fail';li.textContent='FAIL: '+name+' — '+e.message;results.push(false);}document.getElementById('results').append(li);}
  await test('empty question is allowed and submit reveals YES, then Ask Again reveals NO',()=>{
    assert(game.$('yn-question').value==='','question not blank');assert(!game.$('yn-submit').disabled,'button disabled');
    game.$('yn-submit').click();assert(game.$('yn-answer').textContent==='YES','no YES');assert(game.$('yn-submit').textContent==='Ask Again','wrong label');
    next=1;game.$('yn-submit').click();assert(game.$('yn-answer').textContent==='NO','no NO');assert(game.$('yn-stage').dataset.answer==='no','missing visual state');
  });
  await test('typing or changing the question cannot affect the result or leak into analytics',()=>{
    game.$('yn-question').value='private question';game.$('yn-submit').click();assert(game.$('yn-answer').textContent==='YES','question changed result');
    game.$('yn-question').value='a totally different question';game.$('yn-submit').click();assert(game.$('yn-answer').textContent==='YES','result altered');
    assert(!JSON.stringify(events).includes('question'),'question sent in event');assert(!game.$('yn-history').textContent.includes('question'),'question in history');
    assert(events.filter(e=>e.name==='utility_use').length===2,'usage event count');
  });
  await test('recent answers keep only eight newest results and reset with a fresh page instance',()=>{
    for(let n=0;n<12;n++){next=n%2;game.$('yn-submit').click();}
    assert(game.$('yn-history').children.length===8,'history unbounded');assert(game.$('yn-history').firstChild.textContent==='NO','wrong order');assert(game.$('yn-history').firstChild.getAttribute('aria-label')==='Answer 12: NO','position wrong');
    setup();assert(game.history.length===0&&game.$('yn-history').children.length===0,'history persisted');
  });
  await test('repeated identical answers get distinct live announcements and preserve button focus',()=>{
    game.$('yn-submit').focus();game.$('yn-submit').click();game.$('yn-submit').click();
    assert(game.$('yn-label').textContent==='Answer 2','repeat not announced');assert(document.activeElement===game.$('yn-submit'),'focus lost');assert(root.querySelectorAll('[role="status"]').length===1,'duplicate announcements');
  });
  await test('native form submit works from the question field and restores no page navigation',()=>{
    const submit=new Event('submit',{bubbles:true,cancelable:true});game.$('yn-form').dispatchEvent(submit);
    assert(submit.defaultPrevented,'navigation not prevented');assert(game.count===1,'no answer');
  });
  await test('failure shows an error, retains history, and a later draw recovers',()=>{
    game.source=()=>{throw Error('unavailable');};game.$('yn-submit').click();assert(game.$('yn-error').textContent,'error absent');assert(!game.history.length,'fake answer added');
    game.source=()=>1;game.$('yn-submit').click();assert(game.$('yn-error').textContent==='','error not cleared');assert(game.$('yn-answer').textContent==='NO','no recovery');
  });
  await test('long question and full history fit a narrow card without horizontal overflow',()=>{
    root.style.width='280px';game.$('yn-question').value='x'.repeat(240);for(let n=0;n<8;n++)game.generate();
    assert(root.scrollWidth<=281,'card overflows');assert(game.$('yn-submit').getBoundingClientRect().height>=44,'button too small');
  });
  const failed=results.filter(x=>!x).length;document.getElementById('summary').textContent=`${results.length-failed} passed · ${failed} failed`;
})();
