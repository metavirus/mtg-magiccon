begin;

create table public.ticketed_play_current_availability (
  event_id text primary key,
  source_event_key text not null unique,
  availability text not null check (availability in ('available', 'sold_out', 'waitlist', 'unavailable', 'unknown')),
  observed_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ticketed_play_current_availability_event_id check (event_id ~ '^ticketed-[0-9]+$'),
  constraint ticketed_play_current_availability_source_key check (source_event_key ~ '^[0-9]+$')
);

comment on table public.ticketed_play_current_availability is
  'Sanitized current official Ticketed Play availability keyed to exact canonical event IDs. Contains no user, selection, or private routing evidence.';

alter table public.ticketed_play_current_availability enable row level security;
alter table public.ticketed_play_current_availability force row level security;

revoke all on table public.ticketed_play_current_availability from public, anon, authenticated;
grant select on table public.ticketed_play_current_availability to authenticated;

create policy active_companions_read_ticketed_play_availability
  on public.ticketed_play_current_availability
  for select to authenticated
  using (
    exists (
      select 1 from public.companion_members
      where active and user_id = (select auth.uid())
    )
  );

commit;
