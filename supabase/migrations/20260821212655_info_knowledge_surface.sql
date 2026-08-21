create table public.info_topics (
  id uuid primary key default gen_random_uuid(), topic_key text not null unique, title text not null,
  concise_answer text not null, facts jsonb not null default '[]'::jsonb, sources jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null, created_at timestamptz not null default now(),
  constraint info_topics_key_nonblank check (btrim(topic_key) <> ''), constraint info_topics_title_nonblank check (btrim(title) <> ''),
  constraint info_topics_answer_nonblank check (btrim(concise_answer) <> ''), constraint info_topics_facts_array check (jsonb_typeof(facts) = 'array'),
  constraint info_topics_sources_array check (jsonb_typeof(sources) = 'array')
);
comment on table public.info_topics is 'Shared maintained official-event knowledge for active Atlanta companions. Derived from retained source evidence; not raw monitoring diffs or personal state.';
create table public.info_feed_entries (
  id uuid primary key default gen_random_uuid(), entry_key text not null unique,
  topic_key text references public.info_topics(topic_key) on delete set null, title text not null, summary text not null,
  published_at timestamptz not null, sources jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(),
  constraint info_feed_key_nonblank check (btrim(entry_key) <> ''), constraint info_feed_title_nonblank check (btrim(title) <> ''),
  constraint info_feed_summary_nonblank check (btrim(summary) <> ''), constraint info_feed_sources_array check (jsonb_typeof(sources) = 'array')
);
comment on table public.info_feed_entries is 'Persistent shared official-information feed. Entries remain browsable even when no maintained topic is warranted.';
create index info_feed_entries_published_idx on public.info_feed_entries (published_at desc);
create index info_feed_entries_topic_published_idx on public.info_feed_entries (topic_key, published_at desc) where topic_key is not null;
alter table public.info_topics enable row level security; alter table public.info_topics force row level security;
alter table public.info_feed_entries enable row level security; alter table public.info_feed_entries force row level security;
revoke all on table public.info_topics, public.info_feed_entries from public, anon, authenticated;
grant select on table public.info_topics, public.info_feed_entries to authenticated;
create policy active_companions_select_info_topics on public.info_topics for select to authenticated
using (exists (select 1 from public.companion_members viewer where viewer.user_id = (select auth.uid()) and viewer.active));
create policy active_companions_select_info_feed on public.info_feed_entries for select to authenticated
using (exists (select 1 from public.companion_members viewer where viewer.user_id = (select auth.uid()) and viewer.active));

insert into public.info_topics (topic_key,title,concise_answer,facts,sources,updated_at) values
('hours','Show hours','The show floor is open 10 AM–7 PM Friday and Saturday, and 10 AM–6 PM Sunday.','[{"label":"Friday","value":"10 AM–7 PM"},{"label":"Saturday","value":"10 AM–7 PM"},{"label":"Sunday","value":"10 AM–6 PM"},{"label":"Play area","value":"Friday and Saturday until 11:59 PM"}]','[{"label":"MagicCon: Atlanta 2026 Order Confirmation","detail":"Received June 16, 2026"}]','2026-06-16T00:00:00Z'),
('will-call','Will Call','Registration and Will Call run Thursday 12–6 PM, Friday and Saturday 8:30 AM–7 PM, and Sunday 8:30 AM–6 PM.','[{"label":"Thursday","value":"12 PM–6 PM"},{"label":"Friday","value":"8:30 AM–7 PM"},{"label":"Saturday","value":"8:30 AM–7 PM"},{"label":"Sunday","value":"8:30 AM–6 PM"}]','[{"label":"MagicCon: Atlanta 2026 Order Confirmation","detail":"Received June 16, 2026"}]','2026-06-16T00:00:00Z'),
('ticketed-play','Ticketed Play','Ticketed Play sales open August 25 at 10 AM PT; event sales close one hour before each event starts.','[{"label":"Sales open","value":"August 25 at 10 AM PT"},{"label":"Sales close","value":"One hour before each event starts"}]','[{"label":"Official Ticketed Play Schedule","url":"https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html","capturedAt":"2026-08-18T17:29:32.154Z"}]','2026-08-18T17:29:32.154Z'),
('on-demand-play','On-Demand Play','On-Demand Event vouchers are sold in $5 increments, up to $100 per visit; the official page also publishes registration hours.','[{"label":"Voucher increments","value":"$5"},{"label":"Maximum per visit","value":"$100"}]','[{"label":"Official On-Demand Events","url":"https://mcatlanta.mtgfestivals.com/en-us/magic-play/on-demand-events.html","capturedAt":"2026-08-18T17:29:32.154Z"}]','2026-08-18T17:29:32.154Z'),
('prize-tix','Prize Tix','Prize Tix earned from play can be redeemed at the Prize Wall; specific event awards remain attached to their event listings.','[{"label":"Redeem at","value":"Prize Wall"},{"label":"Award amounts","value":"See each event listing"}]','[{"label":"Official Prizes, Prize Tix & Prize Wall","url":"https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html","capturedAt":"2026-08-18T17:29:32.154Z"}]','2026-08-18T17:29:32.154Z');
insert into public.info_feed_entries (entry_key,topic_key,title,summary,published_at,sources) values
('atlanta-ticketed-play-aug-25-sale','ticketed-play','Ticketed Play sale timing published','Sales open August 25 at 10 AM PT; event sales close one hour before each event starts.','2026-08-18T17:29:32.154Z','[{"label":"Official Ticketed Play Schedule","url":"https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html"}]'),
('atlanta-on-demand-logistics','on-demand-play','On-Demand Play logistics published','Vouchers are sold in $5 increments, up to $100 per visit; registration hours are on the official page.','2026-08-18T17:29:32.154Z','[{"label":"Official On-Demand Events","url":"https://mcatlanta.mtgfestivals.com/en-us/magic-play/on-demand-events.html"}]'),
('atlanta-prize-wall-logistics','prize-tix','Prize Wall guidance published','The official Prize Wall page explains Prize Tix redemption.','2026-08-18T17:29:32.154Z','[{"label":"Official Prizes, Prize Tix & Prize Wall","url":"https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html"}]'),
('atlanta-magic-play-resources','ticketed-play','Official Magic Play resources linked','Official Ticketed Play, On-Demand Play, Prize Wall, and play-guide resources are now linked from the Atlanta site.','2026-08-21T19:58:21.179696Z','[{"label":"Official Magic Play","url":"https://mcatlanta.mtgfestivals.com/en-us/magic-play.html"}]');
