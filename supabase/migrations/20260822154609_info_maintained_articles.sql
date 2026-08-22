alter table public.info_topics
  add column article_status text not null default 'incomplete',
  add column article jsonb not null default '{"lede":"","sections":[],"unknowns":[],"contradictions":[],"recent_changes":[]}'::jsonb,
  add constraint info_topics_article_status_allowed check (article_status in ('incomplete','maintained')),
  add constraint info_topics_article_object check (jsonb_typeof(article) = 'object'),
  add constraint info_topics_maintained_has_sections check (
    article_status = 'incomplete' or (
      jsonb_typeof(article->'sections') = 'array'
      and jsonb_array_length(article->'sections') > 0
      and btrim(coalesce(article->>'lede','')) <> ''
    )
  );
comment on column public.info_topics.article_status is 'Link discovery alone remains incomplete. Maintained requires reviewed source content and nonempty article sections.';
comment on column public.info_topics.article is 'Complete factual synthesis with ordered sections, explicit unknowns/contradictions/recent changes; official pages remain evidence.';

create table public.info_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  title text not null,
  url text not null,
  publisher text not null,
  retrieved_at timestamptz not null,
  http_status integer not null,
  content_hash text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint info_source_snapshots_source_hash_unique unique (source_key, content_hash),
  constraint info_source_snapshots_key_nonblank check (btrim(source_key) <> ''),
  constraint info_source_snapshots_url_https check (url ~ '^https://'),
  constraint info_source_snapshots_hash_sha256 check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint info_source_snapshots_http_success check (http_status between 200 and 299),
  constraint info_source_snapshots_evidence_object check (jsonb_typeof(evidence) = 'object')
);
comment on table public.info_source_snapshots is 'Shared source-evidence fingerprints and structured extraction metadata. Full copyrighted page bodies are not stored.';
create index info_source_snapshots_source_retrieved_idx on public.info_source_snapshots (source_key, retrieved_at desc);
alter table public.info_source_snapshots enable row level security;
alter table public.info_source_snapshots force row level security;
revoke all on table public.info_source_snapshots from public, anon, authenticated;
grant select on table public.info_source_snapshots to authenticated;
grant select, insert, update on table public.info_source_snapshots to service_role;
create policy active_companions_select_info_source_snapshots on public.info_source_snapshots for select to authenticated
using (exists (select 1 from public.companion_members viewer where viewer.user_id = (select auth.uid()) and viewer.active));
