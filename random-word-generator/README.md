# Random Word Generator

Static, client-side utility using the existing random-tools styles, random sampling helper, and utility analytics. No new dependencies or runtime requests for word data.

All Words is the default general-purpose mode with 1,214 distinct common words: 621 nouns, 305 verbs, and 288 adjectives. Grammar filters apply only here and are retained when switching back from a game mode. Words are classified by a common grammatical use; English words can have other meanings.

Pictionary uses concrete drawable nouns and simple scene phrases. Charades uses 120 recognizable actions and short acting prompts. Hangman selects familiar nouns with 4–10 letters. Each pool has unique entries; game modes ignore the general grammar filter and keep the selected result quantity.

Users can select 1, 3, 5, or 10 words. Each batch is unique, and single-word generation avoids repeating the immediately preceding single word. Copy uses the Clipboard API with a selected, read-only text fallback when access is unavailable. Analytics follows the existing utility_view, utility_use and utility_copy pattern; generated words are not sent.

## Validation

- `node --test tests/*.test.js` runs model tests and existing game regressions.
- Open `/tests/random-words.html` through a local HTTP server for eight DOM/controller tests covering all 64 mode/type/count combinations (including ignored grammar filters in game modes), regeneration, clipboard payload, denied clipboard access and analytics isolation.
- The optional clipboard button on that test page checks real write/read access where browser permissions permit it. The Codex preview restricted readback; injected clipboard success/failure tests passed.
- `/tests/random-tools.html` checks existing Random Number Generator and Coin Flip UI behavior.
- This static repository has no separate package build or configured lint task. JavaScript syntax checks and `git diff --check` supplement the tests.

The page includes static explanatory content, canonical/Open Graph metadata, WebApplication structured data, a sitemap entry and homepage/related-utility links.
