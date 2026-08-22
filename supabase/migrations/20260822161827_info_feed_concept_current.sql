alter table public.info_feed_entries
  add column concept_key text,
  add column feed_status text not null default 'internal',
  add constraint info_feed_concept_key_nonblank check (concept_key is null or btrim(concept_key) <> ''),
  add constraint info_feed_status_allowed check (feed_status in ('current','superseded','internal')),
  add constraint info_feed_current_has_concept check (feed_status <> 'current' or concept_key is not null);

comment on column public.info_feed_entries.concept_key is 'Stable semantic concept identity. Fingerprints and retrieval timestamps belong in evidence, not current-card identity.';
comment on column public.info_feed_entries.feed_status is 'Only current entries render in Recent information. Superseded rows retain history; internal rows retain discovery/bookkeeping evidence.';

update public.info_feed_entries set
  concept_key = case topic_key
    when 'prize-tix' then 'prize-tix'
    when 'on-demand-play' then 'on-demand-play'
    when 'ticketed-play' then 'ticketed-play'
    when 'hours' then 'hours'
    when 'will-call' then 'will-call'
    else null
  end,
  feed_status = case
    when entry_key like 'article-maintained:%' and topic_key in ('prize-tix','on-demand-play','ticketed-play') then 'current'
    when entry_key = 'atlanta-magic-play-resources' then 'internal'
    else 'superseded'
  end;

update public.info_feed_entries
set entry_key = 'concept-current:' || topic_key
where feed_status = 'current';

create unique index info_feed_one_current_per_concept_idx
  on public.info_feed_entries (concept_key)
  where feed_status = 'current';

create index info_feed_current_published_idx
  on public.info_feed_entries (published_at desc)
  where feed_status = 'current';
