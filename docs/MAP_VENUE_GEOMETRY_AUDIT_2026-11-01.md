# Venue map geometry and discovery — November 1, 2026

Local implementation evidence; root owns publication and authenticated integration.

## Retained sources

The immutable user screenshots are indexed in visualization artifact map-input-audit/inputs.json. Original overview Photos 1, 3 and 5, overview-source-panels.jpg, levels-legend-and-lists-reference.jpg, output/map/contiguous-walls/source-overlay.png and the GWCC page-23 rationalized overlay were inspected. Earlier event placements were not promoted to current facts.

- public/map-preview/official-levels.svg embeds the complete original overview Photo 5 JPEG unchanged. SHA-256: 240e6bd23ee927f3ec7986eb14d86515644862ca4b52653c6c6fa53ec304ddfa. Native SVG viewBox 0 385 589 380 clips its existing levels diagram and building captions; no raster edit, enhancement or synthesized floor plan. The original is 589 × 1280 pixels, so enlargement retains that source resolution.
- The overview inset occupies the unused lower-left space; tapping it opens the larger diagram with the existing named-level directory. Selecting a named upper-level destination retains the same source diagram rather than inventing room geometry.
- The west hall divider follows the continuous source edge beside the queue/C103–C110 corridor: schematic M145 143 L130 157 V485. It meets the existing hall edges and adds no doorway or direct C110-to-show-floor passage. Existing lobby entry gaps are unchanged. This is a symbolic enclosure, not a navigable route graph or surveyed geometry.
- Photo 1 verifies elevator/escalator pairs above Spindown and below C110; Photo 3 verifies the east-lobby pair above registration. Photo 6's legend distinguishes both symbols. Three combined cluster markers preserve these close pairs without overlapping circles on phone; their accessible labels and Facilities rows name both. Positions are diagram-relative approximations, not access/route guarantees.
- Restroom glyphs are 16 screen pixels, with transparent 40-pixel hit targets. Combined transport glyphs use a single 24-pixel circle and 40-pixel target.

## Discovery and camera rules

Upper Ticketed Play and the separate extension each enter a purposeful area view. Their own service children lead the drawer: League Pickup/Prize Wall in the upper region; Ticketed Play Hub in the extension. Both drawers and Play browse expose the related services, other Ticketed Play region and On Demand without search. Service selection preserves the current scale; explicit + from a service enters its source parent. One outward action returns to the floor. Marketplace tiles/identities and ordinary destination/room camera behavior remain covered by the shared regression suite.

## Validation and visual review

scripts/test_map_preview.cjs verifies the retained source bytes/crop, continuous west divider, three transport clusters, all play browse paths, each service's parent camera, no zoom on service taps, Marketplace identity/neighbors, gestures and responsive camera regressions. The final functional candidate passed 158 ordinary destinations × 7 inputs × 3 contexts plus the focused parent/discovery guards. pnpm build passed; only the existing bundle-size warning remained.

Independent PM review inspected actual 375 × 844 phone and desktop renderings against Marketplace. Overlapping transport circles and Hub's below-fold ordering were corrected and rechecked. Retained screenshots in the visualization root: pm-venue-overview-phone.jpg, pm-venue-hub-phone.jpg, pm-venue-levels-phone.jpg, pm-venue-overview-desktop.jpg. The implementer inspected those screenshots. A final spacing adjustment gives the inset caption separation from the source image.

Known limit: resizing a zoomed desktop view to phone preserves the existing camera, so Overview is needed to refit; fresh phone paths are composed correctly. Source resolution limits small source-image annotation text. No database reads/writes, model calls or source-network reads were required.
