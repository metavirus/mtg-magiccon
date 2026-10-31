# Official app, map and merchandise checkpoint

Reviewed October 31, 2026. This is source research, not proof that native app content or the real map has been imported into our companion.

## Confirmed sources

- Official launch page: https://mcatlanta.mtgfestivals.com/en-us/info/mobile-app.html . It announces the Atlanta app and describes venue/floor maps, exhibitor specials, schedules and alerts. Its Apple link still uses an Amsterdam slug, but the stable store ID is 6443677618.
- Apple listing: https://apps.apple.com/gb/app/magiccon-atlanta/id6443677618 . Version 14.0.0 explicitly says updated for Atlanta 2026; requires iOS 17 or later. This verifies the release listing, not inspection of downloaded native content.
- Official October 30 launch newsletter corroborates the release, links the merchandise catalog and announces Big Facts with Ify Nwadiwe/Brian David Gilbert and Tabletop Jocks programming. No direct map file was exposed by its reviewed links or images. A focused Gmail map search from August 1 returned that newsletter and an unrelated hotel receipt.
- Merchandise: https://mcatlanta.mtgfestivals.com/en-us/merch.html . Rendered browser inspection found 60 product entries with names, prices and Shopify CDN product images. Examples: Jace reversible hoodie $100; Atlanta event playmat $30; Eye of Jace liquid-core jumbo spindown $50; Festival in a Box Atlanta 2026 $249.99. These are listed prices, not stock guarantees.
- Catalog rendering comes from the official page's script at `/content/dam/sitebuilder/rna/innovations/magiccon-atlanta/2026/merch/merch-main.min.js`. It paginates the public store collection and displays the first product image and variant price. Static HTML extraction sees only a heading and must not count as complete product monitoring. Do not retain storefront tokens in research or app data.
- Official October 26 Black Lotus email: advance shopping November 2 10 AM PT through November 8 10 AM PT, one checkout using the private emailed code. Preorders collected in the lounge from Friday November 13 8:30 AM. Festival in a Box limit two per VIP across preorder/onsite; remaining allotment at lounge fulfillment until Saturday November 14 2 PM, not at the Show Store. Other additional onsite purchases use the normal store queue. The personal code remains in email and is not copied here.

## Map and native inspection boundary

Kavi identified the mobile-app page as the map reference, then supplied seven iPhone screenshots of the actual in-app map on October 31. Those screenshots establish accessible map content and readable location evidence; they do not constitute agent-controlled native inspection or the original-resolution artwork. No original map download or public embedded map was obtained. The public Info overview and cached Android listing still contained Amsterdam wording, so neither is used as Atlanta map evidence. No adb or emulator executable was exposed on PATH or at the standard local Android SDK locations, and no Android device-control surface was available in the browser/computer inventory.

Readable user-supplied screenshot observations (Photo 1 through Photo 7; no OCR-only booth bindings):

- Photo 1: Showcase Room C101, Spindown Room C102, Quiet Room C104, Family Spark Lounge C105-C106. Morning queue and wristband distribution are distinct locations.
- Photos 2-4: Marketplace, Art of Magic, Gathering Grounds, Meet & Greets, Worlds and Ticketed Play areas; separate general, Black Lotus VIP and special-access entrances. Do not infer VIP entitlement to the special-access entrance.
- Photo 5: Level 1 show floor and attendee rooms; Level 2 Building C connects other show levels/areas; Level 3 Mana Stage (Georgia Ballroom) and Black Lotus VIP Lounge (Triumph Ballroom, Signia Hotel); Level 4 A/B Registration Hall, ticketed merchandise pickup and Worlds viewing party; Level 5 Official Show Store (Thomas Murphy Ballroom). Store remains an ordinary destination, now known to be on another level.
- Photos 6-7: separate icons for accessibility/restrooms, elevators/escalators, first aid, information and sponsor/featured markers. Featured late-night exhibitors are explicitly distinguished from ordinary featured exhibitors. Individual booth numbers require original-resolution review before spatial binding.

Next map action requires an official original map/shared download or a supported native app inspection lane. Screenshots can help locate an original but do not satisfy the ingestion runbook's original-file gate. Preserve the existing accepted prototype; do not invent geometry or reuse historical placements. Show Store remains an ordinary destination; the verified Festival in a Box fulfillment rule belongs in product/access details.

## Remaining enrichment

### Additional screenshot evidence received October 31

Kavi supplied seven further close views, bringing the evidence set to 14 images. The four artist views are in attachment batch `57615DEF-0F70-46E1-B221-48904E109A64`; the three marketplace views are in batch `5340EE6C-FC47-41FD-9712-78921516B1C1`. The original seven overview/level views are in batch `FAAA7ECB-8637-4E26-8492-66CF3845A62C`. These are source locators in the chat attachment store, not public asset URLs.

- Artist close views show named table groups and featured-artist stars, plus Portfolio Review and Artist Lounge by Dragon Shield. Tran Nguyen is visibly grouped beneath Thomas Baxa beside Ryan Pancoast, despite the current web directory lacking Tran's booth number. This is relative-location evidence, not permission to invent a booth code. Source spelling such as Cynthia Sheppard/Shepard must be reconciled through existing identity mappings.
- Marketplace close views show the morning queue entry beside Star Trek/Jace's Tower; Family Magic/Bloomburrow; Tap Tap Mini Golf/Arcades's Arcade; Gathering Grounds; and the eastern marketplace beside Magic Meet & Greets. Sponsor, featured and late-night markers are distinct attributes, not identity keys or purchase evidence.
- Some booth labels remain too small for confident transcription. Do not infer codes from neighboring numbers or interpret an unlabeled purple area as a named destination. The close views improve reconciliation coverage but do not supersede the original-file gate.

Execution order and bounded handoffs are recorded in `docs/OCT31_APP_MAP_MERCH_WORK_PLAN.md`; current completion state remains in `CURRENT_FRONTIER.md`.

The catalog's real product images can support clickable, larger zoomable details. Product-level ingestion, full image variants, offline image packaging and deployed readback remain separate work; this research checkpoint does not claim them complete. Meaningful ongoing catalog changes require the dynamic collection to be covered, not merely the static page fingerprint. Native-only specials and announcements remain uninspected; the map has screenshot-based partial coverage only.
