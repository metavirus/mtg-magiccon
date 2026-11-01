-- An offer ID owns interests. Never repurpose it, even before the first interest.
-- BEFORE UPDATE also runs for ON CONFLICT after PostgreSQL locks the conflicting row;
-- comparing OLD/NEW avoids the race in a separate preflight SELECT.
create function public.guard_catalog_offer_identity()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if row(new.catalog_id, new.offer_key, new.product_id, new.variant_id)
     is distinct from row(old.catalog_id, old.offer_key, old.product_id, old.variant_id) then
    raise exception 'catalog offer identity is immutable; use a new offer key for a different product or variant'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_catalog_offer_identity() from public, anon, authenticated;
create trigger catalog_offer_identity_immutable
before update on public.catalog_offers
for each row execute function public.guard_catalog_offer_identity();

-- Web collection responses and redacted reviewed email synopses are retained as
-- their actual JSON bytes, never disguised as an image/PDF. JSON is evidence only.
alter table public.catalog_media drop constraint catalog_media_mime_type_check;
alter table public.catalog_media add constraint catalog_media_mime_type_check check (
  mime_type is null or mime_type ~ '^(image/(png|jpeg|webp)|application/pdf)$'
  or (mime_type = 'application/json' and media_role = 'source_original' and purpose = 'evidence')
);

create or replace function public.promote_catalog_batch(p_plan jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_batch_key text;
  v_plan_sha256 text;
  v_catalog jsonb;
  v_source jsonb;
  v_promotion jsonb;
  v_value jsonb;
  v_media jsonb;
  v_availability jsonb;
  v_retained jsonb;
  v_existing public.catalog_promotion_batches%rowtype;
  v_catalog_id uuid;
  v_capture_id uuid;
  v_product_id uuid;
  v_variant_id uuid;
  v_offer_id uuid;
  v_original_media_id uuid;
  v_media_id uuid;
  v_price numeric(12,2);
  v_currency text;
  v_prize_cost integer;
  v_display_label text;
  v_reviewed_at timestamptz;
  v_observed_at timestamptz;
  v_event_day date;
  v_original_ext text;
  v_media_ext text;
  v_original_mime text;
  v_media_mime text;
  v_readback jsonb;
  v_promoted_offer_ids jsonb := '[]'::jsonb;
  v_promotion_count integer;
  v_retained_count integer;
begin
  if v_actor is null or not public.catalog_is_operator() then
    raise exception 'catalog promotion requires the active Kavi roster identity'
      using errcode = '42501';
  end if;

  if p_plan is null or jsonb_typeof(p_plan) <> 'object' then
    raise exception 'catalog promotion plan must be a JSON object'
      using errcode = '22023';
  end if;

  if p_plan->>'schemaVersion' <> '1'
     or jsonb_typeof(p_plan->'catalog') <> 'object'
     or jsonb_typeof(p_plan->'sourceCapture') <> 'object'
     or jsonb_typeof(p_plan->'retainedReviews') <> 'array'
     or jsonb_typeof(p_plan->'promotions') <> 'array' then
    raise exception 'catalog promotion plan must match schema version 1'
      using errcode = '22023';
  end if;

  v_batch_key := p_plan->>'batchKey';
  v_catalog := p_plan->'catalog';
  v_source := p_plan->'sourceCapture';
  v_promotion_count := jsonb_array_length(p_plan->'promotions');
  v_retained_count := jsonb_array_length(p_plan->'retainedReviews');

  if v_batch_key is null or v_batch_key !~ '^[a-z0-9][a-z0-9_-]{0,119}$'
     or v_promotion_count = 0 then
    raise exception 'catalog promotion requires a stable batch key and at least one approved item'
      using errcode = '22023';
  end if;

  -- Fixture and unresolved review markers are never part of the ready planner
  -- contract. Check both legacy snake_case and prospective camelCase markers.
  if coalesce((p_plan->>'fixtureOnly')::boolean, false)
     or coalesce((v_catalog->>'fixtureOnly')::boolean, false)
     or coalesce((v_catalog->>'fixture_only')::boolean, false)
     or v_batch_key ~ '(^|[_-])(qa|fixture)([_-]|$)'
     or coalesce(v_catalog->>'catalogKey', '') ~ '(^|[_-])(qa|fixture)([_-]|$)'
     or coalesce(v_catalog->>'eventKey', '') ~ '(^|[_-])(qa|fixture)([_-]|$)' then
    raise exception 'fixture catalog plans cannot be promoted'
      using errcode = '22023';
  end if;

  -- Historical/reference catalogs retain reusable identity and media evidence,
  -- but never assert that an item is current event inventory.
  if coalesce(v_catalog->>'purpose', 'inventory') <> 'inventory' then
    raise exception 'reference catalogs cannot be promoted as current inventory'
      using errcode = '22023';
  end if;

  if p_plan @? '$.** ? (@ == "pending")' then
    raise exception 'pending catalog reviews cannot be promoted'
      using errcode = '22023';
  end if;

  if v_catalog->>'catalogKey' is null
     or v_catalog->>'catalogKey' !~ '^[a-z0-9][a-z0-9_-]{0,119}$'
     or nullif(btrim(v_catalog->>'eventKey'), '') is null
     or length(btrim(v_catalog->>'eventKey')) > 120
     or v_catalog->>'family' not in ('show_store', 'black_lotus', 'prize_wall')
     or nullif(btrim(v_catalog->>'title'), '') is null
     or length(btrim(v_catalog->>'title')) > 160
     or (v_catalog->'section' <> 'null'::jsonb and nullif(btrim(v_catalog->>'section'), '') is null) then
    raise exception 'catalog identity is malformed'
      using errcode = '22023';
  end if;

  if v_source->>'identityKey' is distinct from
       ((v_catalog->>'catalogKey') || ':' || coalesce(v_source->>'sourceSha256', ''))
     or v_source->>'captureKind' not in ('official_pdf', 'official_web', 'board_photo', 'manual_entry')
     or nullif(btrim(v_source->>'intakeSourceKind'), '') is null
     or nullif(btrim(v_source->>'sourceLabel'), '') is null
     or length(btrim(v_source->>'sourceLabel')) > 200
     or coalesce(v_source->>'sourceSha256', '') !~ '^[0-9a-f]{64}$'
     or nullif(btrim(v_source->>'originalFilename'), '') is null
     or nullif(btrim(v_source->>'originalPath'), '') is null
     or coalesce(v_source->>'observedOn', '') !~ '^\d{4}-\d{2}-\d{2}$'
     or (v_source->'sourceUrl' <> 'null'::jsonb and coalesce(v_source->>'sourceUrl', '') !~ '^https://') then
    raise exception 'source capture identity is malformed'
      using errcode = '22023';
  end if;

  begin
    v_event_day := (v_source->>'observedOn')::date;
  exception when others then
    raise exception 'source capture observedOn is invalid' using errcode = '22023';
  end;

  v_original_ext := lower(substring(v_source->>'originalFilename' from '\.([a-zA-Z0-9]+)$'));
  if v_original_ext = 'jpg' then v_original_ext := 'jpeg'; end if;
  if v_original_ext not in ('png', 'jpeg', 'webp', 'pdf', 'json')
     or (v_original_ext = 'json' and v_source->>'captureKind' not in ('official_web', 'manual_entry'))
     or lower(v_source->>'originalPath') !~
       (coalesce(v_source->>'sourceSha256', '') || '\.(png|jpe?g|webp|pdf|json)$') then
    raise exception 'source original path must be content-addressed and use a supported type'
      using errcode = '22023';
  end if;
  v_original_mime := case when v_original_ext = 'pdf' then 'application/pdf' when v_original_ext = 'json' then 'application/json' else 'image/' || v_original_ext end;

  -- Every source item has exactly one terminal retained review. Approved
  -- reviews must correspond one-to-one with promotions.
  if exists (
    select 1
    from jsonb_array_elements(p_plan->'retainedReviews') retained
    where jsonb_typeof(retained) <> 'object'
       or retained->>'decision' not in ('approve', 'reject')
       or nullif(btrim(retained->>'sourceItemKey'), '') is null
       or nullif(btrim(retained->>'reviewedBy'), '') is null
       or coalesce(retained->>'reviewedAt', '') = ''
       or (retained->>'decision' = 'approve' and retained->'reason' <> 'null'::jsonb)
       or (retained->>'decision' = 'reject' and nullif(btrim(retained->>'reason'), '') is null)
  ) or (
    select count(*) <> count(distinct retained->>'sourceItemKey')
    from jsonb_array_elements(p_plan->'retainedReviews') retained
  ) or (
    select count(*)
    from jsonb_array_elements(p_plan->'retainedReviews') retained
    where retained->>'decision' = 'approve'
  ) <> v_promotion_count then
    raise exception 'retained reviews must be unique, terminal, and match approved promotions'
      using errcode = '22023';
  end if;

  for v_retained in select value from jsonb_array_elements(p_plan->'retainedReviews')
  loop
    begin
      perform (v_retained->>'reviewedAt')::timestamptz;
    exception when others then
      raise exception 'retained review timestamp is invalid' using errcode = '22023';
    end;
  end loop;

  v_plan_sha256 := encode(extensions.digest(p_plan::text, 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_batch_key, 0));

  select * into v_existing
  from public.catalog_promotion_batches batch
  where batch.batch_key = v_batch_key;

  if found then
    if v_existing.plan_sha256 <> v_plan_sha256 then
      raise exception 'batch key already belongs to a different promotion plan'
        using errcode = '23505';
    end if;
    return v_existing.readback;
  end if;

  insert into public.catalogs (event_key, family, purpose, title, description, published)
  values (
    btrim(v_catalog->>'eventKey'),
    (v_catalog->>'family')::public.catalog_family,
    'inventory',
    btrim(v_catalog->>'title'),
    nullif(btrim(v_catalog->>'section'), ''),
    false
  )
  on conflict (event_key, family) do update
    set title = excluded.title,
        description = excluded.description,
        purpose = 'inventory',
        published = false,
        updated_at = now()
  returning id into v_catalog_id;

  insert into public.catalog_source_captures (
    catalog_id, capture_kind, source_label, source_url, source_sha256,
    captured_by, captured_at, effective_at, notes
  ) values (
    v_catalog_id,
    (v_source->>'captureKind')::public.catalog_capture_kind,
    btrim(v_source->>'sourceLabel'),
    nullif(btrim(v_source->>'sourceUrl'), ''),
    v_source->>'sourceSha256',
    v_actor,
    v_event_day::timestamptz,
    v_event_day::timestamptz,
    jsonb_build_object(
      'identityKey', v_source->>'identityKey',
      'intakeSourceKind', v_source->>'intakeSourceKind',
      'originalFilename', v_source->>'originalFilename',
      'originalPath', v_source->>'originalPath',
      'rightsNote', v_source->'rightsNote'
    )::text
  )
  on conflict (catalog_id, source_sha256) do nothing
  returning id into v_capture_id;

  if v_capture_id is null then
    select capture.id into v_capture_id
    from public.catalog_source_captures capture
    where capture.catalog_id = v_catalog_id
      and capture.source_sha256 = v_source->>'sourceSha256'
      and capture.capture_kind = (v_source->>'captureKind')::public.catalog_capture_kind
      and capture.source_label = btrim(v_source->>'sourceLabel')
      and capture.source_url is not distinct from nullif(btrim(v_source->>'sourceUrl'), '');
    if v_capture_id is null then
      raise exception 'source hash already exists with conflicting capture identity'
        using errcode = '23505';
    end if;
  end if;

  insert into public.catalog_media (
    source_capture_id, media_role, purpose, match_status,
    bucket_id, object_path, mime_type, sha256, review_status
  ) values (
    v_capture_id, 'source_original', 'evidence', 'unreviewed',
    'private-catalog-artifacts',
    v_capture_id::text || '/originals/' || (v_source->>'sourceSha256') || '.' || v_original_ext,
    v_original_mime, v_source->>'sourceSha256', 'pending'
  )
  on conflict (bucket_id, object_path) do nothing
  returning id into v_original_media_id;

  if v_original_media_id is null then
    select media.id into v_original_media_id
    from public.catalog_media media
    where media.bucket_id = 'private-catalog-artifacts'
      and media.object_path = v_capture_id::text || '/originals/' || (v_source->>'sourceSha256') || '.' || v_original_ext
      and media.source_capture_id = v_capture_id
      and media.media_role = 'source_original'
      and media.sha256 = v_source->>'sourceSha256';
    if v_original_media_id is null then
      raise exception 'source media path already exists with conflicting provenance'
        using errcode = '23505';
    end if;
  end if;

  for v_promotion in
    select value from jsonb_array_elements(p_plan->'promotions')
    order by value->>'sourceItemKey'
  loop
    v_value := v_promotion->'offer'->'value';
    v_media := v_promotion->'presentationMedia';
    v_availability := v_promotion->'availabilityObservation';

    if jsonb_typeof(v_promotion) <> 'object'
       or nullif(btrim(v_promotion->>'sourceItemKey'), '') is null
       or jsonb_typeof(v_promotion->'product') <> 'object'
       or jsonb_typeof(v_promotion->'offer') <> 'object'
       or jsonb_typeof(v_promotion->'reviewedObservation') <> 'object'
       or jsonb_typeof(v_media) <> 'object'
       or jsonb_typeof(v_availability) <> 'object'
       or not coalesce((v_promotion->'offer'->>'published')::boolean, false)
       or not exists (
         select 1 from jsonb_array_elements(p_plan->'retainedReviews') retained
         where retained->>'sourceItemKey' = v_promotion->>'sourceItemKey'
           and retained->>'decision' = 'approve'
           and retained->>'reviewedBy' = v_promotion->'reviewedObservation'->>'reviewedBy'
           and retained->>'reviewedAt' = v_promotion->'reviewedObservation'->>'reviewedAt'
       ) then
      raise exception 'promotion item is malformed or lacks its approved retained review'
        using errcode = '22023';
    end if;

    if coalesce(v_promotion->'product'->>'canonicalKey', '') !~ '^[a-z0-9][a-z0-9_-]{0,119}$'
       or nullif(btrim(v_promotion->'product'->>'name'), '') is null
       or length(btrim(v_promotion->'product'->>'name')) > 200
       or nullif(btrim(v_promotion->'product'->>'category'), '') is null
       or length(btrim(v_promotion->'product'->>'category')) > 100
       or coalesce(v_promotion->'offer'->>'offerKey', '') !~ '^[a-z0-9][a-z0-9_-]{0,119}$'
       or (v_promotion->'offer'->>'purchaseLimit' is not null and
           coalesce(v_promotion->'offer'->>'purchaseLimit', '') !~ '^[1-9][0-9]{0,8}$')
       or coalesce(v_promotion->'offer'->>'sortOrder', '') !~ '^-?[0-9]{1,9}$' then
      raise exception 'product, variant, or offer identity is malformed'
        using errcode = '22023';
    end if;

    if v_value->>'kind' = 'price'
       and coalesce(v_value->>'amountMinor', '') ~ '^\d{1,12}$'
       and (v_value->>'amountMinor')::numeric <= 999999999999
       and coalesce(v_value->>'currency', '') ~ '^[A-Z]{3}$' then
      v_price := (v_value->>'amountMinor')::numeric / 100;
      v_currency := v_value->>'currency';
      v_prize_cost := null;
    elsif v_value->>'kind' = 'prize_tix'
       and coalesce(v_value->>'cost', '') ~ '^\d{1,9}$' then
      v_price := null;
      v_currency := null;
      v_prize_cost := (v_value->>'cost')::integer;
    else
      raise exception 'offer value is malformed' using errcode = '22023';
    end if;
    if v_catalog->>'family' = 'prize_wall' and v_value->>'kind' <> 'prize_tix' then
      raise exception 'Prize Wall offers require Prize Tix and cannot use a money price'
        using errcode = '22023';
    end if;
    v_display_label := nullif(btrim(v_value->>'displayLabel'), '');

    begin
      v_reviewed_at := (v_promotion->'reviewedObservation'->>'reviewedAt')::timestamptz;
      v_observed_at := (v_availability->>'observedAt')::timestamptz;
      v_event_day := (v_availability->>'eventDay')::date;
    exception when others then
      raise exception 'review or availability timestamp is invalid' using errcode = '22023';
    end;

    if v_promotion->'reviewedObservation'->>'reviewStatus' <> 'approved'
       or nullif(btrim(v_promotion->'reviewedObservation'->>'sourceName'), '') is null
       or nullif(btrim(v_promotion->'reviewedObservation'->>'sourceRawText'), '') is null
       or nullif(btrim(v_promotion->'reviewedObservation'->>'reviewedBy'), '') is null
       or v_promotion->'reviewedObservation'->'value' is distinct from v_value
       or v_media->>'reviewStatus' <> 'approved'
       or v_media->>'quality' not in ('evidence_only', 'thumbnail_only', 'midsize', 'high_quality')
       or v_media->>'matchStatus' not in ('exact_product', 'exact_variant')
       or v_media->>'mediaRole' not in ('product_crop', 'product_image')
       or v_media->>'source' not in ('evidence', 'card', 'thumb', 'external')
       or nullif(btrim(v_media->>'reviewedBy'), '') is null
       or v_media->>'reviewedBy' <> v_promotion->'reviewedObservation'->>'reviewedBy'
       or v_media->>'reviewedAt' <> v_promotion->'reviewedObservation'->>'reviewedAt'
       or v_availability->>'availability' not in ('available', 'limited', 'sold_out', 'restocking', 'unavailable', 'unknown')
       or (v_availability->>'quantitySeen' is not null and
           coalesce(v_availability->>'quantitySeen', '') !~ '^[0-9]{1,9}$')
       or (v_availability->>'availability' = 'sold_out'
           and v_availability->>'quantitySeen' is not null
           and (v_availability->>'quantitySeen')::integer <> 0) then
      raise exception 'reviewed evidence, media, or availability is malformed'
        using errcode = '22023';
    end if;

    insert into public.catalog_products (canonical_key, name, category)
    values (
      v_promotion->'product'->>'canonicalKey',
      btrim(v_promotion->'product'->>'name'),
      btrim(v_promotion->'product'->>'category')
    )
    on conflict (canonical_key) do update
      set name = excluded.name, category = excluded.category, updated_at = now()
    returning id into v_product_id;

    v_variant_id := null;
    if v_promotion->'variant' <> 'null'::jsonb then
      if jsonb_typeof(v_promotion->'variant') <> 'object'
         or coalesce(v_promotion->'variant'->>'variantKey', '') !~ '^[a-z0-9][a-z0-9_-]{0,119}$'
         or nullif(btrim(v_promotion->'variant'->>'label'), '') is null
         or length(btrim(v_promotion->'variant'->>'label')) > 160 then
        raise exception 'variant identity is malformed' using errcode = '22023';
      end if;
      if v_promotion->'variant' ? 'attributes' and (
        jsonb_typeof(v_promotion->'variant'->'attributes') <> 'object'
        or exists (select 1 from jsonb_each(v_promotion->'variant'->'attributes') attr where jsonb_typeof(attr.value) <> 'string' or btrim(attr.key) = '' or btrim(attr.value #>> '{}') = '')
      ) then
        raise exception 'variant attributes must be a map of nonempty option names and values' using errcode = '22023';
      end if;
      insert into public.catalog_variants (product_id, variant_key, label, sku, attributes)
      values (v_product_id, v_promotion->'variant'->>'variantKey', btrim(v_promotion->'variant'->>'label'), nullif(btrim(v_promotion->'variant'->>'sku'), ''), coalesce(v_promotion->'variant'->'attributes', '{}'::jsonb))
      on conflict (product_id, variant_key) do update
        set label = excluded.label,
            sku = case when v_promotion->'variant' ? 'sku' then excluded.sku else catalog_variants.sku end,
            attributes = case when v_promotion->'variant' ? 'attributes' then excluded.attributes else catalog_variants.attributes end, updated_at = now()
      returning id into v_variant_id;
    end if;

    if (v_media->>'matchStatus' = 'exact_variant' and v_variant_id is null)
       or (v_media->>'source' = 'external' and v_media->>'mediaRole' <> 'product_image')
       or (v_media->>'source' <> 'external' and v_media->>'mediaRole' <> 'product_crop') then
      raise exception 'presentation media binding is inconsistent with the product variant'
        using errcode = '22023';
    end if;

    insert into public.catalog_offers (
      catalog_id, product_id, variant_id, offer_key, display_label,
      price_amount, currency, prize_ticket_cost, purchase_limit, eligibility_note, pickup_note, sort_order, published
    ) values (
      v_catalog_id, v_product_id, v_variant_id,
      v_promotion->'offer'->>'offerKey', v_display_label,
      v_price, v_currency, v_prize_cost,
      nullif(v_promotion->'offer'->>'purchaseLimit', '')::integer,
      nullif(btrim(v_promotion->'offer'->>'eligibilityNote'), ''),
      nullif(btrim(v_promotion->'offer'->>'pickupNote'), ''),
      (v_promotion->'offer'->>'sortOrder')::integer,
      false
    )
    on conflict (catalog_id, offer_key) do update
      set product_id = excluded.product_id,
          variant_id = excluded.variant_id,
          display_label = excluded.display_label,
          price_amount = excluded.price_amount,
          currency = excluded.currency,
          prize_ticket_cost = excluded.prize_ticket_cost,
          purchase_limit = excluded.purchase_limit,
          eligibility_note = case when v_promotion->'offer' ? 'eligibilityNote' then excluded.eligibility_note else catalog_offers.eligibility_note end,
          pickup_note = case when v_promotion->'offer' ? 'pickupNote' then excluded.pickup_note else catalog_offers.pickup_note end,
          sort_order = excluded.sort_order,
          published = false,
          updated_at = now()
    returning id into v_offer_id;

    insert into public.catalog_offer_observations (
      catalog_id, offer_id, source_capture_id, source_name, source_variant_label,
      source_raw_text, price_amount, currency, prize_ticket_cost, purchase_limit,
      review_status, reviewed_by, reviewed_at
    ) values (
      v_catalog_id, v_offer_id, v_capture_id,
      btrim(v_promotion->'reviewedObservation'->>'sourceName'),
      case when v_variant_id is null then null else btrim(v_promotion->'variant'->>'label') end,
      btrim(v_promotion->'reviewedObservation'->>'sourceRawText'),
      v_price, v_currency, v_prize_cost,
      nullif(v_promotion->'offer'->>'purchaseLimit', '')::integer,
      'approved', v_actor, v_reviewed_at
    ) on conflict (source_capture_id, offer_id, reviewed_at) do nothing;

    if not exists (
      select 1 from public.catalog_offer_observations observation
      where observation.source_capture_id = v_capture_id
        and observation.offer_id = v_offer_id
        and observation.reviewed_at = v_reviewed_at
        and observation.review_status = 'approved'
        and observation.price_amount is not distinct from v_price
        and observation.currency is not distinct from v_currency
        and observation.prize_ticket_cost is not distinct from v_prize_cost
        and observation.purchase_limit is not distinct from nullif(v_promotion->'offer'->>'purchaseLimit', '')::integer
        and observation.source_raw_text = btrim(v_promotion->'reviewedObservation'->>'sourceRawText')
    ) then
      raise exception 'offer observation conflicts with prior append-only evidence'
        using errcode = '23505';
    end if;

    v_media_id := null;
    if v_media->>'source' = 'external' then
      if coalesce(v_media->>'externalUrl', '') !~ '^https://'
         or nullif(btrim(v_media->>'sourceProvider'), '') is null
         or coalesce(v_media->>'sourceUrl', '') !~ '^https://'
         or v_media->'path' <> 'null'::jsonb then
        raise exception 'external presentation media provenance is incomplete'
          using errcode = '22023';
      end if;

      select media.id into v_media_id
      from public.catalog_media media
      where media.source_capture_id = v_capture_id
        and media.offer_id = v_offer_id
        and media.media_role = 'product_image'
        and media.purpose = 'presentation'
        and media.review_status = 'approved'
        and media.reviewed_at = v_reviewed_at;

      if v_media_id is null then
        insert into public.catalog_media (
          source_capture_id, media_role, purpose, match_status,
          product_id, variant_id, offer_id, external_url, source_provider,
          source_url, sha256, mime_type, review_status, reviewed_by,
          reviewed_at, review_note, transform_metadata
        ) values (
          v_capture_id, 'product_image', 'presentation',
          (v_media->>'matchStatus')::public.catalog_media_match_status,
          v_product_id,
          case when v_media->>'matchStatus' = 'exact_variant' then v_variant_id else null end,
          v_offer_id, btrim(v_media->>'externalUrl'), btrim(v_media->>'sourceProvider'),
          btrim(v_media->>'sourceUrl'),
          case when coalesce(v_media->>'sha256', '') ~ '^[0-9a-f]{64}$' then v_media->>'sha256' else null end,
          null, 'approved', v_actor, v_reviewed_at,
          nullif(btrim(v_media->>'reviewNote'), ''),
          jsonb_build_object('quality', v_media->>'quality', 'source', 'external')
        ) returning id into v_media_id;
      end if;
      if not exists (
        select 1 from public.catalog_media media
        where media.id = v_media_id
          and media.source_capture_id = v_capture_id
          and media.offer_id = v_offer_id
          and media.product_id = v_product_id
          and media.variant_id is not distinct from
            case when v_media->>'matchStatus' = 'exact_variant' then v_variant_id else null end
          and media.match_status = (v_media->>'matchStatus')::public.catalog_media_match_status
          and media.external_url = btrim(v_media->>'externalUrl')
          and media.source_provider = btrim(v_media->>'sourceProvider')
          and media.source_url = btrim(v_media->>'sourceUrl')
          and media.reviewed_by = v_actor
      ) then
        raise exception 'presentation media conflicts with prior append-only provenance'
          using errcode = '23505';
      end if;
    else
      if coalesce(v_media->>'sha256', '') !~ '^[0-9a-f]{64}$'
         or nullif(btrim(v_media->>'path'), '') is null
         or v_media->'externalUrl' <> 'null'::jsonb
         or v_media->'sourceProvider' <> 'null'::jsonb
         or v_media->'sourceUrl' <> 'null'::jsonb then
        raise exception 'intake presentation media provenance is incomplete'
          using errcode = '22023';
      end if;
      v_media_ext := lower(substring(v_media->>'path' from '\.([a-zA-Z0-9]+)$'));
      if v_media_ext = 'jpg' then v_media_ext := 'jpeg'; end if;
      if v_media_ext not in ('png', 'jpeg', 'webp') then
        raise exception 'presentation media type is unsupported' using errcode = '22023';
      end if;
      v_media_mime := 'image/' || v_media_ext;

      select media.id into v_media_id
      from public.catalog_media media
      where media.source_capture_id = v_capture_id
        and media.offer_id = v_offer_id
        and media.media_role = 'product_crop'
        and media.purpose = 'presentation'
        and media.review_status = 'approved'
        and media.reviewed_at = v_reviewed_at;

      if v_media_id is null then
        insert into public.catalog_media (
          source_capture_id, parent_media_id, media_role, purpose, match_status,
          product_id, variant_id, offer_id, bucket_id, object_path,
          transform_metadata, transform_tool, transform_tool_version,
          mime_type, sha256, review_status, reviewed_by, reviewed_at, review_note
        ) values (
          v_capture_id, v_original_media_id, 'product_crop', 'presentation',
          (v_media->>'matchStatus')::public.catalog_media_match_status,
          v_product_id,
          case when v_media->>'matchStatus' = 'exact_variant' then v_variant_id else null end,
          v_offer_id, 'private-catalog-artifacts',
          v_capture_id::text || '/derivatives/' || (v_media->>'sha256') || '.' || v_media_ext,
          jsonb_build_object(
            'quality', v_media->>'quality',
            'source', v_media->>'source',
            'intake_path', v_media->>'path',
            'plan_schema_version', 1
          ),
          'catalog-photo-intake', '1', v_media_mime, v_media->>'sha256',
          'approved', v_actor, v_reviewed_at, nullif(btrim(v_media->>'reviewNote'), '')
        ) returning id into v_media_id;
      end if;
      if not exists (
        select 1 from public.catalog_media media
        where media.id = v_media_id
          and media.source_capture_id = v_capture_id
          and media.parent_media_id = v_original_media_id
          and media.offer_id = v_offer_id
          and media.product_id = v_product_id
          and media.variant_id is not distinct from
            case when v_media->>'matchStatus' = 'exact_variant' then v_variant_id else null end
          and media.match_status = (v_media->>'matchStatus')::public.catalog_media_match_status
          and media.bucket_id = 'private-catalog-artifacts'
          and media.object_path = v_capture_id::text || '/derivatives/' || (v_media->>'sha256') || '.' || v_media_ext
          and media.sha256 = v_media->>'sha256'
          and media.reviewed_by = v_actor
      ) then
        raise exception 'presentation media conflicts with prior append-only provenance'
          using errcode = '23505';
      end if;
    end if;

    if v_media_id is null then
      raise exception 'approved presentation media could not be established'
        using errcode = '23505';
    end if;

    insert into public.catalog_availability_observations (
      catalog_id, offer_id, availability, observed_at, event_day,
      source_capture_id, quantity_seen, note, observed_by
    ) values (
      v_catalog_id, v_offer_id,
      (v_availability->>'availability')::public.catalog_availability,
      v_observed_at, v_event_day, v_capture_id,
      nullif(v_availability->>'quantitySeen', '')::integer,
      nullif(btrim(v_availability->>'note'), ''), v_actor
    ) on conflict (source_capture_id, offer_id, observed_at)
      where offer_id is not null do nothing;

    if not exists (
      select 1 from public.catalog_availability_observations observation
      where observation.source_capture_id = v_capture_id
        and observation.offer_id = v_offer_id
        and observation.observed_at = v_observed_at
        and observation.availability = (v_availability->>'availability')::public.catalog_availability
        and observation.event_day = v_event_day
        and observation.quantity_seen is not distinct from nullif(v_availability->>'quantitySeen', '')::integer
    ) then
      raise exception 'availability conflicts with a prior append-only observation'
        using errcode = '23505';
    end if;

    update public.catalog_offers offer
    set published = true, updated_at = now()
    where offer.id = v_offer_id;
    if not found then
      raise exception 'offer could not be published after evidence and media approval'
        using errcode = '42501';
    end if;

    v_promoted_offer_ids := v_promoted_offer_ids || jsonb_build_array(jsonb_build_object(
      'source_item_key', v_promotion->>'sourceItemKey',
      'offer_id', v_offer_id
    ));
  end loop;

  if (
    select count(*) <> count(distinct promotion->>'sourceItemKey')
    from jsonb_array_elements(p_plan->'promotions') promotion
  ) then
    raise exception 'promotion source item keys must be unique' using errcode = '22023';
  end if;

  update public.catalogs catalog
  set published = true, updated_at = now()
  where catalog.id = v_catalog_id;

  v_readback := jsonb_build_object(
    'status', 'applied',
    'batch_key', v_batch_key,
    'catalog_id', v_catalog_id,
    'source_capture_id', v_capture_id,
    'promotions', v_promoted_offer_ids,
    'promoted_count', v_promotion_count,
    'retained_review_count', v_retained_count
  );

  insert into public.catalog_promotion_batches (
    batch_key, plan_sha256, plan, operator_id, catalog_id,
    source_capture_id, readback
  ) values (
    v_batch_key, v_plan_sha256, p_plan, v_actor, v_catalog_id,
    v_capture_id, v_readback
  );

  return v_readback;
end;
$$;

revoke all on function public.promote_catalog_batch(jsonb) from public, anon;
grant execute on function public.promote_catalog_batch(jsonb) to authenticated;
