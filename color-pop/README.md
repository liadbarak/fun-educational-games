# Color Pop

Original PuzzleTen color matching game. All code, layout, bubble drawings, procedural levels and SVG cover were made for this project. No game engine, borrowed game assets, external puzzle service, sound files, or added packages.

- `model.js`: pure hex-grid geometry, original clustered layouts, exact ray/circle collision paths with wall reflection, attachment, connected groups, floating drops, score/combo and level rules.
- `game.js`: pointer and keyboard input, canvas drawing, bounded effects, DOM HUD and dialogs. Rendering runs on interaction or while a shot/effect is active, stops in hidden tabs, and respects reduced motion. Shared analytics and footer come from `shared/shell.js`.
- `index.html`: static indexable rules and metadata; canonical `/color-pop/`.

Level 1 has five rows and a goal of 30 cleared bubbles. Goals rise by five per level to 75. Depth rises every two levels to eight rows, with a staggered lower edge after level 1. The palette expands from five to six at level 4. Progression is intentionally capped; subsequent boards vary without adding special mechanics. Five nonmatching shots (not necessarily consecutive) add a row. Popped and dropped bubbles count toward the goal. A clear board also wins. Topology is preserved when a row arrives by flipping the hex row phase.

Score: 10 per pop, 20 per drop, plus 15 × (combo − 1) for successive matching shots. Retrying a level resets its points, preserving prior levels. Runs are session-only; no restoration is promised. Each color has a stable symbol. Canvas board play is supplemented by keyboard aiming, buttons, text progress and live status, but it is not a full nonvisual representation of the spatial board.

Run `node --test tests/color-pop.test.js`. Serve the repository and visit `/tests/color-pop.html` for browser gameplay tests, isolated from production analytics. Tests cover topology, bounces, attachment, group clearing, disconnected drops, score, progression, danger, pointer cancellation, restart, keyboard, reduced motion, and simulated play. The game shares the exact traced trajectory between the guide and projectile animation.
