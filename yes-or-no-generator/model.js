/* Two equally sized outcomes; questions and previous answers are never inputs. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../shared/random-tools.js'));
  else root.YesNo = factory(RandomTools);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(random) {
  function answer(source) {
    return random.integer(0, 1, source) === 0 ? 'YES' : 'NO';
  }
  return {answer};
});
