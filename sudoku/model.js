/* Local selection and validation only: there is no runtime puzzle generator. */
const SudokuModel = (() => {
  const levels = ['easy', 'medium', 'hard', 'expert'];
  function select(collection, difficulty, previousIndex = -1, random = Math.random) {
    if (!levels.includes(difficulty)) throw new Error('Choose a supported difficulty.');
    const entries = collection[difficulty];
    if (!Array.isArray(entries) || entries.length === 0) throw new Error('No puzzles are available.');
    const skip = entries.length > 1 && Number.isInteger(previousIndex) && previousIndex >= 0 && previousIndex < entries.length;
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random value.');
    let index = Math.floor(value * (entries.length - (skip ? 1 : 0)));
    if (skip && index >= previousIndex) index++;
    const packed = entries[index];
    if (!/^[0-9]{81}[1-9]{81}$/.test(packed)) throw new Error('Invalid puzzle data.');
    return {difficulty, index, givens: [...packed.slice(0,81)].map(Number), solution: [...packed.slice(81)].map(Number)};
  }
  function conflicts(board, index) {
    const value = board[index];
    if (!value) return [];
    const row = Math.floor(index / 9), col = index % 9;
    return board.flatMap((n, i) => i !== index && n === value &&
      (Math.floor(i / 9) === row || i % 9 === col ||
       (Math.floor(i / 27) === Math.floor(row / 3) && Math.floor((i % 9) / 3) === Math.floor(col / 3))) ? [i] : []);
  }
  function mistakes(board, solution) {
    return board.flatMap((value, index) => value !== 0 && value !== solution[index] ? [index] : []);
  }
  function complete(board, solution) {
    return board.length === 81 && solution.length === 81 && board.every((value, i) => value === solution[i]);
  }
  function hint(board, puzzle, selected = -1) {
    const available = i => i >= 0 && i < 81 && puzzle.givens[i] === 0 && board[i] !== puzzle.solution[i];
    const index = available(selected) ? selected : board.findIndex((_, i) => available(i));
    return index < 0 ? null : {index, value: puzzle.solution[index]};
  }
  return {levels, select, conflicts, mistakes, complete, hint};
})();
if (typeof module !== 'undefined') module.exports = SudokuModel;
