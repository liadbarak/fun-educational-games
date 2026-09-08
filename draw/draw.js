/*
 * Renders one animal as four numbered steps, plus a printable sheet.
 *
 * Each step redraws every earlier step in grey underneath the new strokes, so
 * the page never asks the reader to remember what they already drew. That is
 * the whole trick, and it is why the steps are stored as additive fragments
 * rather than four complete pictures.
 */
(function () {
  const app = document.getElementById('draw-app');
  const animal = ANIMALS.find(a => a.key === app.dataset.animal);

  document.documentElement.style.setProperty('--accent', animal.accent);

  /* Steps 0..n-1 in grey, step n in the accent colour. */
  function frame(n) {
    const prev = animal.steps.slice(0, n).map(s => s.svg).join('');
    return `<svg viewBox="0 0 200 200" class="draw-svg" role="img"
                 aria-label="Step ${n + 1} of drawing a ${animal.name.toLowerCase()}">
              <g class="prev">${prev}</g>
              <g class="new">${animal.steps[n].svg}</g>
            </svg>`;
  }

  /*
   * Print sits above the steps, not below them. Printing is the reason most
   * of this page's traffic will arrive, so burying the button under four
   * pictures would be backwards — the same call the word search made.
   */
  app.innerHTML =
    `<div class="draw-actions">
       <button id="draw-print" class="draw-print">Print this page</button>
     </div>
     <div class="draw-grid">` +
    animal.steps.map((step, n) =>
      `<figure class="draw-step">
         <div class="draw-box">${frame(n)}<span class="draw-num">${n + 1}</span></div>
         <figcaption>${step.caption}</figcaption>
       </figure>`).join('') +
    `</div>`;

  document.getElementById('draw-print').addEventListener('click', () => window.print());
})();
