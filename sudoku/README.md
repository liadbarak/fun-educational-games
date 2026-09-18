# Sudoku V1 puzzle collection

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

This change prepares data and model APIs; it does not add a playable page, New Game button, or navigation entry.

## Verification

Run from the repository root:

```sh
node --test tests/sudoku.test.js
python3 tests/sudoku-difficulty.py
```

The Node suite independently counts solutions up to two for every puzzle, checks that its unique result matches the stored solution, validates all rows/columns/boxes and clues, and tests selection and gameplay helpers. The Python check verifies all difficulty assignments against the documented technique rubric. Both solvers are test-only; neither is referenced by a browser page.
