# Sudoku V1

120 distinct puzzles, generated offline specifically for PuzzleTen: 30 Easy, 30 Medium, 30 Hard, and 30 Expert. The local dataset is about 21 KB before compression. No third-party puzzle source, network request, backend, or browser puzzle generator is used.

Each entry is one 162-character string: 81 clue digits (0 means blank), followed by the 81-digit unique solution. Solutions let the UI check completion, detect mistakes, and reveal a hint without running a solver. The collection and difficulty arrays are frozen; selection returns fresh arrays.

## Difficulty rubric

Labels are estimates based on techniques, not a universal human difficulty score:

- Easy: solvable with naked singles alone.
- Medium: hidden singles are needed in addition to naked singles.
- Hard: requires locked candidates and/or naked pairs in addition to singles.
- Expert: the above technique set does not finish the puzzle; more advanced deductions or search are needed. This tier can vary in perceived difficulty.

## Integration

Load `puzzles.js` before `model.js`. On New Game, call `SudokuModel.select(SudokuPuzzles, difficulty, previousIndex)`. Keep the previous index separately for each difficulty, initially -1; update it after each selection. This selects uniformly among all alternatives, excluding the last puzzle in that difficulty when possible. Remember these indices in local storage only if avoiding repeats across reloads is desired.

The returned object has `difficulty`, `index`, `givens`, and `solution`. Initialize the editable board using `puzzle.givens.slice()` and lock nonzero givens in the UI. The model provides `complete`, `mistakes`, `conflicts`, and `hint`. A hint returns the selected incorrect/blank editable cell, or the first such cell when none is selected. The caller applies the returned value and updates its own gameplay state.

## Playable game

`index.html` serves the `/sudoku/` SEO page. `sudoku.js` provides the board and controls; `sudoku.css` scopes the page layout. Shared site styles, footer, and analytics are reused. The homepage Recommended row links to Sudoku with a lightweight SVG cover.

The controller supports keyboard/touch number input, pencil notes, erase, hints, immediate solution-based mistake feedback, unit and matching-value highlights, a visible-tab timer, confirmed replacement of in-progress games, and completion. Correct entries prune matching peer notes; wrong answers remain editable. Hints reveal answers and do not claim to teach a solving technique.

Progress is saved under `puzzleten:sudoku:v1` on changes, every ten seconds, and when the page hides. Restore validates the saved data against the bundled clues before accepting it; altered clues and malformed saves are discarded. The completed state is derived from the board, not trusted from storage. No account or cross-device synchronization is provided. Storage or analytics failure does not stop play.

Run browser gameplay tests by serving the repository and opening `/tests/sudoku.html`. Tests use an isolated fixture and test storage, leaving normal saved games alone. The GitHub Actions workflow validates every puzzle's uniqueness and difficulty on relevant pull requests and pushes to main.

## Verification

Run from the repository root:

```sh
node --test tests/sudoku.test.js
python3 tests/sudoku-difficulty.py
```

The Node suite independently counts solutions up to two for every puzzle, checks that its unique result matches the stored solution, validates all rows/columns/boxes and clues, and tests selection and gameplay helpers. The Python check verifies all difficulty assignments against the documented technique rubric. Both solvers are test-only; neither is referenced by a browser page.

Number-pad buttons highlight the last entered digit. Pointer-based dragging supports mouse, pen, and touch: drop a pad digit on an editable cell (including notes), or drag an entered answer outside the board to erase. Cancelled/invalid drops preserve the board. No drag library is used.
