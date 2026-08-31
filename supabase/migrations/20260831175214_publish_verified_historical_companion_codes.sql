insert into public.ticketed_play_public_companion_codes (
  event_id,
  companion_code,
  updated_at
)
values
  ('ticketed-944017', 'J2MEP2Y', timezone('utc', now())),
  ('ticketed-944032', 'XQ6E8RY', timezone('utc', now())),
  ('ticketed-944044', 'V2JYN4V', timezone('utc', now())),
  ('ticketed-944067', 'DWVNG6J', timezone('utc', now())),
  ('ticketed-944073', 'V2JYNPE', timezone('utc', now())),
  ('ticketed-944127', '2PEM445', timezone('utc', now()))
on conflict (event_id) do update
set companion_code = excluded.companion_code,
    updated_at = excluded.updated_at;
