# Official schedule coverage review — October 1, 2026

Direct public HTTP review at 22:00:40–22:00:43 UTC inspected the existing official widgets and their public LEAP schedules transport. This is adapter-development evidence, not a local operational survey or baseline acceptance. Cloud closure and acceptance remain required.

All three widgets name public event key `d33e6b91-2a8f-4e35-970c-752c447b23ed`; feeds identify Atlanta event `21389`, slug `htwhdatl26shdl10`. The adapter now binds exact page, category, event and detail-page identities and fingerprints all supplied session fields.

| Official source | Category | Reviewed result | Content hash | Link hash |
| --- | --- | --- | --- | --- |
| [Family Magic schedule](https://mcatlanta.mtgfestivals.com/en-us/experience/family-magic/family-magic-schedule.html) | 20596 | Zero published sessions; noise, awaiting publication | f1de38f75b94b5be5ff3691f60b2ce77ac87902ee9591f6f55f0837c6114eb27 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| [Meet and Greets](https://mcatlanta.mtgfestivals.com/en-us/experience/meet-and-greets.html) | 20603 | 19 sessions; Home | 230046ce77892bb393b027f799da0496ae1630f2d2f538a6ffa70a21ac046d6d | b9ee2e1c6f42ebf1264a1bcf42c3c838b5502fa5109f4acd7f3f425ea032f5ad |
| [Panels and Events](https://mcatlanta.mtgfestivals.com/en-us/experience/panels-and-events.html) | 20607 | 48 sessions; Home | 99794e604fc34b2449f96e549dec8b52bc732ee5ba490411b38002766afc4e09 | 1f9ac8df7e40611aa5ff847325a9352f98aee5f8e963fdff0d8d9fb3df3e2cf7 |
| [Atlanta wristband distribution](https://mcatlanta.mtgfestivals.com/en-us/info/magic-meet-greet-wristband-distribution.html) | — | Current Atlanta logistics; Home | 32ef85919a8e24c3fd7c1c888157688bd350b742d19527dadbc944a7d1febbb0 | e1f5d92d341080f8780d4387f7e53945efd62dc7b95cd5494076a3964e0f330a |

Family schedule hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`. Meet and Greets: `9b87abc9ee3d4258f217ced6ed5acb245aa5c79dedbaff704f9018698db0eacb`. Panels: `e4de10ac69544e5326f826ea196aba4613e8c9115923c38c9dda4a1f373d5fbe`.

Useful schedule observations: Spell Slayers Cast or Pass is supplied as November 13, 17:00–18:00; Spell Slayers Live: Miss Blind Eternities Showdown as November 14, 18:45–21:00; Meet Spell Slayers as November 15, 13:00–14:00. Times are publisher-supplied local strings without an explicit timezone offset. Family activities exist under Panels, including MagiKids Family League Play, drawing sessions and Dragon Shield decorating; that does not establish publication in the still-empty Family category. Two Panels slots retain More Magic Coming Soon titles.

The Panels feed supplies Birds of Prey with Alessandra Pisano as November 15, 11:00–11:30, conflicting with the Family overview's 11 PM start typo. Preserve the contradiction rather than silently repair the overview. No canonical calendar import or access guarantee is authorized.

Current wristband text explicitly names an Atlanta badge, Concourse C Lobby, distribution from 8:30 AM each event morning, free limited first-come wristbands, individual attendee eligibility, and arrival at least 30 minutes before the session ends. It states there are no standby/overflow queues. Older retained report/browser content with Vegas/Amsterdam details is superseded source evidence, not current Atlanta policy. The current page's labeled Meet and Greet Schedule link incorrectly targets itself; the separately watched schedule is the useful session destination.

The exact reviewed hashes and summaries are stored in `monitoring/watch-set.json`. The runtime applies exact reviews to changed existing watches as well as initial watches; changed content or feed fields invalidate those editorial decisions. Empty Family is explicitly `awaiting_publication`, while missing/malformed schedules or wrong identity fail closed. Tests cover first publication, exact category/detail binding, invalid event identity, existing-baseline reviews, session changes and order stability. Targeted validation: 31 tests passed across schedule, source-onboarding and detail-coverage suites.
