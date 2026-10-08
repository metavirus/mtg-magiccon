create table public.exhibitor_directory (
  id text primary key check (id ~ '^[0-9]+$'),
  event_key text not null default 'magiccon_atlanta_2026' check (event_key = 'magiccon_atlanta_2026'),
  record jsonb not null check (jsonb_typeof(record) = 'object' and record->>'id' = id and length(record->>'name') > 0),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  checked_at timestamptz not null,
  active boolean not null default true
);
alter table public.exhibitor_directory enable row level security;
revoke all on public.exhibitor_directory from public, anon, authenticated;
grant select on public.exhibitor_directory to authenticated;
grant all on public.exhibitor_directory to service_role;
create policy companions_read_exhibitors on public.exhibitor_directory for select to authenticated
using (exists (select 1 from public.companion_members where user_id = (select auth.uid()) and active));

alter table public.personal_notes drop constraint personal_notes_object_kind_value;
alter table public.personal_notes add constraint personal_notes_object_kind_value check (object_kind in ('event','alert','receipt','place','hotel','artist','note','exhibitor'));
alter table public.personal_notes add constraint exhibitor_notes_private check (object_kind <> 'exhibitor' or visibility = 'private');
alter table public.user_selections drop constraint user_selections_object_kind_value;
alter table public.user_selections add constraint user_selections_object_kind_value check (object_kind in ('event','alert','receipt','place','hotel','artist','wallet','trip','map','activity','general','exhibitor'));
alter table public.user_activity_events drop constraint user_activity_events_object_kind_allowed;
alter table public.user_activity_events add constraint user_activity_events_object_kind_allowed check (object_kind in ('event','alert','receipt','place','hotel','artist','note','wallet','trip','map','activity','general','exhibitor'));

comment on table public.exhibitor_directory is 'Reviewed Atlanta exhibitor feed projection. Cloud staging verifies exact source content before publication. Saves and notes remain owner scoped in existing tables.';
