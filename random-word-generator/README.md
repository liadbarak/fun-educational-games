# Random Word Generator

Static, client-side utility using the existing random-tools styles, random sampling helper, and utility analytics. No new dependencies or runtime requests for word data.

The hand-curated vocabulary contains 1,214 distinct words: 621 nouns, 305 verbs, and 288 adjectives. Words are classified by a common grammatical use; English words can have other meanings. The packed local dataset contains no duplicate entries. Pictionary (691 words) and Charades (434 words) use separate curated subsets, intersected with the selected word type.

Users can select 1, 3, 5, or 10 words. Each batch is unique, and single-word generation avoids repeating the immediately preceding single word. Copy uses the Clipboard API with a selected, read-only text fallback when access is unavailable. Analytics follows the existing utility_view, utility_use and utility_copy pattern; generated words are not sent.

## Validation

- `node --test tests/*.test.js` runs model tests and existing game regressions.
- Open `/tests/random-words.html` through a local HTTP server for eight DOM/controller tests covering all 48 mode/type/count combinations, regeneration, clipboard payload, denied clipboard access and analytics isolation.
- The optional clipboard button on that test page checks real write/read access where browser permissions permit it. The Codex preview restricted readback; injected clipboard success/failure tests passed.
- `/tests/random-tools.html` checks existing Random Number Generator and Coin Flip UI behavior.
- This static repository has no separate package build or configured lint task. JavaScript syntax checks and `git diff --check` supplement the tests.

The page includes static explanatory content, canonical/Open Graph metadata, WebApplication structured data, a sitemap entry and homepage/related-utility links.
