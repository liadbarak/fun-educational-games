const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const YesNo=require('../yes-or-no-generator/model.js');
test('uniform 32-bit input is split equally by parity, including both endpoints',()=>{
  for(const [word,answer] of [[0,'YES'],[1,'NO'],[2,'YES'],[2147483647,'NO'],[2147483648,'YES'],[4294967294,'YES'],[4294967295,'NO']])assert.equal(YesNo.answer(()=>word),answer);
  // Each possible even value has one adjacent odd value: 2^31 of each.
  const counts={YES:0,NO:0};for(let n=0;n<65536;n++)counts[YesNo.answer(()=>n)]++;
  assert.deepEqual(counts,{YES:32768,NO:32768});
});
test('every answer reads a fresh sample, with no alternation or history bias',()=>{
  const values=[0,0,0,1,1,0];let calls=0;
  assert.deepEqual(values.map(()=>YesNo.answer(()=>values[calls++])),['YES','YES','YES','NO','NO','YES']);assert.equal(calls,6);
});
test('random source failure is not silently replaced with a biased result',()=>{
  assert.throws(()=>YesNo.answer(()=>{throw Error('unavailable');}),/unavailable/);
});
test('SEO page has one H1, self canonical, unique title, indexable markup and sitemap entry',()=>{
  const html=readFileSync('yes-or-no-generator/index.html','utf8');
  assert.equal((html.match(/<h1\b/g)||[]).length,1);assert(html.includes('<h1>Yes or No Generator</h1>'));
  assert(html.includes('<title>Yes or No Generator – Random Yes or No Answer | PuzzleTen</title>'));
  assert(html.includes('<link rel="canonical" href="https://puzzleten.com/yes-or-no-generator/">'));
  assert(!/noindex/i.test(html));
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(schema.url,'https://puzzleten.com/yes-or-no-generator/');
  assert(readFileSync('sitemap.xml','utf8').includes('<loc>https://puzzleten.com/yes-or-no-generator/</loc>'));
  assert(readFileSync('index.html','utf8').includes('href="yes-or-no-generator/"'));
  for(const route of ['coin-flip','random-number-generator','spin-the-wheel','random-name-picker'])assert(html.includes('href="../'+route+'/"'));
});
