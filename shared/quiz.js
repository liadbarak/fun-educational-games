/*
 * A small multiple-choice prompt that any game can raise mid-play.
 *
 * Deliberately gentle: a wrong answer costs nothing, says what the right answer
 * was, and moves on. The goal is a moment of practice, not a test.
 *
 * Quiz.ask()     — generic, any question and choices
 * Quiz.askMath() — convenience wrapper for "a + b = ?"
 */

const Quiz = (function () {
  const CORRECT_MS = 1500;  // how long the "nice one" message stays up
  const WRONG_MS   = 2800;  // longer, so there is time to read the answer

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
    clearTimeout(dismissTimer);
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  /**
   * @param {object}   q
   * @param {string}   [q.prompt]   Small line above the question.
   * @param {string}   q.question   The question itself, shown large.
   * @param {string[]} q.choices    Buttons to offer, in any order.
   * @param {string}   q.answer     The choice that is correct.
   * @param {string}   [q.praise]   Shown on a correct answer.
   * @param {string}   [q.teach]    Shown under the answer when wrong.
   * @param {function} q.onResult   Receives true if answered correctly.
   */
  function ask(q) {
    clearTimeout(dismissTimer);
    const box = ensurePanel();

    box.className = '';
    box.style.display = 'block';
    box.innerHTML = `
      ${q.prompt ? `<div class="quiz-prompt">${q.prompt}</div>` : ''}
      <div class="quiz-question">${q.question}</div>
      <div class="quiz-choices">
        ${shuffle([...q.choices]).map(c => `<button class="quiz-choice">${c}</button>`).join('')}
      </div>
    `;

    box.querySelectorAll('.quiz-choice').forEach(btn =>
      btn.addEventListener('click', () => settle(btn.textContent === q.answer, q), { once: true })
    );
  }

  function settle(correct, q) {
    const box = ensurePanel();
    box.className = correct ? 'is-correct' : 'is-wrong';
    box.innerHTML = correct
      ? `<div class="quiz-result">🎉 ${q.praise || 'Nice one!'}</div>
         <div class="quiz-note">+50 bonus points</div>`
      : `<div class="quiz-result">It's ${q.answer}</div>
         <div class="quiz-note">${q.teach || "No worries — now you know!"}</div>`;

    dismissTimer = setTimeout(() => {
      hide();
      q.onResult(correct);
    }, correct ? CORRECT_MS : WRONG_MS);
  }

  /* Two plausible near-misses, never negative and never a repeat of the answer. */
  function numberChoices(answer) {
    const choices = new Set([answer]);
    let offset = 1;
    while (choices.size < 3) {
      if (answer + offset <= 18) choices.add(answer + offset);
      if (choices.size < 3 && answer - offset >= 0) choices.add(answer - offset);
      offset++;
    }
    return [...choices].map(String);
  }

  /** Builds an addition or subtraction question from two digits. */
  function askMath(a, b, onResult) {
    /* Subtraction is ordered larger - smaller so the answer is never negative. */
    const isAdd = Math.random() < 0.5;
    const [left, right] = isAdd ? [a, b] : [Math.max(a, b), Math.min(a, b)];
    const answer = isAdd ? left + right : left - right;

    ask({
      prompt: 'Quick maths!',
      question: `${left} ${isAdd ? '+' : '−'} ${right} = ?`,
      choices: numberChoices(answer),
      answer: String(answer),
      praise: 'Nice one!',
      teach: "No worries — let's try again next time!",
      onResult,
    });
  }

  return { ask, askMath, hide };
})();
