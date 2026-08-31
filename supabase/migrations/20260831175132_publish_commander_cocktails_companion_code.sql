insert into public.ticketed_play_public_companion_codes (
  event_id,
  companion_code,
  updated_at
)
values (
  'ticketed-944111',
  '563MXW5',
  timezone('utc', now())
)
on conflict (event_id) do update
set companion_code = excluded.companion_code,
    updated_at = excluded.updated_at;
