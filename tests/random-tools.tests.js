(async () => {
  const results = [];
  const pause = () => new Promise(resolve => setTimeout(resolve, 420));
  function assert(condition, message) { if (!condition) throw new Error(message); }
  async function test(name, run) {
    const item = document.createElement('li');
    try { await run(); item.className='pass';item.textContent='PASS: '+name;results.push(true); }
    catch(error) { item.className='fail';item.textContent='FAIL: '+name+' — '+error.message;results.push(false); }
    document.getElementById('checks').append(item);
  }
  async function load(slug) {
    const frame=document.createElement('iframe');frame.title=slug;
    const ready=new Promise(resolve => frame.onload=resolve);
    frame.src='../'+slug+'/';document.getElementById('frames').append(frame);await ready;
    return {frame,w:frame.contentWindow,d:frame.contentDocument};
  }
  const num=await load('random-number-generator');const coin=await load('coin-flip');
  const get=(p,id)=>p.d.getElementById(id);
  const submit=p=>get(p,'utility-form').requestSubmit();
  const chips=p=>[...p.d.querySelectorAll('.result-chip')].map(n=>n.textContent);
  await test('number generation announces actual results and tracks usage',()=>{
    submit(num);assert(chips(num).length===1,'expected one number');
    assert(get(num,'status').textContent.includes(chips(num)[0]),'result not announced');
    assert(num.w.dataLayer.some(e=>e[0]==='event'&&e[1]==='utility_use'),'usage event missing');
  });
  await test('unique full-range draws contain every number exactly once',()=>{
    get(num,'minimum').value=-2;get(num,'maximum').value=2;get(num,'quantity').value=5;get(num,'unique').checked=true;submit(num);
    assert(chips(num).map(Number).sort((a,b)=>a-b).join(',')==='-2,-1,0,1,2','incorrect unique values');
  });
  await test('impossible unique draw keeps previous result and shows error',()=>{
    const before=chips(num).join(',');get(num,'quantity').value=6;submit(num);
    assert(get(num,'error').textContent.includes('fewer'),'missing error');assert(chips(num).join(',')===before,'results changed');
  });
  await test('empty input is rejected by form validation',()=>{
    get(num,'minimum').value='';assert(!get(num,'utility-form').checkValidity(),'empty input accepted');get(num,'minimum').value=1;
  });
  await test('quick range and history cap work',()=>{
    num.d.querySelector('[data-range="100"]').click();get(num,'quantity').value=1;
    for(let i=0;i<12;i++)submit(num);
    assert(get(num,'maximum').value==='100','preset failed');assert(get(num,'history').children.length===10,'history unbounded');
  });
  await test('copy succeeds and clipboard failure is handled',async()=>{
    let copied='';Object.defineProperty(num.w.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text;}}});
    get(num,'copy-results').click();await pause();assert(copied===chips(num).join(', '),'wrong clipboard text');
    Object.defineProperty(num.w.navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}});
    get(num,'copy-results').click();await pause();assert(get(num,'status').textContent.includes('manually'),'no copy fallback');
  });
  await test('100-coin batch totals and results agree',async()=>{
    get(coin,'quantity').value=100;submit(coin);await pause();
    const values=chips(coin);assert(values.length===100,'wrong coin count');
    const heads=values.filter(v=>v==='Heads').length;
    assert(get(coin,'totals').textContent===`Heads: ${heads} · Tails: ${100-heads} · Total flips: 100`,'wrong totals');
  });
  await test('rapid submit does not count a second batch during animation',async()=>{
    get(coin,'clear-results').click();get(coin,'quantity').value=1;submit(coin);submit(coin);await pause();
    // Reduced-motion preference intentionally completes immediately, without a busy animation.
    const expected=coin.w.matchMedia('(prefers-reduced-motion: reduce)').matches?2:1;
    assert(get(coin,'history').children.length===expected,'duplicate batch during animation');
  });
  await test('best of three ignores disabled quantity and announces a winner',async()=>{
    get(coin,'quantity').value='';get(coin,'coin-mode').value='best';get(coin,'coin-mode').dispatchEvent(new coin.w.Event('change'));
    assert(get(coin,'quantity').disabled,'quantity not disabled');submit(coin);await pause();
    assert(chips(coin).length>=2&&chips(coin).length<=3,'wrong series length');assert(get(coin,'status').textContent.includes('wins'),'missing winner');
    assert(get(coin,'quantity').disabled,'quantity became enabled after animation');
  });
  await test('clearing resets results, totals, and copy availability',()=>{
    for(const p of [num,coin]) {get(p,'clear-results').click();assert(get(p,'history').children.length===0,'history remains');assert(get(p,'copy-results').disabled,'copy active');}
    assert(get(coin,'totals').textContent.endsWith('Total flips: 0'),'totals remain');
  });
  await test('unavailable analytics never prevents generation',()=>{
    num.w.track=()=>{throw Error('analytics blocked');};submit(num);assert(chips(num).length===1,'generation failed');
  });
  await test('both pages fit 320, 390, and 900 pixel viewports',async()=>{
    for(const width of [320,390,900])for(const p of [num,coin]){
      p.frame.style.width=width+'px';await pause();assert(p.d.documentElement.scrollWidth<=width,'horizontal overflow at '+width+' on '+p.frame.title);
    }
    for(const p of [num,coin])p.frame.style.width='390px';
  });
  const failed=results.filter(v=>!v).length;
  document.getElementById('summary').textContent=`${results.length-failed} passed · ${failed} failed`;
  window.TEST_RESULT={passed:results.length-failed,failed};
})();
