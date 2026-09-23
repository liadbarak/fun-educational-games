const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function fixture(deferStartUntilInput) {
  const events=[]; const box={innerHTML:''};
  const overlay={style:{},querySelector:()=>box,addEventListener(){}};
  const context=vm.createContext({document:{createElement:()=>overlay,body:{appendChild(){},classList:{toggle(){}}},getElementById:()=>null,addEventListener(){}},track:(...args)=>events.push(args),HighScore:{read:()=>0,write(){}},requestAnimationFrame:()=>1,Date});
  const source=fs.readFileSync(require.resolve('../shared/shell.js'),'utf8');
  vm.runInContext(source.slice(source.indexOf('function createGameShell(')),context);
  const shell=context.createGameShell({name:'test',stepMs:1000,deferStartUntilInput,onReset(){},onStep(){},onDraw(){}});
  return {shell,events,overlay};
}
test('existing games still track each start and hide the overlay',()=>{
  const {shell,events,overlay}=fixture(false);shell.start();shell.start();
  assert.equal(events.length,2);assert.equal(overlay.style.display,'none');assert.equal(shell.isBlocked(),false);
});
test('preview games track first interaction once and reset for replay',()=>{
  const {shell,events}=fixture(true);shell.start();assert.equal(events.length,0);
  shell.markStarted();shell.markStarted();assert.equal(events.length,1);
  shell.start();assert.equal(events.length,1);shell.markStarted();assert.equal(events.length,2);
});
