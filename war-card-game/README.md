# War Card Game

Dependency-free DOM game with a pure CommonJS/browser model. Open index.html through a local HTTP server. Tests: `node --test tests/war-model.test.js`.

Rules: ace high, 26 cards each, ties stake up to three face-down cards plus one face-up. Short decks reserve their final card. A player unable to continue loses; simultaneous exhaustion on a tied reveal redeals the pot evenly. Captured piles are shuffled before appending to the winner's deck to reduce deterministic cycles. No fixed round limit or guaranteed duration. All variants are disclosed in page copy.

Auto Play waits 1.15 seconds between ordinary reveals and 1.75 after ties; can be stopped immediately and stops when the tab is hidden. Manual reveal is the default. Games remain in memory only. Reduced-motion users receive no flip animation.

Shared footer, theme and analytics use existing site components. Static rules/FAQ, self canonical, WebPage JSON-LD, homepage card, sitemap and reciprocal Go Fish link provide crawlable discovery. No rating or FAQ rich-result claims.
