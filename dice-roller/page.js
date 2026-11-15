new DiceRoller(document.getElementById('dice-roller'), {
  analytics: track,
  language: document.documentElement.lang,
  pageName: 'dice-roller'
});

track('utility_view', { utility_name: 'dice-roller' });
document.querySelectorAll('[data-game-link]').forEach(link => {
  link.addEventListener('click', () => track('utility_to_game', {
    utility_name: 'dice-roller',
    game_name: link.dataset.gameLink
  }));
});
document.querySelectorAll('[data-utility-link]').forEach(link => {
  link.addEventListener('click', () => track('utility_to_utility', {
    from_utility: 'dice-roller',
    to_utility: link.dataset.utilityLink
  }));
});
renderFooter('/');
