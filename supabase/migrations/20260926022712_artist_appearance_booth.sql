alter table public.artist_appearances add column if not exists booth text;
comment on column public.artist_appearances.booth is 'Official event-specific booth label; null when unpublished. Not a room, signing time, or attendance-day claim.';
