-- Apply only after the app reads artist_collection_inventory.
-- Every removed value has been preserved in private tables and source evidence.
do $$ begin
  if exists(select 1 from public.artist_card_printings p where not exists
    (select 1 from public.artist_collection_inventory i where i.printing_id=p.id and i.provenance_status='source_linked'))
    or exists(select 1 from public.artists a where (a.collection_card_count is not null or a.unique_collection_printings is not null)
      and not exists(select 1 from public.artist_collection_profiles c where c.artist_id=a.id
        and c.collection_card_count is not distinct from a.collection_card_count
        and c.unique_collection_printings is not distinct from a.unique_collection_printings)) then
    raise exception 'Private preservation incomplete; cannot remove shared collection fields'; end if;
end $$;
alter table public.artist_card_printings drop column quantity, drop column local_image_filename, drop column local_image_found;
alter table public.artists drop column collection_card_count, drop column unique_collection_printings;
comment on table public.artist_card_printings is 'Shared printing identity, variant and price metadata. Personal holdings live only in artist_collection_inventory.';
