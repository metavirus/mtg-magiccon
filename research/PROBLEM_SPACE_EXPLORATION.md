# MagicCon companion problem-space exploration

Updated: 2026-08-01

## Scope and evidence boundary

This is discovery, not a product specification or schema commitment. MagicCon: Atlanta 2026 is the target convention. MagicCon: Las Vegas 2026 is used only as a representative example of the kinds of surfaces and workflows that Atlanta may acquire later. No Vegas guest, artist, activity, location, perk, price, or schedule item is an Atlanta expectation.

The research combines current public publisher surfaces with owner-supplied receipts, prior experience, and screenshots. Private evidence was reviewed in place; QR values, transaction identifiers, postal addresses, payment details, and account links are intentionally not reproduced here.

## What problem are we solving?

The convention is represented across several disconnected products rather than one reliable system:

- ReedPop's MagicCon site publishes announcements, policies, descriptive schedules, maps, artists, guests, and badge information.
- Leap owns accounts, badge entitlements, transfers, orders, ticketed-play inventory, checkout, and its version of “My Schedule.”
- The official MagicCon mobile app has content schedules, bookmarks, maps, and notifications, but says it cannot connect to ticketed-play purchases.
- Magic Companion uses the code embedded in a purchased event name and supplies the live seat assignment.
- Email carries order confirmations, transfer links, QR codes, and other artifacts.
- VIP programming, panels, loose activities, meet-and-greets, artists, maps, and ticketed play are published on different surfaces and at different times.

The opportunity is therefore not merely to aggregate calendars. It is to create a private decision and continuity layer across systems that were designed around publishing, selling, or operating individual parts of the event.

## Evidence from the representative Vegas system

The [Vegas information index](https://mcvegas.mtgfestivals.com/en-us/info.html) exposes separate pages for maps, badge activation, Black Lotus, meet-and-greet wristbands, news, travel, and the mobile app. Its broader navigation also separates artists, guests, panels and events, ticketed play, on-demand play, and prizes.

The [Vegas buying guide](https://mcvegas.mtgfestivals.com/en-us/badges/how-to-buy.html) describes a multi-identity workflow:

1. Create a Leap account and use the same email when purchasing.
2. Buy or receive a badge; badges bought for others may need transfer and acceptance.
3. Select the relevant badge before purchasing ticketed play.
4. Complete a time-limited cart and retain the email confirmation.
5. Return to the Leap dashboard to review orders and its schedule.

The same guide says badge transfers and ticketed-play registrations behave differently: a badge can be transferred, while already-purchased play events do not follow it automatically. This makes purchaser, badge holder, participant, and planner distinct roles even in a three-person group.

The [Vegas FAQ](https://mcvegas.mtgfestivals.com/en-us/info/faq.html) says a purchased play event can be removed from the Leap schedule to permit an overlapping purchase while the purchaser keeps the paid seat and receives no refund. Consequently, absence from “My Schedule” is not proof that an entitlement no longer exists. It also says the event name carries a Magic Companion code, the name identifies a color-coded play area, and the Companion app supplies the seat assignment when play starts.

The [Vegas mobile-app page](https://mcvegas.mtgfestivals.com/en-us/info/mobile-app.html) explicitly says the content app cannot connect to ticketed-play purchases. Users manually mark registered events, leave the app to purchase, and use a separate confirmation code with Magic Companion. Its maps, bookmarks, and notifications are useful publisher features, but they do not form a trustworthy personal itinerary by themselves.

The [Vegas Black Lotus page](https://mcvegas.mtgfestivals.com/en-us/badges/buy-badges/black-lotus-vip-experience.html) demonstrates another schedule with its own access rules, benefits, pickups, and change disclaimer. It is structural evidence that badge tier can unlock obligations and opportunities outside the general and ticketed-play calendars.

The public [Vegas Leap schedule](https://conventions.leapevent.tech/ed/schedule/qDcnMCLVAjoEA26v) is now an empty archived shell (“No Schedules with specified filters”). This is an important archival lesson: old event applications are not durable sources. Useful source wording and observations must be retained when they are current.

## Atlanta's current state

The [Atlanta site](https://mcatlanta.mtgfestivals.com/) currently announces November 13–15, 2026, while its page title/header still contains a 2025 label. The body and chrome therefore conflict within one official source. The app must preserve that conflict rather than silently selecting whichever value looks newest.

The [Atlanta FAQ](https://mcatlanta.mtgfestivals.com/en-us/info/faq.html) currently supplies venue, show-floor and play-hall hours, badge mailing and pickup guidance, and the same Companion-code flow, while stating that panels, exhibitors, artists, and other detail will arrive closer to the show. Atlanta is therefore a progressively disclosed and change-prone information environment, not an incomplete database waiting for a one-time import.

## Owner-supplied evidence and group shape

The Atlanta group currently consists of the owner, Chris Tom, and Juan Pereyra. The owner and Chris have Black Lotus VIP Early Bird badges. Juan has a Premium Weekend badge.

The owner purchased and controls two Black Lotus badges on one Leap order, assigning one badge to Chris. The owner and Juan use the same Leap account, but Juan's Premium Weekend badge appears on a distinct order page. This demonstrates that account, order, badge, assigned attendee, and physical shipment are separate relationships. The order page also says all physical badges ship to the original purchaser even when a badge is transferred.

### MVP collaboration boundary

The MVP has one application user: the owner. Chris and Juan may appear as people associated with plans, purchases, assignments, or memories, but they do not need accounts, permissions, personalized home screens, voting, notifications, or synchronization. Ordinary coordination such as handing Chris his badge remains real-world context rather than a workflow the MVP must manage.

Multi-user collaboration is deferred to a later product version. The MVP should remain mindful of it only where a choice would be unusually costly to reverse. In practice, this means avoiding assumptions that every badge, ticket, purchase, or itinerary item necessarily belongs to the signed-in user, and keeping a lightweight `person` concept distinguishable from authentication. It does not justify building sharing controls, invitations, roles, per-field privacy, or collaborative state now.

The Atlanta confirmation email contributes additional dated facts that do not all match the current FAQ. It states a September 23 badge mailing deadline, while the currently published FAQ states September 25. This is a genuine publisher conflict that the first evidence workflow can use. It also says scheduled ticketed-play participants should join through Magic Companion at least 30 minutes before start; the FAQ separately says to preregister at least one hour before the event. These statements may describe different actions, but the app must not collapse them into one deadline without clarification.

The confirmation demonstrates two credential levels:

- one order-level QR and short code described as containing all products on the order;
- individual badge QR codes on the authenticated order page, each associated with an assigned attendee and available for Apple or Google Wallet.

The order email, order page, physical mailed badge, wallet pass, and eventual Companion event code are therefore related artifacts with different scope and operational purpose. A generic `qr_code` field would lose important meaning.

The Vegas confirmation provides a concrete ticketed-play example: a paid event has a dated occurrence, format/product description, price, and Companion code embedded in the item name. The email thread was also manually forwarded to Juan with a human label, showing that coordination currently happens through informal email forwarding rather than a shared plan.

An onsite Square receipt from the Vegas show store contains several product lines bought in multiples. The owner reports that some purchases were for Chris and later required partial reimbursement. This introduces a valuable post-purchase workflow:

`Receipt evidence -> line items -> personal/group allocation -> amount owed -> reimbursement state`

The receipt remains publisher/vendor evidence. “These copies were Chris's” and “Chris owes me this amount” are personal accounting decisions layered on top and should not alter the source receipt.

## Product concepts to keep separate

### Product boundary principle

First-class context does not imply first-class subsystem complexity. The app should ingest enough from specialist systems to make the MagicCon trip coherent, but it should not become a replacement for those systems.

Examples:

- Gmail is a source of evidence, not a mail client.
- Leap is a source of badge, order, wallet, and ticketed-play facts, not a replacement account dashboard.
- Booking, hotel, and airline emails are trip context, not a travel-management platform.
- Magic Companion is the operational play system, not something the app reimplements.
- ManaBox and card-data sources are inputs for signing decisions, not a full collection manager.

If a provider sends an unusually important change, such as a flight cancellation, hotel cancellation, refund, or badge/order issue, the app should surface it because it affects MagicCon readiness. That does not justify building provider-specific monitoring or management tools in the MVP.

### Published offer

Something a publisher says exists or may be available: an event, panel, artist appearance, badge benefit, pickup window, deadline, or venue rule. It needs dated source observations and can be tentative, changed, canceled, contradicted, or superseded.

### Entitlement and obligation

Something a person owns, paid for, received, must claim, or must do. Examples include a badge, ticketed event, included merchandise, transfer awaiting acceptance, pickup deadline, or nonrefundable product. Entitlement cannot be inferred solely from a visible calendar.

### Personal decision

Interest, preference, rejection, shortlist, intended companions, budget judgment, or “worth leaving another event early for.” This is personal interpretation, not publisher truth.

### Itinerary commitment

A chosen use of time with confidence, buffers, conflicts, companions, and dependencies. It may refer to an entitlement but is not identical to it.

### Runtime participation

The operational state needed onsite: checked in, Companion code entered, current play area, seat/table assignment, late, dropped, product still claimable, or observed relocation.

### Memory and follow-up

What actually happened and what should persist afterward: attendance, rating, notes, expenses, purchases, artist encounters, signatures, contacts, and follow-ups.

## The decisions the app should improve

Before the convention:

- What has just been announced or changed, and does it matter to me?
- Which activities fit my formats, interests, budget, and energy?
- Which combinations are impossible or uncomfortably tight after travel buffers?
- Who is interested, committed, registered, or still deciding?
- What did each person actually buy, and who controls the order or badge?
- Which deadlines, transfers, reservations, pickups, and preparation tasks come next?
- Which appearing artists connect to cards in my collection that I may want signed?

During the convention:

- Where do I need to go next, when should I leave, and with whom?
- What code, QR artifact, physical badge, deck, ID, or other item do I need?
- What changed since I last looked, and has anyone personally confirmed it onsite?
- If plans diverge, what remains paid for, claimable, or worth rejoining?
- How do I navigate across rooms, halls, floors, queues, and access-controlled areas?

After the convention:

- What did I attend, buy, spend, enjoy, learn, or miss?
- Which cards were signed, by whom, and what is their story?
- Who should I follow up with?
- Which observations and artifacts will make the next MagicCon easier?

## A thin manual workflow to prove first

The first substantive product slice should follow one real Atlanta fact through the full trust path:

1. Capture one official Atlanta page with exact URL, retrieval time, relevant wording, and effective date if stated.
2. Record one or more observations without treating the page as internally consistent.
3. Normalize only the small entity needed to present that fact.
4. Record a personal decision or task based on it.
5. Place the decision on a minimal itinerary or “next action” view.
6. Capture a later revision or contradiction, reconcile it visibly, and keep the prior evidence recoverable.
7. Confirm the critical view remains readable offline while writes remain disabled.

This proves the hard part before monitoring, broad ingestion, artist enrichment, email extraction, or a comprehensive event model.

## Candidate experience shape, not committed UI

A useful default could be organized around three modes rather than source websites:

- **Plan:** a unified time canvas with proposals, interests, purchases, companions, conflicts, travel buffers, and alternatives.
- **Now:** a compact next-action card containing time, leave-by time, location/route, companions, required artifacts, live status, and freshness warning.
- **Remember:** completed activities, notes, ratings, expenses, purchases, signatures, encounters, and follow-ups.

Supporting views would include a private wallet, change inbox, group decision board, artist/card-signing workspace, and evidence detail. “Capture everything” belongs behind these decisions; it should not turn the default interface into an archive browser.

### Pre-ticketed-play usefulness

Before ticketed play appears, the app is still useful as a quiet trip dossier and readiness radar. It should preserve known private artifacts, monitor low-volume official news and selected source pages, and turn new information into a small number of practical states: nothing meaningful changed, new thing to read, new thing to decide, new thing to do by a date, new contradiction, or major inflection point detected.

In this period, receipts, badge confirmations, hotel bookings, and flight itineraries are valuable because they establish what exists, what is paid for, what dates constrain the trip, what is sensitive, and what may need offline reference. The app should display these facts pleasantly and preserve the evidence privately, while leaving specialized actions such as modifying bookings, selecting seats, managing hotel payments, or using airline tools to their authoritative providers.

The app interface should be phase-stable rather than transforming when ticketed play appears. Hot, Trip, Wallet, Sources, Plan, and Remember should all be present from the start; each phase changes the density, priority, and affordances of those areas rather than replacing the interface. Before ticketed play, Plan can hold placeholders, rough intentions, readiness notes, and known fixed constraints. Remember can remain lightly populated with pre-event notes and prior-event lessons.

The pre-ticketed-play home is an attention surface, not the whole app. Its quiet state should feel like success: a quick landing bubble can say nothing meaningful changed, when sources were last checked, whether the watch set is healthy enough to trust, and what the next known readiness date is. Non-actionable observations should be captured but collapsed into an easily expanded Observed layer so they remain available for discussion without cluttering the screen.

Because signals are rare, email or push alerts are appropriate for real official changes, private trip disruptions, source contradictions, deadline proximity, or major inflection points such as ticketed play, artist lists, maps, VIP details, or merch becoming available. The app should avoid alerting for information already handled by known trip state; for example, a generic hotel-booking promo should be logged quietly when lodging is already known, unless it creates a concrete new issue.

Watched sources should be grouped by purpose rather than presented as a raw URL list. Likely groups include Official News, Atlanta Core, Unlock Signals, Private Trip Evidence, and later External Leads. Source failures affect confidence, not relevance: one-off failures should stay in Sources, while only repeated or broad monitoring failures should degrade the Hot landing bubble.

Rare steering input may be useful, but only as an escape hatch. The app may ask a tiny inline yes/no-style question when the item is already being reviewed, there is a real uncertainty, the answer changes future behavior, and ignoring the prompt is harmless. It should not ask engagement prompts, request abstract feedback, gamify attention, or flatter the user for routine choices. Prefer quiet inference and user actions.

Small situated affordances are part of the product value. Prefer actions exactly where they help: a Maps link on a hotel card, copy affordance on a confirmation number, "Open in Delta" on a flight card, "Open Leap order" on a badge card, reveal/hide for sensitive credentials, and simple notes about which people are associated with which hotel nights or purchases. These should feel handy rather than obtrusive.

## Privacy and group boundaries

The MVP is owner-only and private. Sensitive artifacts must remain authenticated and nonpublic. A later shared version may allow the small trusted group to see trip information with each person landing primarily on their own items, but no interpersonal permission model is required now. Credential-bearing artifacts should still remain distinguishable from ordinary plans so a later sharing decision does not require untangling opaque records.

Critical wallet items may need offline availability, but caching them is a security choice, not an automatic consequence of PWA installation. The eventual design must distinguish harmless itinerary details from QR codes, reservation identifiers, receipts, and personal contacts, and it must define device-loss behavior before sensitive artifacts are cached.

## Research backlog, deliberately downstream

- Observe one current Atlanta page manually across a real change.
- Review redacted prior receipts, confirmation emails, Leap order pages, Magic Companion screens, and the owner's onsite recollections.
- Compare the official mobile app's actual export, notification, and map behavior when the Atlanta edition appears.
- Test how ticket naming, badge transfers, group/team tickets, dropped events, product claims, and cancellations appear in real accounts.
- Evaluate artist-to-card matching against the owner's collection format and a maintained card-data source; do not build it before identifiers and desired matching behavior are known.
- Test a ManaBox collection export. ManaBox distinguishes owned binders from non-owned lists and tracks physical location; preserve those distinctions. A representative third-party CSV workflow indicates that exports include Scryfall IDs, which would provide a promising printing-level join key, but an actual owner export must establish the contract before implementation.
- Evaluate maps only after real Atlanta floor plans appear; distinguish geographic routing from simple “next room” guidance.
- Add monitoring only after one source has been captured, changed, reconciled, and displayed correctly by hand.
- Keep a MagicCon mailbox monitor as a future capability, not a current automation. Candidate messages include Leap orders and changes, ReedPop announcements, travel reservations, ticket transfers, and onsite receipts. Prove manual classification and duplicate handling first.

## Questions for the next conversation

1. At Vegas, what created the most friction for the owner: discovering activities, sellouts, schedule comparison, deciding what was worth the time or price, navigation, Companion check-in, pickups, or remembering purchases?
2. When evaluating an event, which details drive the decision most: format, competitiveness, entry price, included product, prize structure, duration, start time, special guests, or novelty?
3. What personal planning states feel natural: noticed, interested, shortlisted, intending, purchased, checked in, attended, skipped, and rated? Which of these are unnecessary?
4. When two attractive activities conflict, should the app recommend one based on preferences or simply present the tradeoff clearly?
5. How much transition time should normally be protected between activities, and should food, rest, shopping, and wandering be scheduled deliberately?
6. Which items must be available offline on the owner's phone: badge QR, order QR, Companion codes, itinerary, maps, hotel/flight details, receipts, or everything?
7. For purchases and reimbursements, is it enough to record who an item was for and whether money was repaid, without involving the other person in the app?
8. Are ManaBox binder and deck locations accurate enough to drive a “pull these cards before Atlanta” checklist?
9. For an appearing artist, should matches include exact owned printings only, every owned card they illustrated, wishlist cards, and/or stylistically related recommendations?
10. Which parts of the prior Vegas experience would be most valuable to reconstruct next: the complete schedule considered, the final itinerary, purchases, artists/signatures, navigation, or a timeline of what actually happened?

## Working conclusion

The differentiated product is a trustworthy personal convention companion, not a replacement brochure. Its center is the relationship among evidence, ownership, decisions, people, time, and live reality. The first build after discovery should be intentionally narrow: prove one changing source, one personal decision, one itinerary consequence, and one offline-readable critical view.
