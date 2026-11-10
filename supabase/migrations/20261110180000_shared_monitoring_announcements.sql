-- Share reviewed public copy, never the operator evidence/action record.
create schema if not exists private;

create or replace function private.shared_monitoring_announcements()
returns table (
  id uuid, source_label text, source_url text, title text, summary text,
  first_seen_at timestamptz, last_seen_at timestamptz, resources jsonb
)
language sql stable security definer set search_path = ''
as $$
  select f.id, f.source_label, split_part(split_part(f.source_url, '?', 1), '#', 1), f.title, f.summary,
         f.first_seen_at, f.last_seen_at,
         coalesce((
           select jsonb_agg(jsonb_build_object('label', link->>'label', 'url', split_part(split_part(link->>'url', '?', 1), '#', 1)))
           from jsonb_array_elements(case when jsonb_typeof(f.evidence->'presentation_links') = 'array'
             then f.evidence->'presentation_links' else '[]'::jsonb end) link
           where jsonb_typeof(link) = 'object'
             and length(btrim(link->>'label')) > 0
             and link->>'url' ~ '^https://([a-z0-9-]+\.)?mtgfestivals\.com/'
         ), '[]'::jsonb)
  from public.monitoring_findings f
  where (select auth.uid()) is not null
    and exists (
      select 1 from public.companion_members m
      where m.user_id = (select auth.uid()) and m.active
    )
    and f.destination = 'Home'
    and f.evidence->>'home_signal_kind' = 'interesting_announcement'
    and f.status in ('unread', 'read', 'archived')
    and f.evidence->>'announcement_superseded_by' is null
    and f.evidence->>'intake_kind' in ('public_watch', 'first_party_newsletter')
    and f.source_url ~ '^https://([a-z0-9-]+\.)?mtgfestivals\.com/'
    and f.action_type is null
  order by f.first_seen_at desc, f.id
  limit 100;
$$;

revoke all on function private.shared_monitoring_announcements() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.shared_monitoring_announcements() to authenticated;

create or replace function public.shared_monitoring_announcements()
returns table (
  id uuid, source_label text, source_url text, title text, summary text,
  first_seen_at timestamptz, last_seen_at timestamptz, resources jsonb
)
language sql stable security invoker set search_path = ''
as $$ select * from private.shared_monitoring_announcements(); $$;

revoke all on function public.shared_monitoring_announcements() from public, anon, authenticated;
grant execute on function public.shared_monitoring_announcements() to authenticated;

comment on function public.shared_monitoring_announcements() is
  'Active companions read public announcement copy only; personal review state stays in user_selections. Original age and duplicate supersession are preserved.';
