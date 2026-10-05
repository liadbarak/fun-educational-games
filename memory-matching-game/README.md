# Memory Matching Game

One canonical route: `https://puzzleten.com/memory-matching-game/`. Themes never change the URL. Animals/Easy initializes immediately. Original SVG assets are in `art/`; uppercase letters use system fonts.

## Rules and records

Easy/Medium/Hard use 6/8/12 pairs. Every item has two identical copies. One move is a completed two-card attempt. Mismatches lock the board for 950 ms; restarts cancel pending work. Time starts on first interaction, excludes hidden-page time, and stops on completion. Records prioritize fewer moves, then lower elapsed seconds, independently per theme and level. Shared `Prefs` handles unavailable storage. Reload creates a fresh Animals/Easy board while preserving records.

## Analytics

Uses shared `shell.js` GA4 configuration and `track()`; no new tracking service.

- Existing automatic `page_view`: page opened.
- `game_start`: first accepted card flip, once per round.
- `game_progress`: third completed attempt, once per round (engagement proxy, not every flip).
- `game_over`: completed board; includes `completed`, `moves`, `duration_sec`, `new_best`.
- `game_settings`: selection change; includes old `theme`/`difficulty` and `next_theme`/`next_difficulty`.
- `game_restart`: New Game or Play Again; includes current moves.

All game events include `game_name: memory-matching-game`, `theme`, and `difficulty`. Theme/difficulty on `game_start` identify actual play, including default selections. Reporting custom dimensions may need registration in the existing GA4 property; this change does not modify the property.

## Validation

Run `node --test tests/memory.test.js` or the full Node suite with `node --test tests/*.test.js`, from the repository root. Tests cover 1,500 generated boards, completion, invalid/repeat clicks, mismatch locking, restart cancellation, all theme/level switches, timing, records, storage failures, keyboard focus, SEO source and asset presence.

Browser checks cover desktop and mobile widths (320/375px), all 15 mobile combinations, complete Hard gameplay, persisted records after reload, Enter/Space and arrow navigation. Deployment still requires a production check for HTTP 200, the canonical, assets and sitemap once merged.
