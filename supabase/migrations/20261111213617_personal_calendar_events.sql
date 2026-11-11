
create table public.personal_calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  event_date date not null,
  start_time time not null,
  end_time time not null,
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  invited_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_calendar_time_order check (end_time > start_time),
  constraint personal_calendar_invite_limit check (cardinality(invited_user_ids) <= 20 and array_position(invited_user_ids, null) is null)
);
create index personal_calendar_owner_date_idx on public.personal_calendar_events(owner_id, event_date);
create index personal_calendar_date_idx on public.personal_calendar_events(event_date, start_time);
alter table public.personal_calendar_events enable row level security;
alter table public.personal_calendar_events force row level security;
revoke all on public.personal_calendar_events from public, anon, authenticated;
grant select, insert, update, delete on public.personal_calendar_events to authenticated;

create policy personal_calendar_read on public.personal_calendar_events for select to authenticated using (
  owner_id = (select auth.uid()) or (
    exists (select 1 from public.companion_members where user_id = (select auth.uid()) and active)
    and (visibility = 'shared' or (select auth.uid()) = any(invited_user_ids))
  )
);
create policy personal_calendar_insert on public.personal_calendar_events for insert to authenticated with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.companion_members where user_id = (select auth.uid()) and active)
  and invited_user_ids <@ array(select user_id from public.companion_members where active and user_id is not null)
);
create policy personal_calendar_update on public.personal_calendar_events for update to authenticated
using (owner_id = (select auth.uid())) with check (
  owner_id = (select auth.uid())
  and invited_user_ids <@ array(select user_id from public.companion_members where active and user_id is not null)
);
create policy personal_calendar_delete on public.personal_calendar_events for delete to authenticated using (owner_id = (select auth.uid()));

-- The existing permissive note policies preserve author-private notes. This
-- guard additionally scopes every personal-event note to a readable parent.
-- Text comparison avoids casts of arbitrary legacy object identifiers.
create policy personal_calendar_notes_access on public.personal_notes as restrictive for all to authenticated
using (
  object_id is null or object_id not like 'personal-calendar:%' or exists (
    select 1 from public.personal_calendar_events event where 'personal-calendar:' || event.id::text = personal_notes.object_id
  )
)
with check (
  object_id is null or object_id not like 'personal-calendar:%' or exists (
    select 1 from public.personal_calendar_events event where 'personal-calendar:' || event.id::text = personal_notes.object_id
  )
);

-- A mention target must still be allowed to read its note. A private event,
-- revoked invitation, or private note must not leak through inbox metadata.
create policy note_mentions_readable_note on public.note_mentions as restrictive for select to authenticated
using (exists (select 1 from public.personal_notes note where note.id = note_mentions.note_id));

comment on table public.personal_calendar_events is 'User-created Atlanta calendar events. Times are America/New_York local wall time; invited people receive access, not an attendance commitment.';
