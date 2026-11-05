# Linked-page review — November 5, 2026

Retained run: `42123387423`, checked at `2026-11-05T22:40:56.293Z`. Direct official reads completed at 22:51–22:52 UTC. Owner: MagicCon / MTG Festivals. Publication dates unspecified. Bounded source review only; no local monitor, database write or baseline acceptance.

Original responses and production fingerprints: `.monitoring-state/review-linked-2026-11-05/evidence.json` and numbered HTML files.

| Exact page | HTTP | Content hash | Decision |
| --- | --- | --- | --- |
| [how-to-buy.html](https://mcatlanta.mtgfestivals.com/en-us/badges/how-to-buy/content/sitebuilder/rna/mtg-festivals/mcatlanta/en-us/t3stz0n3/2026/badges/how-to-buy.html) | 404 | `937b698c0ed1704c80db1867640f257f87759442c19ce8355a93e65fea56bb3a` | Renew malformed-path exclusion |
| [cosplay-experience.html](https://mcatlanta.mtgfestivals.com/en-us/experience/cosplay-experience.html) | 200 | `f73c6160113d1ddd1203f2ad5db24322aef67b2e1eec72c99e62f6c5a22bb1d3` | Watch; exact initial Home synopsis |
| [mox-treasure-hunt.html](https://mcatlanta.mtgfestivals.com/en-us/experience/mox-treasure-hunt.html) | 200 | `e421aa403f242a6f9fe9d55cf5b6b6a1b0103cdafb635b58d1e07ba10b3613eb` | Watch empty shell; exact initial noise review |
| [ada-assistance.html](https://mcatlanta.mtgfestivals.com/en-us/info/ada-assistance.html) | 404 | `937b698c0ed1704c80db1867640f257f87759442c19ce8355a93e65fea56bb3a` | Renew broken legacy ADA exclusion |
| [info-overview.html](https://mcatlanta.mtgfestivals.com/en-us/info/info-overview.html) | 200 | `0914234bcf715a1ef9c6d749e1e7c335d1811b7f4a07068a89ace6504163472e` | Renew alias exclusion; both hashes match Info |
| [magiccon-news.html](https://mcatlanta.mtgfestivals.com/en-us/info/magiccon-news.html) | 200 | `59f3c846c8e87946e9e981b0e807358c373b320c1253b6f83956a1ab438ce515` | Renew mirror exclusion; content and nine article paths match global index |
| [newsletter-signup.html](https://mcatlanta.mtgfestivals.com/en-us/info/newsletter-signup.html) | 200 | `6e92e82b1d69a6753582630bd18154be35d17f39ad4a5aa9f097141df68c0572` | Renew enrollment exclusion |
| [show-maps.html](https://mcatlanta.mtgfestivals.com/en-us/info/show-maps.html) | 200 | `9829e4d20d4cc62320819d3c668c4282e10156e5cfded4eb8d8cee300788f270` | Watch; exact initial Home synopsis |
| [ticketed-play-information.html?gtID=944082](https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule/ticketed-play-information.html?gtID=944082) | 200 | `e1dfa0cc286760f16407b7cfc8b3e6d7c2543d7b474dacdd333552b7e2089678` | Renew exact event-shell exclusion |

All six renewed exclusions expire November 12 at 00:00 UTC. The current Ticketed Play failure is independent: the event-shell exclusion does not certify availability or remove that coverage gate.

Cosplay publishes five roaming performers, Art of Cosplay displays and the November 14, 5 PM contest culminating in the Grand Championship. Historical 2025/Las Vegas award labels describe the displays, not the current event. Its return link incorrectly targets Vegas. The exact linked panel `gtID=954668` was read at 22:52:33 UTC: HTTP 200, heading-only `Panel Information`, content hash `15a1e33e6829f7ab4876c768fbde2a07b42c7848697f7c8917d40793093c0aab`, empty-link hash. The retained event-bound Panels feed contains this ID, November 14 17:00–18:00, Mana Stage; its shell receives an exact dated exclusion through November 12.

Mox Treasure Hunt has no substantive main content in the HTTP response; the fingerprint uses body fallback. It remains a watch, not a permanent exclusion or announcement. No gameplay/prize inference is made.

Maps publishes overview, exhibitor and Art of Magic PNG links. Text distinguishes Building C/Hall C1 show-floor queue from Building B/Level 4 International Lobby Show Store queue, with the store upstairs in Thomas Murphy Ballroom. General queuing starts 8:30 AM and entry 10 AM; Black Lotus has its own entry schedule. Physical badge is required. The source also lists badge pickup, wristbands and a Sunday parking warning. The initial Home synopsis covers the distinct queues. App map hydration, image geometry and factual reconciliation remain root integration work.

New source decisions are bound to content and link hashes in `monitoring/watch-set.json`; changed bytes require review. Cloud catch closure, exact acceptance and app Home readback remain required.
