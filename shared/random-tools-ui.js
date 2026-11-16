/* Shared page wiring; each tool owns its inputs and explanatory HTML. */
(() => {
  const tool = document.body.dataset.utility;
  const $ = id => document.getElementById(id);
  const form = $('utility-form');
  if (!form) return;
  const isCoin = tool === 'coin-flip';
  const language = isCoin ? document.documentElement.lang : 'en';
  const coinText = {
    en: {
      heads: 'Heads',
      tails: 'Tails',
      flips: count => count + ' flips',
      historyFlips: count => count + ' flip(s)',
      best: 'Best of three',
      winner: (face, high, low) => `${face} wins ${high}–${low}.`,
      summary: (heads, tails) => `${heads} heads and ${tails} tails.`,
      totals: (heads, tails) => `Heads: ${heads} · Tails: ${tails} · Total flips: ${heads + tails}`,
      bestHint: 'Best of three stops when Heads or Tails wins twice.',
      quantityHint: 'Choose how many coins to flip.',
      cleared: 'Results and history cleared.',
      copied: 'Results copied.',
      copyUnavailable: 'Copy is unavailable here. Select the results above to copy them manually.'
    },
    de: {
      heads: 'Kopf',
      tails: 'Zahl',
      flips: count => `${count} Würfe`,
      historyFlips: count => count === 1 ? '1 Wurf' : `${count} Würfe`,
      best: 'Zwei aus drei',
      winner: (face, high, low) => `${face} gewinnt ${high}:${low}.`,
      summary: (heads, tails) => `${heads}× Kopf und ${tails}× Zahl.`,
      totals: (heads, tails) => `Kopf: ${heads} · Zahl: ${tails} · Würfe insgesamt: ${heads + tails}`,
      bestHint: 'Die Runde endet, sobald Kopf oder Zahl zweimal gefallen ist.',
      quantityHint: 'Wähle, wie viele Münzen du werfen möchtest.',
      cleared: 'Ergebnisse und Verlauf wurden gelöscht.',
      copied: 'Ergebnisse kopiert.',
      copyUnavailable: 'Automatisches Kopieren ist hier nicht möglich. Markiere die Ergebnisse oben, um sie zu kopieren.',
      quantityError: 'Gib eine ganze Zahl zwischen 1 und 100 ein.',
      rollError: 'Der Münzwurf ist fehlgeschlagen. Versuche es erneut.'
    }
  };
  const coin = { ...coinText.en, ...coinText[language] };
  const coinFace = face => face === 'Heads' ? coin.heads : coin.tails;
  const initialResults = $('results').textContent;
  if (coin.quantityError) {
    const quantity = $('quantity');
    quantity.addEventListener('invalid', () => quantity.setCustomValidity(coin.quantityError));
    quantity.addEventListener('input', () => quantity.setCustomValidity(''));
  }
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
    $('results').textContent = isCoin ? initialResults : 'Your numbers will appear here.';
    $('history').replaceChildren();
    $('history-empty').hidden = false;
    $('copy-results').disabled = true;
    $('error').textContent = '';
    $('status').textContent = coin.cleared;
    if (isCoin) { $('coin-face').textContent = '?'; $('totals').textContent = coin.totals(0, 0); }
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
        const results = batch.results.map(coinFace);
        const winner = batch.winner && coinFace(batch.winner);
        show(results);
        $('coin-face').textContent = winner || (results.length === 1 ? results[0] : coin.flips(results.length));
        const description = winner
          ? coin.winner(winner, Math.max(batch.heads, batch.tails), Math.min(batch.heads, batch.tails))
          : coin.summary(batch.heads, batch.tails);
        $('status').textContent = description;
        $('totals').textContent = coin.totals(heads, tails);
        history(`${best ? coin.best : coin.historyFlips(results.length)}: ${results.join(', ')}. ${description}`);
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
    } catch (error) { $('error').textContent = coin.rollError ?? error.message; }
  });
  $('clear-results').addEventListener('click', reset);
  $('copy-results').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(current.join(', ')); $('status').textContent = coin.copied; emit('utility_copy'); }
    catch { $('status').textContent = coin.copyUnavailable; }
  });
  document.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => {
    $('minimum').value = 1;
    $('maximum').value = button.dataset.range;
    $('error').textContent = '';
    $('status').textContent = `Range set to 1–${button.dataset.range}. Press Generate numbers to draw.`;
  }));
  if (isCoin) $('coin-mode').addEventListener('change', () => {
    $('quantity').disabled = $('coin-mode').value === 'best';
    $('status').textContent = $('quantity').disabled ? coin.bestHint : coin.quantityHint;
  });
  document.querySelectorAll('[data-utility-link]').forEach(link => link.addEventListener('click', () => emit('utility_to_utility', {from_utility: tool, to_utility: link.dataset.utilityLink})));
  document.querySelectorAll('[data-game-link]').forEach(link => link.addEventListener('click', () => emit('utility_to_game', {game_name: link.dataset.gameLink})));
  emit('utility_view');
})();
