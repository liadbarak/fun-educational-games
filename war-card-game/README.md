# War Card Game

Dependency-free DOM game with a pure CommonJS/browser model. Open index.html through a local HTTP server. Tests: `node --test tests/war-*.test.js`.

Rules: ace high, 26 cards each, ties stake up to three face-down cards plus one face-up. Short decks reserve their final card. A player unable to continue loses; simultaneous exhaustion on a tied reveal redeals the pot evenly. Captured piles are shuffled before appending to the winner's deck to reduce deterministic cycles. No fixed round limit or guaranteed duration. All variants are disclosed in page copy.

Manual play starts each round with one button. Reveal, comparison, and collection resolve in sequence; ties automatically place stakes and reveal again until settled. Auto Play starts another round after a one-second result pause. Stopping Auto Play finishes the current round (including any wars) but schedules no further round. Hiding the tab also disables Auto Play. Reset invalidates pending animation callbacks. Games remain in memory only. Reduced-motion users receive no flip animation.

Shared footer, theme and analytics use existing site components. Static rules/FAQ, self canonical, WebPage JSON-LD, homepage card, sitemap and reciprocal Go Fish link provide crawlable discovery. No rating or FAQ rich-result claims.
