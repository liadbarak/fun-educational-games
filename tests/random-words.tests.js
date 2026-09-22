(async () => {
  const fixture = document.getElementById('fixture'), template = fixture.innerHTML;
  const results = [], assert = (value, message) => { if (!value) throw Error(message); };
  let page, events, copied;
  function setup(options = {}) {
    fixture.innerHTML = template; events = []; copied = '';
    page = new RandomWordPage(document.getElementById('word-tool'), {source: () => 0, writeClipboard: async text => {copied = text;}, analytics: (name, params) => events.push({name, ...params}), ...options});
  }
  function change(id, value) {page.$(id).value = String(value); page.$(id).dispatchEvent(new Event('change', {bubbles: true}));}
  async function test(name, run) {
    setup(); const li = document.createElement('li');
    try {await run(); li.className = 'pass'; li.textContent = 'PASS: ' + name; results.push(true);}
    catch (e) {li.className = 'fail'; li.textContent = 'FAIL: ' + name + ' — ' + e.message; results.push(false);}
    document.getElementById('test-results').append(li);
  }
  await test('defaults show one prominent word without counting a user action', () => {
    assert(page.current.length === 1 && page.$('word-type').value === 'all', 'defaults');
    assert(page.$('word-results').classList.contains('single'), 'single styling');
    assert(events.filter(e => e.name === 'utility_view').length === 1, 'view event');
    assert(!events.some(e => e.name === 'utility_use'), 'automatic draw counted');
  });
  await test('Generate Word and Generate Again each draw a fresh word', () => {
    const first = page.current[0]; page.$('generate-word').click();
    assert(page.current[0] !== first, 'submit repeated');
    const second = page.current[0]; page.$('generate-again').click();
    assert(page.current[0] !== second, 'again repeated');
    assert(events.filter(e => e.name === 'utility_use').length === 2, 'use event count');
  });
  await test('all quantities and types render separate valid items in every mode', () => {
    for (const mode of WordGenerator.modes) {
      page.root.querySelector('[data-word-mode="' + mode + '"]').click();
      for (const type of WordGenerator.types) for (const count of WordGenerator.quantities) {
        change('word-type', type); change('word-count', count);
        assert(page.$('word-results').children.length === count, 'wrong result count');
        assert(page.current.every(word => WordGenerator.pool(type, mode).includes(word)), 'wrong pool');
        assert(new Set(page.current).size === count, 'repeated word');
      }
    }
  });
  await test('game modes visibly change selection and preserve chosen controls', () => {
    change('word-count', 5); change('word-type', 'verbs');
    page.root.querySelector('[data-word-mode="charades"]').click();
    assert(page.current.length === 5 && page.$('word-type').value === 'verbs', 'filters reset');
    assert(page.root.querySelectorAll('[data-word-mode][aria-pressed="true"]').length === 1, 'mode selection');
    assert(page.$('result-label').textContent === 'Charades Words · Verbs', 'result label');
    page.root.querySelector('[data-word-mode="everyday"]').click(); assert(page.mode === 'everyday', 'return mode');
  });
  await test('Copy Words passes the exact displayed batch with newline separators', async () => {
    change('word-count', 10); await page.copy();
    assert(copied === page.current.join('\n'), 'clipboard text');
    assert(page.$('word-status').textContent === 'Words copied.', 'confirmation');
    assert(events.some(e => e.name === 'utility_copy'), 'copy analytics');
  });
  await test('blocked clipboard exposes a selected, readonly manual-copy field', async () => {
    setup({writeClipboard: async () => {throw Error('blocked');}}); await page.copy();
    assert(!page.$('copy-fallback').hidden, 'no fallback');
    assert(page.$('manual-copy').value === page.current.join('\n'), 'fallback text');
    assert(page.$('manual-copy').readOnly, 'editable fallback');
    assert(page.$('manual-copy').selectionEnd === page.$('manual-copy').value.length, 'not selected');
    assert(!events.some(e => e.name === 'utility_copy'), 'false success');
    page.generate(); assert(page.$('copy-fallback').hidden, 'stale fallback');
  });
  await test('generation during pending copy reports the previous batch honestly', async () => {
    let complete; setup({writeClipboard: () => new Promise(resolve => {complete = resolve;})});
    const pending = page.copy(); page.generate();
    assert(page.$('copy-words').disabled, 'concurrent copy allowed');
    complete(); await pending;
    assert(page.$('word-status').textContent === 'Your previous words were copied.', 'stale success');
    assert(!page.$('copy-words').disabled, 'copy remains disabled');
  });
  await test('analytics failure does not break generation or copying', async () => {
    setup({analytics: () => {throw Error('blocked');}}); change('word-count', 3); await page.copy();
    assert(page.current.length === 3 && copied === page.current.join('\n'), 'analytics broke tool');
  });
  const failed = results.filter(x => !x).length;
  document.getElementById('summary').textContent = `${results.length - failed} passed · ${failed} failed`;
})();

// User-activated integration check for the real browser Clipboard API.
const clipboardCheck = document.createElement('button');
clipboardCheck.type = 'button';
clipboardCheck.textContent = 'Verify browser clipboard';
const clipboardStatus = document.createElement('p');
clipboardStatus.id = 'clipboard-check-result';
clipboardStatus.setAttribute('role', 'status');
clipboardCheck.onclick = async () => {
  const text = [...document.querySelectorAll('#word-results li')].map(item => item.textContent).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    const actual = await navigator.clipboard.readText();
    clipboardStatus.textContent = actual === text ? 'PASS: browser clipboard round trip matches displayed words.' : 'FAIL: browser clipboard differs from displayed words.';
  } catch { clipboardStatus.textContent = 'Browser clipboard access is unavailable in this environment; manual fallback tests cover this case.'; }
};
document.querySelector('main').append(clipboardCheck, clipboardStatus);
