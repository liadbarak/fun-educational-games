# Shape Slice

Original 32-challenge SVG geometry game, with no dependencies or build step.

## Files

- `geometry.js`: pure convex-polygon half-plane clipping, shoelace areas, centroid, side cleanup, rectangle classification and reflected-boundary comparison.
- `puzzles.js`: 32 fixed challenges, including exact example solutions for tests and optional hints. Example solutions do not drive validation.
- `model.js`: objective evaluation and retry-safe scoring.
- `game.js`: pointer/two-tap/keyboard interaction, SVG results, shared sound/analytics and best-record storage.
- `index.html`: static crawlable guide, SVG shape references, metadata and VideoGame structured data.

## Geometry and fairness

V1 deliberately uses convex polygons. A straight cut yields at most two pieces per polygon; multi-shape arrangements are evaluated independently. Concave geometry is not supported by this clipping representation and should not be added without extending the engine/tests.

Coordinates use a 400×340 viewBox. Cuts are infinite lines, as previewed during drawing. Input must span at least 12 board units to avoid unstable tap-sized cuts. Boundary-only and tangent cuts are rejected. Area calculations use the full coordinates; epsilon is 1e-7 and microscopic pieces under 1e-8 of the source area are rejected. Consecutive duplicate and collinear points are removed before counting sides.

Only shape-creation/equal-triangle rounds snap within 5 board units of vertices. Rectangle rounds also align near-parallel gestures within approximately 2.3 degrees. The exact snapped line is rendered and evaluated; area, symmetry and target rounds retain the raw line. This avoids secretly scoring a different cut.

Area quality is `100 × (1 - abs(smallerFraction - target)/target)`, clamped to 0–100. Both pieces retain their measured percentage labels. Multi-shape area rounds use the lowest individual quality. Symmetry compares reflected and original boundaries in both directions using maximum vertex-to-edge distance, normalized by one quarter of the bounding-box diagonal. All symmetry axes are accepted. Targets use perpendicular distance to the full line, with an 8-unit acceptance radius. Red-zone interior intersections and slicing an unhighlighted shape fail independently of other criteria.

Area passes at 80% quality, symmetry at 85%. Grading uses full precision before display rounding: perfect ≥99.95, excellent ≥95, great ≥85, otherwise solved. Categorical shape goals award 200; accuracy goals award 200 + 3×quality, with a streak multiplier capped at 1.4. Strong first clears increment the streak; misses or quality below 95 reset it. Each challenge records only its highest awarded points; replays add the improvement, never duplicate points.

## Persistence and events

`shape-slice:v1` saves best total score and best streak, with validation and a storage-unavailable fallback. Current rounds start fresh on reload. Sound reuses the shared preference. Existing `track` receives game_view, game_start, level_complete and game_over with game_name `shape_slice`. No input coordinates or personal data are sent.

## Validation

```
node --test tests/*.test.js
node --check shape-slice/game.js
node --check tests/shape-slice.tests.js
```

Serve the repository and open `/tests/shape-slice.html` for the browser suite. Tests cover every authored solution, alternate solutions, area conservation across 800 arbitrary cuts, vertices/edges/tangents, real result polygons, ratios, symmetry, targets, protected regions, both input modes, keyboard, retry, score farming prevention, all 32 levels, replay, and record persistence. Browser tests use isolated in-memory storage.

Responsive checks and synthetic touch-pointer events do not replace physical-device touch testing. The actual mouse-drag path was also exercised through all 32 challenges.
