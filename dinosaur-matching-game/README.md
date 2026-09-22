# Dino Nestkeepers

Original PuzzleTen dinosaur egg matching game at `/dinosaur-matching-game/`. Vanilla DOM, CSS dinosaur artwork and a small rules module; no added dependencies, image downloads, game engine, accounts or backend. Shared theme, footer, analytics and synthesized sound are reused. The SVG homepage cover is original.

## Rules

Three lives and three initial species. At most three eggs are present. Falling uses normalized board coordinates and frame deltas. Dragging or selecting freezes that egg only. Tap then nest, or Tab/Enter then keys 1–5 are alternatives. Wrong nests consume the egg and one life; empty/locked drops and pointer cancellation do not. Missed eggs cost one life. Three correct eggs in a nest hatch its dinosaur and reset that nest's progress. A correct egg scores 10, rising to 15 from the third consecutive correct egg. Each hatch adds 50. Wrong/missed eggs break the streak.

Stegosaurus unlocks after three hatches in a run; Ankylosaurus after six. Five fixed nest slots prevent existing nests from moving when a species unlocks. Unlocks pause for acknowledgement before new eggs arrive. Fall speed and spawn frequency are capped. Newborn eggs use separated lanes.

The tutorial is frozen, penalty-free and awards no points/discoveries. Replaying it preserves the active run. Visibility changes, page exit, resize, collection and modal dialogs pause the run. Resume is explicit after interruptions. Reduced motion suppresses CSS effects. Sound failure is caught; its mute preference follows the site's shared setting.

## Persistence and analytics

`puzzleten:dino-nestkeepers:v1` stores a validated versioned object: best score, completed tutorial, discovered species indices. Corrupt data is rejected; storage failures do not prevent play. Runs are intentionally not restored after reload. Collection discoveries persist; unlocked nests reset each run.

Shared `track` receives `game_view`, `game_start`, `game_over`, `game_restart`, `dino_tutorial_complete`, `dino_hatched`, and `dino_species_discovered`, all tagged `game_name: dino_nestkeepers`. Correct/wrong/missed egg counts are aggregated in `game_over`; no per-frame or per-egg analytics requests. Browser tests inject a local recorder and do not load production analytics.

## Verification

- `node --test tests/dino-model.test.js`: scoring, lives, hatches, unlocks, spawn/speed caps, invalid actions, storage validation and seeded rounds.
- Serve the repo and open `/tests/dino.html`: pointer/tap/keyboard, cancellation, tutorial and persistence, collection, pause/resize, unlocks, restart, game over, storage/audio/analytics failure, actual browser storage and mute controls.
- GitHub Actions runs Node rules tests and JavaScript syntax checks; the browser runner is separate.

SEO uses static explanatory HTML, one canonical URL, WebApplication data without unsupported rating claims, a homepage card, a link from Dinosaur Word Search and a sitemap entry. No existing route, game logic or shared scripts are modified.
