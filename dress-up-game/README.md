# PuzzleTen Style Studio / Dress Up Game

Original lightweight dress-up game at `/dress-up-game/`. No package dependencies, remote art, fonts, game engine, or asset downloads. `data.js` contains 70 garments and 15 themes; `art.js` contains original authored SVG geometry on one shared character rig. SVGs are inserted only for the current character/category. New characters can use the same rig or a new renderer without changing scoring.

## Behavior
- Challenge is the initial mode. Free mode has no score. Default modest outfit is immediately visible.
- Dress replaces top/bottom; separates replace dress. One head, neck and bag accessory can be combined, plus an optional layer. Neutral base clothing remains when garments are removed.
- Clothing scores are deterministic (40 theme, 25 palette, 20 accessories, 15 style). Theme score averages matching clothing tags; style also considers hair. Shoes and either dress or separates are required to finish. Skin tone does not enter scoring. At least three different combinations score 85+ for every theme (automated test).
- Daily themes use the UTC day number modulo 15. Best score for the current day is stored in `fashion:daily:v1`, with a single bounded record and graceful storage failures. Theme refresh on visibility and a one-minute check handles midnight. No account or cross-device sync. Active outfits do not survive reload.
- User-initiated share renders original SVG into a 600x800 PNG, only on demand. Native file sharing when available; explicit PNG save link otherwise. Native cancellation and gesture restrictions fall back to saving. Nothing uploads/downloads automatically. Object URLs are revoked when changing looks.
- Existing `track` and footer are reused. Starts, selection, completion, daily completion, next challenge and share events are tracked. Numeric score is a parameter of challenge completion rather than a duplicate event.

## Checks
`node --test tests/fashion-model.test.js` and `node --test tests/*.test.js`.
Browser suite: `/tests/fashion.html` (noindex, under disallowed tests path). It selects all 70 pieces, validates rendered SVG, checks free/challenge/retry, skin changes, daily save, PNG fallback and 320px overflow. Native OS share dialog is not automated; test skips that step if the browser advertises native file sharing.

Manual preview: test 320px/390px widths and desktop; use Tab/Enter to select items and finish. Art originality review should cover face, rig, hair, clothing, thumbnails and result composition. All shapes are authored here, with no competitor or third-party visual references. This is an originality check, not a legal opinion.

## SEO scope
Static title/H1/description, self canonical, WebPage JSON-LD, static guide and eight FAQs. No rating/review markup or promises of FAQ rich results. Homepage card and sitemap entry added; no separate theme URLs. Existing game content unchanged.
