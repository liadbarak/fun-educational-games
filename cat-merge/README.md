# Cat Merge

Original DOM/SVG garden puzzle. No runtime dependencies, image downloads, game engine, or build step.

- `model.js`: pure immutable state transitions, 4×4 adjacency, arrivals, scoring and end conditions.
- `cats.js`: twelve original code-drawn portraits and one hidden silhouette.
- `game.js`: Pointer Events, two-tap/keyboard controls, short effects, shared audio/analytics, resilient local storage.
- `index.html`: static indexable guide, metadata and VideoGame description; game runs client-side.

Two orthogonally adjacent equal cats merge. A cat can move to any empty cell. Each action brings the previewed arrival, except every third merge, which earns breathing room. Arrival level follows the current round's highest evolution (three levels behind, capped at eight); 70% of placements prefer an available matching neighbor. Score per merge is `10 × 2^sourceLevel`. A full board with no matching neighbors loses. Creating level 12 wins. This progression allows all twelve cats through ordinary play without carrying a previous collection into round difficulty.

Only `cat-merge:v1` stores this game's round, best score, discovered levels and tutorial flag. Malformed or inaccessible storage falls back to a fresh game. Sound uses the site's existing preference. Analytics uses existing `track` with `game_name: cat_merge`: game_view, game_start, cat_discovered, game_over. No player data is collected.

Validation:

```
node --test tests/*.test.js
node --check cat-merge/game.js
```

Serve the repository and open `/tests/cat-merge.html` for browser checks. The suite uses isolated in-memory storage, not the player's saved round. Includes every evolution, both endings, full legal seeded rounds, restoration, restart, accessibility, drag/cancellation, and narrow-container checks. Native touch behavior should also be checked on physical devices before broad release.
