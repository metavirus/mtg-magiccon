create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  actor_label text not null,
  object_id text not null,
  object_kind text not null,
  activity_type text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_activity_events_actor_length check (char_length(actor_label) between 1 and 40),
  constraint user_activity_events_object_id_length check (char_length(object_id) between 1 and 120),
  constraint user_activity_events_object_kind_allowed check (
    object_kind in ('event', 'alert', 'receipt', 'place', 'hotel', 'artist', 'note', 'wallet', 'trip', 'map', 'activity', 'general')
  ),
  constraint user_activity_events_activity_type_length check (char_length(activity_type) between 1 and 80),
  constraint user_activity_events_summary_length check (char_length(summary) between 1 and 280)
);

alter table public.user_activity_events enable row level security;
alter table public.user_activity_events force row level security;

revoke all on public.user_activity_events from public;
revoke all on public.user_activity_events from anon;
grant select, insert, update, delete on public.user_activity_events to authenticated;

create policy "user_activity_events_select_own"
  on public.user_activity_events
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy "user_activity_events_insert_own"
  on public.user_activity_events
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "user_activity_events_update_own"
  on public.user_activity_events
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "user_activity_events_delete_own"
  on public.user_activity_events
  for delete
  to authenticated
  using (owner_id = auth.uid());

create index if not exists user_activity_events_owner_created_idx
  on public.user_activity_events (owner_id, created_at desc);

create index if not exists user_activity_events_owner_object_idx
  on public.user_activity_events (owner_id, object_kind, object_id, created_at desc);
