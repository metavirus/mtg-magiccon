export const retrievedAt = '2026-08-22T00:00:00.000Z'

export const officialInfoSnapshots = [
  { source_key: 'atlanta-prize-wall', title: 'Prizes, Prize Tix & Prize Wall', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html', publisher: 'MagicCon / ReedPop', retrieved_at: retrievedAt, http_status: 200, content_hash: '32e0ed8d2495b3ec603a6dd99685d98c1546db2581616f9d1736aab9b93cf276', evidence: { topics: ['prize-tix'], capture: 'Structured factual synthesis; full copyrighted page not stored.' } },
  { source_key: 'atlanta-on-demand-events', title: 'On-Demand Events', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/on-demand-events.html', publisher: 'MagicCon / ReedPop', retrieved_at: retrievedAt, http_status: 200, content_hash: '5d49757aea852f84201d9c38609778726413a156c25bccc56799f654de6f78d3', evidence: { topics: ['on-demand-play', 'prize-tix'], capture: 'Structured factual synthesis; full copyrighted page not stored.' } },
  { source_key: 'atlanta-ticketed-play', title: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html', publisher: 'MagicCon / ReedPop', retrieved_at: retrievedAt, http_status: 200, content_hash: 'e82f56fde0a96b3ec4401abbd39453c7dae33334011bbd6acd446d617d893d0d', evidence: { topics: ['ticketed-play'], capture: 'Structured factual synthesis; full copyrighted page not stored.' } },
  { source_key: 'atlanta-playing-guide', title: 'Your Guide to Playing Magic at MagicCon', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/your-guide-to-playing-magic-at-magiccon.html', publisher: 'MagicCon / ReedPop', retrieved_at: retrievedAt, http_status: 200, content_hash: 'e0984c07f2e1b2ba3ea03d7c21020ec993b761b51181b4d1e13444ede9fcfcf0', evidence: { topics: ['ticketed-play', 'on-demand-play'], capture: 'Structured factual synthesis; full copyrighted page not stored.' } },
]

const source = key => {
  const row = officialInfoSnapshots.find(item => item.source_key === key)
  return { key, label: row.title, url: row.url, publisher: row.publisher, retrievedAt: row.retrieved_at, evidenceKind: 'official_page', contentHash: row.content_hash }
}

export const officialInfoArticles = [
  {
    topic_key: 'prize-tix', title: 'Prize Tix & Prize Wall', article_status: 'maintained',
    concise_answer: 'Earn Prize Tix through scheduled and on-demand Ticketed Play, then redeem them at the Prize Wall during the same MagicCon.',
    facts: [{ label: 'Location', value: 'Inside the Magic Ticketed Play Area' }, { label: 'Sunday deadline', value: 'Join the line by 5:30 PM' }],
    sources: [source('atlanta-prize-wall'), source('atlanta-on-demand-events')],
    article: {
      lede: 'Prize Tix are MagicCon’s play-earned redemption currency. The practical loop is: play an eligible scheduled or on-demand event, receive the listed payout, and spend the Tix at the Atlanta Prize Wall before the convention ends.',
      sections: [
        { key: 'earn-and-redeem', title: 'How Prize Tix work', summary: 'Eligible scheduled and on-demand Ticketed Play events award Prize Tix; each event description carries its payout.', facts: [{ label: 'Redeem at', value: 'Prize Wall' }, { label: 'Cash value', value: 'None' }, { label: 'Carryover', value: 'Not valid at future MagicCons' }, { label: 'Unused ODE vouchers', value: 'Redeemable for 500 Prize Tix per $5 voucher', qualifier: 'Per the On-Demand Events page' }] },
        { key: 'location-hours', title: 'Where and when', facts: [{ label: 'Location', value: 'Inside the Magic Ticketed Play Area' }, { label: 'Friday & Saturday', value: '10 AM–11:59 PM' }, { label: 'Sunday', value: '10 AM–6 PM' }, { label: 'Sunday line cutoff', value: '5:30 PM' }] },
        { key: 'published-prize-bands', title: 'Published starting costs', summary: 'These are starting costs, not a guaranteed complete inventory.', facts: [{ label: 'Play Boosters', value: '500 Prize Tix' }, { label: 'Collector Boosters', value: '2,500 Prize Tix' }, { label: 'Commander precons', value: '5,000 Prize Tix' }, { label: 'Bundles', value: '6,000 Prize Tix' }, { label: 'Jumbo cards (12×17)', value: '20,000 Prize Tix' }, { label: 'Oversized cards (23×32)', value: '40,000 Prize Tix' }, { label: 'Uncut sheets', value: '50,000 Prize Tix' }] },
        { key: 'availability', title: 'Availability rules', bullets: ['The published list is not exhaustive.', 'Other possible categories include deck boxes, sleeves, playmats, dice, Secret Lairs, and other Magic products.', 'Costs may change; allocation depends on availability; limitations may apply.'] },
      ],
      unknowns: ['The full Atlanta prize inventory has not been published.', 'Stock quantities and sell-out timing are unknown.', 'The page does not specify whether any purchase limits apply to particular products.'],
      contradictions: [],
      recent_changes: [{ title: 'Atlanta Prize Wall guidance published', summary: 'Location, hours, starting costs, expiry, and availability rules are now available.', publishedAt: retrievedAt }],
    }, updated_at: retrievedAt,
  },
  {
    topic_key: 'on-demand-play', title: 'On-Demand Play', article_status: 'maintained',
    concise_answer: 'Buy $5 ODE vouchers at the Ticketed Play Hub, join a labeled waiting table, and launch when enough players assemble; no preregistration.',
    facts: [{ label: 'Voucher increment', value: '$5' }, { label: 'Maximum per visit', value: '$100' }, { label: 'Sales end', value: 'Sunday 3 PM PT' }],
    sources: [source('atlanta-on-demand-events'), source('atlanta-playing-guide')],
    article: {
      lede: 'On-Demand Events are flexible, first-come play sessions that launch throughout the weekend instead of at a prebooked time. They cover Commander, team play, drafts, and constructed formats, with Prize Tix or product prizes attached.',
      sections: [
        { key: 'how-to-play', title: 'How to join', facts: [{ label: 'Buy at', value: 'Ticketed Play Hub' }, { label: 'Voucher price', value: '$5 increments' }, { label: 'Purchase cap', value: '$100 per visit' }, { label: 'Preregistration', value: 'Not available' }], bullets: ['Take vouchers to the ODE waiting area.', 'Choose a table labeled for the event type.', 'When enough players are present, call a judge; the judge collects vouchers and starts the event.'] },
        { key: 'registration-hours', title: 'Registration hours', facts: [{ label: 'Constructed & Draft · Fri/Sat', value: '10 AM–8 PM' }, { label: 'Constructed & Draft · Sun', value: '10 AM–3 PM' }, { label: 'Commander · Fri/Sat', value: '10 AM–9 PM' }, { label: 'Commander · Sun', value: '10 AM–4 PM' }, { label: 'Black Lotus access', value: '9:45 AM daily' }, { label: 'All voucher sales end', value: 'Sunday 3 PM PT' }] },
        { key: 'commander', title: 'Commander pods', summary: 'Four-voucher ($20) pods run one 90-minute round for three to four players.', facts: [{ label: 'Bracket 1–2', value: '1,800 Prize Tix per player' }, { label: 'Bracket 2–3', value: '3,000 win / 1,300 loss' }, { label: 'Bracket 4–5', value: '5,000 win / 600 loss' }] },
        { key: 'team-events', title: 'Team events', summary: 'Bring your teammate(s); the published offerings include Two-Headed Giant Commander and draft.', facts: [{ label: '2HG Commander', value: '$20/player · 1,800 Prize Tix/player' }, { label: 'Star Trek 2HG draft', value: '$35/player · 3 rounds · 1,200 win / 400 loss' }, { label: 'Mystery Booster Commander 2HG draft', value: '$45/player · 2 rounds · 2,000 win / 1,200 loss' }] },
        { key: 'drafts', title: 'Draft offerings', bullets: ['Star Trek Swiss Draft: $35, three rounds, 1,200 Tix for a win and 400 for a loss.', 'Star Trek single-elimination: $35, prizes range from 1,000 Tix through 8,000 Tix by finish.', 'Reality Fracture Swiss Draft: $30, three rounds, 1,200 win / 400 loss.', 'Mystery Booster Commander Edition draft: $45, two rounds, 2,000 win / 1,200 loss.'] },
        { key: 'constructed', title: 'Constructed Win-a-Box', facts: [{ label: 'Formats', value: 'Standard, Pauper, Pioneer, Modern, or Legacy' }, { label: 'Entry', value: '$25' }, { label: 'Structure', value: 'Three single-elimination rounds' }, { label: 'Match payout', value: '1,200 win / 600 loss' }, { label: 'Undefeated prize', value: 'One Star Trek Play Booster Box' }] },
        { key: 'constraints', title: 'Important constraints', bullets: ['Vouchers are non-refundable and cannot be reproduced, resold, or upgraded.', 'Events and vouchers are first-come, first-served and depend on space, time, and product availability.', 'Event details may change.', 'Unused vouchers may be redeemed at 500 Prize Tix per $5.'] },
        { key: 'where', title: 'Where to look', summary: 'ODEs launch via the Play Hub and use red tablecloths under the Red On Demand Events skybox.' },
      ],
      unknowns: ['Live queue lengths and which tables are currently forming are not published.', 'Product availability for draft offerings is not guaranteed.', 'The official page does not clarify whether the $100 cap resets immediately after each transaction or after a time interval.'],
      contradictions: [{ summary: 'The page lists Commander registration through 4 PM Sunday but also says all voucher sales end at 3 PM PT Sunday; confirm whether previously purchased vouchers can start Commander ODEs after 3 PM.', sourceKeys: ['atlanta-on-demand-events'] }],
      recent_changes: [{ title: 'Atlanta ODE menu published', summary: 'Registration flow, hours, voucher rules, event menu, payouts, and constraints are available.', publishedAt: retrievedAt }],
    }, updated_at: retrievedAt,
  },
  {
    topic_key: 'ticketed-play', title: 'Ticketed Play', article_status: 'maintained',
    concise_answer: 'Sales open August 25 at 10 AM PT; a MagicCon Atlanta badge is required and sales close one hour before each event.',
    facts: [{ label: 'Sales open', value: 'August 25 at 10 AM PT' }, { label: 'Sales close', value: 'One hour before start' }],
    sources: [source('atlanta-ticketed-play'), source('atlanta-playing-guide')],
    article: {
      lede: 'Scheduled Ticketed Play is the main prebooked Magic play program, with more than 100 events across formats, products, and play styles. Buy carefully: entries are tied to a MagicCon badge and are non-refundable.',
      sections: [
        { key: 'sales-rules', title: 'Registration rules', facts: [{ label: 'Sales open', value: 'August 25 at 10 AM PT' }, { label: 'Badge required', value: 'Yes' }, { label: 'Sales close', value: 'One hour before event start' }, { label: 'Refunds or transfers', value: 'No refunds; cannot be reproduced, resold, or upgraded' }], bullets: ['Team-event entry fees cover the full team.', 'Teams are expected to be assembled before registration.', 'The schedule page is descriptive until the live inventory opens.'] },
        { key: 'where', title: 'Where scheduled play happens', summary: 'Ticketed Play spans Halls C and B. Primary areas use White, Blue, Black, and Green tablecloths.' },
        { key: 'playstyles', title: 'Choose by play style', facts: [{ label: 'Social', value: 'Fun and shared game states over winning' }, { label: 'Challenging', value: 'A mix of winning and approachable play' }, { label: 'Competitive', value: 'Efficiency, decisions, and complex interactions', qualifier: 'The tag alone does not imply deck lists or Competitive REL' }] },
        { key: 'other-play', title: 'Other ways to play', bullets: ['Command Zone: free Commander play next to Ticketed Play, with matchmaking signs and judges.', 'Leagues: weekend-long sealed events with open-ended game timing; check in at the Green Stage.', 'Free Play: open, self-directed play and trading areas around the convention.', 'Creator Central and Gathering Grounds may host additional play.'] },
      ],
      unknowns: ['The live purchasable event inventory is not yet open on the descriptive schedule page.', 'Exact room/table assignments for individual events depend on the later schedule and event map.', 'Sell-outs and remaining capacity are unknown until registration opens.'],
      contradictions: [],
      recent_changes: [{ title: 'Ticketed Play timing and guide published', summary: 'Sale timing, purchase constraints, venue areas, play-style tags, and alternate play areas are now documented.', publishedAt: retrievedAt }],
    }, updated_at: retrievedAt,
  },
  {
    topic_key: 'hours', title: 'Show hours', article_status: 'maintained',
    concise_answer: 'The show floor is open 10 AM–7 PM Friday and Saturday, and 10 AM–6 PM Sunday.',
    facts: [{ label: 'Friday', value: '10 AM–7 PM' }, { label: 'Saturday', value: '10 AM–7 PM' }, { label: 'Sunday', value: '10 AM–6 PM' }, { label: 'Magic Play', value: 'Fri/Sat until 11:59 PM; Sunday until 6 PM' }],
    sources: [{ key: 'atlanta-order-confirmation', label: 'MagicCon: Atlanta 2026 Order Confirmation', publisher: 'Leap Event Technology / MagicCon', retrievedAt: '2026-06-16T00:00:00.000Z', evidenceKind: 'official_order', contentHash: '1c405d0ebf9938aeef23d07f62021070bb7f6f3c13f60663f13c7872db6f2486' }],
    article: { lede: 'Atlanta’s general show floor runs daytime hours, while the Magic Play area remains open later on Friday and Saturday.', sections: [{ key: 'hours', title: 'Published hours', facts: [{ label: 'Friday, Nov. 13', value: '10 AM–7 PM' }, { label: 'Saturday, Nov. 14', value: '10 AM–7 PM' }, { label: 'Sunday, Nov. 15', value: '10 AM–6 PM' }, { label: 'Magic Play · Fri/Sat', value: 'Closes 11:59 PM' }, { label: 'Magic Play · Sunday', value: 'Closes 6 PM' }] }], unknowns: ['Hours for individual booths, vendors, artists, and activities may be narrower than the general show floor hours.'], contradictions: [], recent_changes: [{ title: 'Atlanta show hours retained', summary: 'General show-floor and late Magic Play closing times are captured from the official order confirmation.', publishedAt: '2026-06-16T00:00:00.000Z' }] }, updated_at: '2026-06-16T00:00:00.000Z',
  },
  {
    topic_key: 'will-call', title: 'Will Call', article_status: 'maintained',
    concise_answer: 'Registration and Will Call run Thursday 12–6 PM, Friday and Saturday 8:30 AM–7 PM, and Sunday 8:30 AM–6 PM.',
    facts: [{ label: 'Thursday', value: '12 PM–6 PM' }, { label: 'Friday', value: '8:30 AM–7 PM' }, { label: 'Saturday', value: '8:30 AM–7 PM' }, { label: 'Sunday', value: '8:30 AM–6 PM' }],
    sources: [{ key: 'atlanta-order-confirmation', label: 'MagicCon: Atlanta 2026 Order Confirmation', publisher: 'Leap Event Technology / MagicCon', retrievedAt: '2026-06-16T00:00:00.000Z', evidenceKind: 'official_order', contentHash: '1c405d0ebf9938aeef23d07f62021070bb7f6f3c13f60663f13c7872db6f2486' }],
    article: { lede: 'Use Registration/Will Call for onsite badge pickup. Bring the confirmation email and photo ID.', sections: [{ key: 'pickup', title: 'What to bring', bullets: ['Confirmation email', 'Photo ID'] }, { key: 'hours', title: 'Registration / Will Call hours', facts: [{ label: 'Thursday, Nov. 12', value: '12 PM–6 PM' }, { label: 'Friday, Nov. 13', value: '8:30 AM–7 PM' }, { label: 'Saturday, Nov. 14', value: '8:30 AM–7 PM' }, { label: 'Sunday, Nov. 15', value: '8:30 AM–6 PM' }] }], unknowns: ['The exact Registration/Will Call location within the venue has not been captured.', 'Live queue times are unknown.'], contradictions: [], recent_changes: [{ title: 'Atlanta Will Call instructions retained', summary: 'Pickup requirements and daily Registration/Will Call hours are captured from the official order confirmation.', publishedAt: '2026-06-16T00:00:00.000Z' }] }, updated_at: '2026-06-16T00:00:00.000Z',
  },
]
