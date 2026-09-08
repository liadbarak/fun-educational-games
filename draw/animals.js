/*
 * Step-by-step drawings, one entry per animal.
 *
 * Every animal starts as a numeral, and each later step adds strokes on top.
 * A step's `svg` is drawn in the accent colour; every earlier step is redrawn
 * underneath it in grey, so a learner always sees what is new.
 *
 * Coordinates are a 200x200 viewBox. Strokes only — no fills except the eyes —
 * because the whole thing has to survive being printed in black and white.
 *
 * Picking the numeral matters more than the drawing does. A number whose shape
 * is already most of the animal (2 is a swan's neck, 8 is a head on a body)
 * gives a tutorial that works. A number that only touches the animal in one
 * place does not: an elephant built on a 6 read as two circles and was cut.
 */
const ANIMALS = [
  {
    key: 'swan',
    name: 'Swan',
    article: 'a',
    numeral: '2',
    accent: '#2F7FA8',
    steps: [
      {
        caption: 'Draw a big number 2.',
        svg: '<path d="M58,70 C58,42 90,28 114,42 C140,57 132,88 106,108 L62,150 L152,150"/>',
      },
      {
        caption: 'Round the top into a head and add a beak.',
        svg: '<path d="M58,70 C50,56 58,40 74,36"/>' +
             '<path d="M58,62 L34,70 L58,78"/>',
      },
      {
        caption: 'Sweep the body up from the water line.',
        svg: '<path d="M64,148 C66,120 94,108 124,110 C156,112 174,130 170,148"/>',
      },
      {
        caption: 'Add a wing, an eye and a few ripples.',
        svg: '<path d="M104,132 C126,124 148,130 154,144"/>' +
             '<circle cx="76" cy="56" r="3.5" fill="currentColor" stroke="none"/>' +
             '<path d="M22,164 C42,158 62,168 82,162 C102,156 122,166 142,160 C158,156 170,160 180,162"/>',
      },
    ],
  },

  {
    key: 'owl',
    name: 'Owl',
    article: 'an',
    numeral: '8',
    accent: '#A8531B',
    steps: [
      {
        caption: 'Draw a big number 8 — a small circle on a bigger one.',
        svg: '<circle cx="100" cy="68" r="32"/><circle cx="100" cy="134" r="42"/>',
      },
      {
        caption: 'The small circle is the face. Give it two big eyes and a beak.',
        svg: '<circle cx="86" cy="64" r="12"/><circle cx="114" cy="64" r="12"/>' +
             '<circle cx="88" cy="65" r="4" fill="currentColor" stroke="none"/>' +
             '<circle cx="112" cy="65" r="4" fill="currentColor" stroke="none"/>' +
             '<path d="M100,76 L93,88 L107,88 Z"/>',
      },
      {
        caption: 'Add pointy ear tufts, and a wing down each side.',
        svg: '<path d="M78,44 L70,26 L90,37"/><path d="M122,44 L130,26 L110,37"/>' +
             '<path d="M62,118 C50,134 52,158 66,170"/>' +
             '<path d="M138,118 C150,134 148,158 134,170"/>',
      },
      {
        caption: 'Finish with two feet and a branch to sit on.',
        svg: '<path d="M88,176 L88,186 M81,186 L95,186"/>' +
             '<path d="M112,176 L112,186 M105,186 L119,186"/>' +
             '<path d="M14,192 L186,192"/>',
      },
    ],
  },
];
