begin;

create table public.ticketed_play_public_companion_codes (
  event_id text primary key,
  companion_code text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ticketed_play_public_companion_codes_event_id
    check (event_id ~ '^ticketed-[0-9]+$'),
  constraint ticketed_play_public_companion_codes_code
    check (companion_code ~ '^[A-Z0-9]{6,12}$')
);

comment on table public.ticketed_play_public_companion_codes is
  'Public Wizards Companion join codes keyed to exact canonical event IDs. Contains no user, selection, receipt, purchase, or private routing evidence.';

alter table public.ticketed_play_public_companion_codes enable row level security;
alter table public.ticketed_play_public_companion_codes force row level security;

revoke all on table public.ticketed_play_public_companion_codes from public, anon, authenticated;
grant select on table public.ticketed_play_public_companion_codes to anon, authenticated;

create policy public_read_ticketed_play_companion_codes
  on public.ticketed_play_public_companion_codes
  for select to anon, authenticated
  using (true);

insert into public.ticketed_play_public_companion_codes (event_id, companion_code)
values
  ('ticketed-944088', 'V2JYNWE'),
  ('ticketed-944091', 'V2JYNWE')
on conflict (event_id) do update
set companion_code = excluded.companion_code,
    updated_at = timezone('utc', now());

commit;
