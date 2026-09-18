/* Shared page wiring; each tool owns its inputs and explanatory HTML. */
(() => {
  const tool = document.body.dataset.utility;
  const $ = id => document.getElementById(id);
  const form = $('utility-form');
  if (!form) return;
  const isCoin = tool === 'coin-flip';
  let current = [], heads = 0, tails = 0, busy = false;
  const emit = (event, params = {}) => { try { if (typeof track === 'function') track(event, {utility_name: tool, ...params}); } catch {} };
  const read = id => { const input = $(id); return input.value.trim() === '' ? NaN : Number(input.value); };
  function show(values) {
    current = values;
    $('results').replaceChildren(...values.map(value => {
      const chip = document.createElement('span');
      chip.className = 'result-chip';
      chip.textContent = value;
      return chip;
    }));
    $('results').classList.toggle('single', values.length === 1);
    $('copy-results').disabled = false;
  }
  function history(text) {
    const li = document.createElement('li');
    li.textContent = text;
    $('history').prepend(li);
    while ($('history').children.length > 10) $('history').lastChild.remove();
    $('history-empty').hidden = true;
  }
  function reset() {
    if (busy) return;
    current = []; heads = 0; tails = 0;
    $('results').textContent = isCoin ? 'Your flips will appear here.' : 'Your numbers will appear here.';
    $('history').replaceChildren();
    $('history-empty').hidden = false;
    $('copy-results').disabled = true;
    $('error').textContent = '';
    $('status').textContent = 'Results and history cleared.';
    if (isCoin) { $('coin-face').textContent = '?'; $('totals').textContent = 'Heads: 0 · Tails: 0 · Total flips: 0'; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    $('error').textContent = '';
    $('status').textContent = '';
    try {
      if (isCoin) {
        const best = $('coin-mode').value === 'best';
        const batch = RandomTools.coins(best ? 3 : read('quantity'), best);
        busy = true;
        const controls = [...form.querySelectorAll('input, select, button')];
        const disabled = controls.map(control => control.disabled);
        controls.forEach(control => { control.disabled = true; });
        $('coin-face').classList.add('is-flipping');
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => setTimeout(resolve, 350));
        $('coin-face').classList.remove('is-flipping');
        controls.forEach((control, i) => { control.disabled = disabled[i]; });
        busy = false;
        heads += batch.heads; tails += batch.tails;
        show(batch.results);
        $('coin-face').textContent = batch.winner || (batch.results.length === 1 ? batch.results[0] : batch.results.length + ' flips');
        const description = batch.winner ? `${batch.winner} wins ${Math.max(batch.heads, batch.tails)}–${Math.min(batch.heads, batch.tails)}.` : `${batch.heads} heads and ${batch.tails} tails.`;
        $('status').textContent = description;
        $('totals').textContent = `Heads: ${heads} · Tails: ${tails} · Total flips: ${heads + tails}`;
        history(`${best ? 'Best of three' : batch.results.length + ' flip(s)'}: ${batch.results.join(', ')}. ${description}`);
        emit('utility_use', {mode: best ? 'best_of_three' : 'standard', count: batch.results.length});
      } else {
        const min = read('minimum'), max = read('maximum'), count = read('quantity');
        const unique = $('unique').checked;
        const values = RandomTools.numbers(min, max, count, unique);
        show(values);
        $('status').textContent = `${count} number${count === 1 ? '' : 's'} from ${min} to ${max}${unique ? ', no repeats in this draw' : ''}: ${values.join(', ')}.`;
        history(`${min} to ${max}: ${values.join(', ')}`);
        emit('utility_use', {count, no_repeats: unique});
      }
    } catch (error) { $('error').textContent = error.message; }
  });
  $('clear-results').addEventListener('click', reset);
  $('copy-results').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(current.join(', ')); $('status').textContent = 'Results copied.'; emit('utility_copy'); }
    catch { $('status').textContent = 'Copy is unavailable here. Select the results above to copy them manually.'; }
  });
  document.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => {
    $('minimum').value = 1;
    $('maximum').value = button.dataset.range;
    $('error').textContent = '';
    $('status').textContent = `Range set to 1–${button.dataset.range}. Press Generate numbers to draw.`;
  }));
  if (isCoin) $('coin-mode').addEventListener('change', () => {
    $('quantity').disabled = $('coin-mode').value === 'best';
    $('status').textContent = $('quantity').disabled ? 'Best of three stops when Heads or Tails wins twice.' : 'Choose how many coins to flip.';
  });
  document.querySelectorAll('[data-utility-link]').forEach(link => link.addEventListener('click', () => emit('utility_to_utility', {from_utility: tool, to_utility: link.dataset.utilityLink})));
  document.querySelectorAll('[data-game-link]').forEach(link => link.addEventListener('click', () => emit('utility_to_game', {game_name: link.dataset.gameLink})));
  emit('utility_view');
})();
