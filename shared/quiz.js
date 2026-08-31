/*
 * A small multiple-choice maths prompt that any game can raise mid-play.
 *
 * Deliberately gentle: a wrong answer costs nothing, says what the answer was,
 * and moves on. The goal is a moment of practice, not a test.
 */

const MathQuiz = (function () {
  const CORRECT_MS = 1400;  // how long the "nice one" message stays up
  const WRONG_MS   = 2600;  // longer, so there is time to read the answer

  let panel = null;
  let dismissTimer = null;

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'quiz-panel';
    document.body.appendChild(panel);
    return panel;
  }

  function hide() {
    if (panel) panel.style.display = 'none';
  }

  /* Two plausible near-misses, never negative and never a repeat of the answer. */
  function buildChoices(answer) {
    const choices = new Set([answer]);
    let offset = 1;
    while (choices.size < 3) {
      if (answer + offset <= 18) choices.add(answer + offset);
      if (choices.size < 3 && answer - offset >= 0) choices.add(answer - offset);
      offset++;
    }
    return shuffle([...choices]);
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  /**
   * Shows a question built from two digits and calls back once it is resolved.
   *
   * @param {number}   a
   * @param {number}   b
   * @param {function} onResult  Receives true if answered correctly.
   */
  function ask(a, b, onResult) {
    clearTimeout(dismissTimer);
    const box = ensurePanel();

    /* Subtraction is ordered larger - smaller so the answer is never negative. */
    const isAdd = Math.random() < 0.5;
    const [left, right] = isAdd ? [a, b] : [Math.max(a, b), Math.min(a, b)];
    const answer = isAdd ? left + right : left - right;
    const symbol = isAdd ? '+' : '−';

    box.className = '';
    box.style.display = 'block';
    box.innerHTML = `
      <div class="quiz-question">${left} ${symbol} ${right} = ?</div>
      <div class="quiz-choices">
        ${buildChoices(answer).map(n => `<button class="quiz-choice" data-value="${n}">${n}</button>`).join('')}
      </div>
    `;

    box.querySelectorAll('.quiz-choice').forEach(btn =>
      btn.addEventListener('click', () => settle(Number(btn.dataset.value) === answer, answer, onResult), { once: true })
    );
  }

  function settle(correct, answer, onResult) {
    const box = ensurePanel();
    box.className = correct ? 'is-correct' : 'is-wrong';
    box.innerHTML = correct
      ? `<div class="quiz-result">🎉 Nice one!</div><div class="quiz-note">+50 bonus points</div>`
      : `<div class="quiz-result">The answer is ${answer}</div><div class="quiz-note">No worries — let's try again next time!</div>`;

    dismissTimer = setTimeout(() => {
      hide();
      onResult(correct);
    }, correct ? CORRECT_MS : WRONG_MS);
  }

  return { ask, hide };
})();
