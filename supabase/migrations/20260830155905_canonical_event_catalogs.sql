begin;

create extension if not exists pgcrypto with schema extensions;

create type public.catalog_family as enum (
  'show_store',
  'black_lotus',
  'prize_wall'
);

create type public.catalog_purpose as enum (
  'inventory',
  'reference'
);

create type public.catalog_availability as enum (
  'available',
  'limited',
  'sold_out',
  'restocking',
  'unavailable',
  'unknown'
);

create type public.catalog_capture_kind as enum (
  'official_pdf',
  'official_web',
  'board_photo',
  'manual_entry'
);

create type public.catalog_media_role as enum (
  'source_original',
  'source_page',
  'product_crop',
  'product_image',
  'thumbnail'
);

create type public.catalog_media_purpose as enum (
  'evidence',
  'presentation'
);

create type public.catalog_media_match_status as enum (
  'unreviewed',
  'exact_product',
  'exact_variant',
  'representative',
  'unmatched'
);

create type public.catalog_review_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- These helpers deliberately remain SECURITY INVOKER. They use the existing,
-- pre-authorized companion roster and never trust user-editable JWT metadata.
create function public.catalog_is_active_companion()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.companion_members member
    where member.active
      and member.user_id = (select auth.uid())
  );
$$;

create function public.catalog_is_operator()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.companion_members member
    where member.person_key = 'kavi'
      and member.active
      and member.user_id = (select auth.uid())
  );
$$;

revoke all on function public.catalog_is_active_companion() from public, anon;
revoke all on function public.catalog_is_operator() from public, anon;
grant execute on function public.catalog_is_active_companion() to authenticated;
grant execute on function public.catalog_is_operator() to authenticated;

create table public.catalogs (
  id uuid primary key default gen_random_uuid(),
  event_key text not null check (length(btrim(event_key)) between 1 and 120),
  family public.catalog_family not null,
  purpose public.catalog_purpose not null default 'inventory',
  title text not null check (length(btrim(title)) between 1 and 160),
  description text,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  source_url text check (source_url is null or source_url ~ '^https://'),
  opens_at timestamptz,
  closes_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_key, family),
  check (closes_at is null or opens_at is null or closes_at >= opens_at),
  constraint catalog_reference_never_published_check check (purpose = 'inventory' or not published)
);

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique check (canonical_key ~ '^[a-z0-9][a-z0-9_-]{0,119}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  category text not null check (length(btrim(category)) between 1 and 100),
  description text,
  brand text,
  exclusive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  variant_key text not null check (variant_key ~ '^[a-z0-9][a-z0-9_-]{0,119}$'),
  label text not null check (length(btrim(label)) between 1 and 160),
  sku text,
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, variant_key),
  unique (id, product_id)
);

create table public.catalog_offers (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete restrict,
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  variant_id uuid,
  offer_key text not null check (offer_key ~ '^[a-z0-9][a-z0-9_-]{0,119}$'),
  display_label text,
  price_amount numeric(12,2) check (price_amount is null or price_amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  prize_ticket_cost integer check (prize_ticket_cost is null or prize_ticket_cost >= 0),
  purchase_limit integer check (purchase_limit is null or purchase_limit > 0),
  eligibility_note text,
  pickup_note text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_id, offer_key),
  unique (id, catalog_id),
  unique (id, product_id),
  constraint catalog_offers_variant_product_fk
    foreign key (variant_id, product_id)
    references public.catalog_variants(id, product_id)
    on delete restrict,
  check (price_amount is null or currency is not null),
  constraint catalog_offer_single_value_kind_check check (num_nonnulls(price_amount, prize_ticket_cost) <= 1)
);

create function public.catalog_enforce_offer_value_kind()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_family public.catalog_family;
begin
  select catalog.family into v_family
  from public.catalogs catalog
  where catalog.id = new.catalog_id;

  if v_family is null then
    raise exception 'catalog offer requires an existing catalog' using errcode = '23503';
  end if;
  if v_family = 'prize_wall' and (new.price_amount is not null or new.currency is not null) then
    raise exception 'Prize Wall offers cannot carry a money price' using errcode = '23514';
  end if;
  if v_family = 'prize_wall' and new.published and new.prize_ticket_cost is null then
    raise exception 'published Prize Wall offers require a Prize Tix cost' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.catalog_enforce_offer_value_kind() from public, anon, authenticated;

create trigger catalog_offer_value_kind_guard
before insert or update of catalog_id, price_amount, currency, prize_ticket_cost, published
on public.catalog_offers
for each row execute function public.catalog_enforce_offer_value_kind();

create table public.catalog_source_captures (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete restrict,
  capture_kind public.catalog_capture_kind not null,
  source_label text not null check (length(btrim(source_label)) between 1 and 200),
  source_url text check (source_url is null or source_url ~ '^https://'),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  captured_by uuid not null references auth.users(id) on delete restrict,
  captured_at timestamptz not null,
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  notes text,
  unique (catalog_id, source_sha256),
  unique (id, catalog_id)
);

create table public.catalog_offer_observations (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete restrict,
  offer_id uuid not null,
  source_capture_id uuid not null,
  source_name text not null check (length(btrim(source_name)) between 1 and 240),
  source_variant_label text,
  source_raw_text text not null check (length(btrim(source_raw_text)) > 0),
  price_amount numeric(12,2) check (price_amount is null or price_amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  prize_ticket_cost integer check (prize_ticket_cost is null or prize_ticket_cost >= 0),
  purchase_limit integer check (purchase_limit is null or purchase_limit > 0),
  extraction_confidence numeric(5,4) check (extraction_confidence is null or extraction_confidence between 0 and 1),
  review_status public.catalog_review_status not null check (review_status in ('approved', 'rejected')),
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint catalog_offer_observations_offer_catalog_fk
    foreign key (offer_id, catalog_id)
    references public.catalog_offers(id, catalog_id)
    on delete restrict,
  constraint catalog_offer_observations_capture_catalog_fk
    foreign key (source_capture_id, catalog_id)
    references public.catalog_source_captures(id, catalog_id)
    on delete restrict,
  check (price_amount is null or currency is not null),
  unique (source_capture_id, offer_id, reviewed_at)
);

create table public.catalog_media (
  id uuid primary key default gen_random_uuid(),
  source_capture_id uuid not null references public.catalog_source_captures(id) on delete restrict,
  parent_media_id uuid,
  media_role public.catalog_media_role not null,
  purpose public.catalog_media_purpose not null,
  match_status public.catalog_media_match_status not null default 'unreviewed',
  product_id uuid references public.catalog_products(id) on delete restrict,
  variant_id uuid,
  offer_id uuid references public.catalog_offers(id) on delete restrict,
  bucket_id text,
  object_path text,
  external_url text,
  source_provider text,
  source_url text check (source_url is null or source_url ~ '^https://'),
  transform_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(transform_metadata) = 'object'),
  transform_tool text,
  transform_tool_version text,
  mime_type text check (mime_type is null or mime_type ~ '^(image/(png|jpeg|webp)|application/pdf)$'),
  byte_size bigint check (byte_size is null or byte_size > 0),
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  review_status public.catalog_review_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  unique (id, source_capture_id),
  unique (bucket_id, object_path),
  constraint catalog_media_parent_same_capture_fk
    foreign key (parent_media_id, source_capture_id)
    references public.catalog_media(id, source_capture_id)
    on delete restrict,
  constraint catalog_media_variant_product_fk
    foreign key (variant_id, product_id)
    references public.catalog_variants(id, product_id)
    on delete restrict,
  constraint catalog_media_location_check check (
    (
      bucket_id = 'private-catalog-artifacts'
      and object_path is not null
      and external_url is null
      and sha256 is not null
      and mime_type is not null
      and object_path like source_capture_id::text ||
        case when media_role = 'source_original' then '/originals/' else '/derivatives/' end || '%'
      and regexp_replace(object_path, '^.*/', '') ~ ('^' || sha256 || '\.[a-z0-9]+$')
    )
    or (
      bucket_id is null
      and object_path is null
      and external_url ~ '^https://'
      and media_role = 'product_image'
      and length(btrim(source_provider)) > 0
      and source_url is not null
    )
  ),
  constraint catalog_media_derivative_lineage_check check (
    (media_role in ('source_original', 'product_image') and parent_media_id is null)
    or (
      media_role in ('source_page', 'product_crop', 'thumbnail')
      and parent_media_id is not null
      and transform_metadata <> '{}'::jsonb
      and length(btrim(transform_tool)) > 0
      and length(btrim(transform_tool_version)) > 0
    )
  ),
  constraint catalog_media_match_check check (
    (match_status = 'exact_variant' and product_id is not null and variant_id is not null)
    or (match_status = 'exact_product' and product_id is not null and variant_id is null)
    or match_status in ('unreviewed', 'representative', 'unmatched')
  ),
  constraint catalog_media_review_check check (
    (review_status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (review_status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  ),
  constraint catalog_presentation_media_gate_check check (
    purpose <> 'presentation'
    or review_status <> 'approved'
    or match_status in ('exact_product', 'exact_variant')
  )
);

create table public.catalog_availability_observations (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete restrict,
  product_id uuid references public.catalog_products(id) on delete restrict,
  offer_id uuid,
  availability public.catalog_availability not null,
  observed_at timestamptz not null,
  event_day date not null,
  source_capture_id uuid not null,
  quantity_seen integer check (quantity_seen is null or quantity_seen >= 0),
  note text,
  observed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint catalog_availability_target_xor check ((product_id is null) <> (offer_id is null)),
  constraint catalog_sold_out_quantity_check check (availability <> 'sold_out' or quantity_seen is null or quantity_seen = 0),
  constraint catalog_availability_offer_catalog_fk
    foreign key (offer_id, catalog_id)
    references public.catalog_offers(id, catalog_id)
    on delete restrict,
  constraint catalog_availability_capture_catalog_fk
    foreign key (source_capture_id, catalog_id)
    references public.catalog_source_captures(id, catalog_id)
    on delete restrict
);

create table public.catalog_interests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.catalog_offers(id) on delete cascade,
  interested boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, offer_id)
);

-- One immutable receipt per operator-approved promotion plan. Retaining the
-- canonical JSON preserves rejected review history and makes same-key replay
-- an exact read rather than a second write to append-only evidence tables.
create table public.catalog_promotion_batches (
  batch_key text primary key check (batch_key ~ '^[a-z0-9][a-z0-9_-]{0,119}$'),
  plan_sha256 text not null check (plan_sha256 ~ '^[0-9a-f]{64}$'),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  operator_id uuid not null references auth.users(id) on delete restrict,
  catalog_id uuid not null references public.catalogs(id) on delete restrict,
  source_capture_id uuid not null references public.catalog_source_captures(id) on delete restrict,
  readback jsonb not null check (jsonb_typeof(readback) = 'object'),
  applied_at timestamptz not null default now()
);

create index catalog_offers_catalog_sort_idx on public.catalog_offers(catalog_id, published, sort_order);
create index catalog_offers_product_idx on public.catalog_offers(product_id);
create index catalog_variants_product_idx on public.catalog_variants(product_id);
create index catalog_source_captures_catalog_time_idx on public.catalog_source_captures(catalog_id, captured_at desc);
create index catalog_offer_observations_offer_review_idx on public.catalog_offer_observations(offer_id, reviewed_at desc);
create index catalog_media_capture_idx on public.catalog_media(source_capture_id, media_role);
create index catalog_media_product_idx on public.catalog_media(product_id) where product_id is not null;
create index catalog_availability_offer_time_idx on public.catalog_availability_observations(offer_id, observed_at desc) where offer_id is not null;
create index catalog_availability_product_time_idx on public.catalog_availability_observations(product_id, observed_at desc) where product_id is not null;
create unique index catalog_availability_offer_capture_time_uidx
  on public.catalog_availability_observations(source_capture_id, offer_id, observed_at)
  where offer_id is not null;
create unique index catalog_availability_product_capture_time_uidx
  on public.catalog_availability_observations(source_capture_id, product_id, observed_at)
  where product_id is not null;
create index catalog_interests_owner_idx on public.catalog_interests(owner_id, interested);
create unique index catalog_media_presentation_review_uidx
  on public.catalog_media(source_capture_id, offer_id, media_role, reviewed_at)
  where purpose = 'presentation' and review_status = 'approved' and offer_id is not null;

alter table public.catalogs enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_variants enable row level security;
alter table public.catalog_offers enable row level security;
alter table public.catalog_source_captures enable row level security;
alter table public.catalog_offer_observations enable row level security;
alter table public.catalog_media enable row level security;
alter table public.catalog_availability_observations enable row level security;
alter table public.catalog_interests enable row level security;
alter table public.catalog_promotion_batches enable row level security;

alter table public.catalogs force row level security;
alter table public.catalog_products force row level security;
alter table public.catalog_variants force row level security;
alter table public.catalog_offers force row level security;
alter table public.catalog_source_captures force row level security;
alter table public.catalog_offer_observations force row level security;
alter table public.catalog_media force row level security;
alter table public.catalog_availability_observations force row level security;
alter table public.catalog_interests force row level security;
alter table public.catalog_promotion_batches force row level security;

revoke all on public.catalogs from public, anon, authenticated;
revoke all on public.catalog_products from public, anon, authenticated;
revoke all on public.catalog_variants from public, anon, authenticated;
revoke all on public.catalog_offers from public, anon, authenticated;
revoke all on public.catalog_source_captures from public, anon, authenticated;
revoke all on public.catalog_offer_observations from public, anon, authenticated;
revoke all on public.catalog_media from public, anon, authenticated;
revoke all on public.catalog_availability_observations from public, anon, authenticated;
revoke all on public.catalog_interests from public, anon, authenticated;
revoke all on public.catalog_promotion_batches from public, anon, authenticated;

grant select, insert, update on public.catalogs to authenticated;
grant select, insert, update on public.catalog_products to authenticated;
grant select, insert, update on public.catalog_variants to authenticated;
grant select, insert, update on public.catalog_offers to authenticated;
grant select, insert on public.catalog_source_captures to authenticated;
grant select, insert on public.catalog_offer_observations to authenticated;
grant select, insert on public.catalog_media to authenticated;
grant update (review_status, reviewed_by, reviewed_at, review_note) on public.catalog_media to authenticated;
grant select, insert on public.catalog_availability_observations to authenticated;
grant select, insert, update, delete on public.catalog_interests to authenticated;
grant select, insert on public.catalog_promotion_batches to authenticated;

-- Canonical catalog rows are shared with active companions and writable only
-- by the roster-bound Kavi operator identity.
create policy active_companions_select_catalogs on public.catalogs
  for select to authenticated using ((select public.catalog_is_active_companion()));
create policy kavi_insert_catalogs on public.catalogs
  for insert to authenticated with check ((select public.catalog_is_operator()));
create policy kavi_update_catalogs on public.catalogs
  for update to authenticated
  using ((select public.catalog_is_operator()))
  with check ((select public.catalog_is_operator()));

create policy active_companions_select_catalog_products on public.catalog_products
  for select to authenticated using ((select public.catalog_is_active_companion()));
create policy kavi_insert_catalog_products on public.catalog_products
  for insert to authenticated with check ((select public.catalog_is_operator()));
create policy kavi_update_catalog_products on public.catalog_products
  for update to authenticated
  using ((select public.catalog_is_operator()))
  with check ((select public.catalog_is_operator()));

create policy active_companions_select_catalog_variants on public.catalog_variants
  for select to authenticated using ((select public.catalog_is_active_companion()));
create policy kavi_insert_catalog_variants on public.catalog_variants
  for insert to authenticated with check ((select public.catalog_is_operator()));
create policy kavi_update_catalog_variants on public.catalog_variants
  for update to authenticated
  using ((select public.catalog_is_operator()))
  with check ((select public.catalog_is_operator()));

create policy active_companions_select_catalog_offers on public.catalog_offers
  for select to authenticated using ((select public.catalog_is_active_companion()));
create policy kavi_insert_catalog_offers on public.catalog_offers
  for insert to authenticated
  with check (
    (select public.catalog_is_operator())
    and (
      not published
      or exists (
        select 1 from public.catalog_offer_observations observation
        where observation.offer_id = catalog_offers.id
          and observation.review_status = 'approved'
          and observation.price_amount is not distinct from catalog_offers.price_amount
          and observation.currency is not distinct from catalog_offers.currency
          and observation.prize_ticket_cost is not distinct from catalog_offers.prize_ticket_cost
          and observation.purchase_limit is not distinct from catalog_offers.purchase_limit
      )
    )
    and (
      not published
      or exists (
        select 1 from public.catalog_media media
        where media.purpose = 'presentation'
          and media.review_status = 'approved'
          and media.match_status in ('exact_product', 'exact_variant')
          and (
            media.offer_id = catalog_offers.id
            or (catalog_offers.variant_id is not null and media.variant_id = catalog_offers.variant_id)
            or (media.product_id = catalog_offers.product_id and media.variant_id is null)
          )
      )
    )
  );
create policy kavi_update_catalog_offers on public.catalog_offers
  for update to authenticated
  using ((select public.catalog_is_operator()))
  with check (
    (select public.catalog_is_operator())
    and (
      not published
      or exists (
        select 1 from public.catalog_offer_observations observation
        where observation.offer_id = catalog_offers.id
          and observation.review_status = 'approved'
          and observation.price_amount is not distinct from catalog_offers.price_amount
          and observation.currency is not distinct from catalog_offers.currency
          and observation.prize_ticket_cost is not distinct from catalog_offers.prize_ticket_cost
          and observation.purchase_limit is not distinct from catalog_offers.purchase_limit
      )
    )
    and (
      not published
      or exists (
        select 1 from public.catalog_media media
        where media.purpose = 'presentation'
          and media.review_status = 'approved'
          and media.match_status in ('exact_product', 'exact_variant')
          and (
            media.offer_id = catalog_offers.id
            or (catalog_offers.variant_id is not null and media.variant_id = catalog_offers.variant_id)
            or (media.product_id = catalog_offers.product_id and media.variant_id is null)
          )
      )
    )
  );

-- Evidence rows are append-only to authenticated clients. Corrections append
-- a new capture/observation rather than rewriting the source record.
create policy active_companions_select_catalog_source_captures on public.catalog_source_captures
  for select to authenticated using ((select public.catalog_is_active_companion()));
create policy kavi_insert_catalog_source_captures on public.catalog_source_captures
  for insert to authenticated
  with check ((select public.catalog_is_operator()) and captured_by = (select auth.uid()));

create policy active_companions_select_catalog_offer_observations on public.catalog_offer_observations
  for select to authenticated using ((select public.catalog_is_active_companion()));
create policy kavi_insert_catalog_offer_observations on public.catalog_offer_observations
  for insert to authenticated
  with check ((select public.catalog_is_operator()) and reviewed_by = (select auth.uid()));

create policy active_companions_select_catalog_media on public.catalog_media
  for select to authenticated using ((select public.catalog_is_active_companion()));
create policy kavi_insert_catalog_media on public.catalog_media
  for insert to authenticated with check ((select public.catalog_is_operator()));
create policy kavi_review_catalog_media on public.catalog_media
  for update to authenticated
  using ((select public.catalog_is_operator()))
  with check (
    (select public.catalog_is_operator())
    and (
      (review_status = 'pending' and reviewed_by is null and reviewed_at is null)
      or (review_status in ('approved', 'rejected') and reviewed_by = (select auth.uid()) and reviewed_at is not null)
    )
  );

create policy active_companions_select_catalog_availability on public.catalog_availability_observations
  for select to authenticated using ((select public.catalog_is_active_companion()));
create policy kavi_insert_catalog_availability on public.catalog_availability_observations
  for insert to authenticated
  with check ((select public.catalog_is_operator()) and observed_by = (select auth.uid()));

create policy owners_select_catalog_interests on public.catalog_interests
  for select to authenticated
  using ((select public.catalog_is_active_companion()));
create policy owners_insert_catalog_interests on public.catalog_interests
  for insert to authenticated
  with check ((select public.catalog_is_active_companion()) and owner_id = (select auth.uid()));
create policy owners_update_catalog_interests on public.catalog_interests
  for update to authenticated
  using ((select public.catalog_is_active_companion()) and owner_id = (select auth.uid()))
  with check ((select public.catalog_is_active_companion()) and owner_id = (select auth.uid()));
create policy owners_delete_catalog_interests on public.catalog_interests
  for delete to authenticated
  using ((select public.catalog_is_active_companion()) and owner_id = (select auth.uid()));

create policy kavi_select_catalog_promotion_batches on public.catalog_promotion_batches
  for select to authenticated
  using ((select public.catalog_is_operator()) and operator_id = (select auth.uid()));
create policy kavi_insert_catalog_promotion_batches on public.catalog_promotion_batches
  for insert to authenticated
  with check ((select public.catalog_is_operator()) and operator_id = (select auth.uid()));

-- Atomically promotes the exact schema-version 1 JSON emitted by
-- src/lib/catalogImport.ts. The function remains SECURITY INVOKER: the
-- roster-bound Kavi policies above are the authorization boundary.
create function public.promote_catalog_batch(p_plan jsonb)
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
  if v_original_ext not in ('png', 'jpeg', 'webp', 'pdf')
     or lower(v_source->>'originalPath') !~
       (coalesce(v_source->>'sourceSha256', '') || '\.(png|jpe?g|webp|pdf)$') then
    raise exception 'source original path must be content-addressed and use a supported type'
      using errcode = '22023';
  end if;
  v_original_mime := case when v_original_ext = 'pdf' then 'application/pdf' else 'image/' || v_original_ext end;

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
      insert into public.catalog_variants (product_id, variant_key, label)
      values (v_product_id, v_promotion->'variant'->>'variantKey', btrim(v_promotion->'variant'->>'label'))
      on conflict (product_id, variant_key) do update
        set label = excluded.label, updated_at = now()
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
      price_amount, currency, prize_ticket_cost, purchase_limit, sort_order, published
    ) values (
      v_catalog_id, v_product_id, v_variant_id,
      v_promotion->'offer'->>'offerKey', v_display_label,
      v_price, v_currency, v_prize_cost,
      nullif(v_promotion->'offer'->>'purchaseLimit', '')::integer,
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

create view public.catalog_current_offers
with (security_invoker = true, security_barrier = true)
as
select
  offer.id as offer_id,
  catalog.id as catalog_id,
  catalog.event_key,
  catalog.family,
  catalog.title as catalog_title,
  product.id as product_id,
  product.canonical_key,
  product.name as product_name,
  product.category,
  product.description,
  product.exclusive,
  variant.id as variant_id,
  variant.label as variant_label,
  variant.sku,
  variant.attributes,
  offer.display_label,
  offer.price_amount,
  coalesce(offer.currency, catalog.currency) as currency,
  offer.prize_ticket_cost,
  offer.purchase_limit,
  offer.eligibility_note,
  offer.pickup_note,
  extraction.source_name as observed_source_name,
  extraction.source_variant_label as observed_source_variant_label,
  extraction.source_raw_text as observed_source_raw_text,
  extraction.source_capture_id as offer_source_capture_id,
  extraction.reviewed_at as offer_reviewed_at,
  coalesce(latest.availability, 'unknown'::public.catalog_availability) as availability,
  latest.observed_at as availability_observed_at,
  latest.event_day as availability_event_day,
  latest.source_capture_id as availability_source_capture_id,
  presentation_media.id as presentation_media_id,
  presentation_media.bucket_id as presentation_bucket_id,
  presentation_media.object_path as presentation_object_path,
  presentation_media.external_url as presentation_external_url,
  presentation_media.source_provider as presentation_source_provider,
  presentation_media.source_url as presentation_source_url,
  presentation_media.match_status as presentation_match_status,
  offer.sort_order
from public.catalog_offers offer
join public.catalogs catalog on catalog.id = offer.catalog_id
join public.catalog_products product on product.id = offer.product_id
left join public.catalog_variants variant on variant.id = offer.variant_id
join lateral (
  select observation.*
  from public.catalog_offer_observations observation
  where observation.offer_id = offer.id
    and observation.review_status = 'approved'
    and observation.price_amount is not distinct from offer.price_amount
    and observation.currency is not distinct from offer.currency
    and observation.prize_ticket_cost is not distinct from offer.prize_ticket_cost
    and observation.purchase_limit is not distinct from offer.purchase_limit
  order by observation.reviewed_at desc, observation.created_at desc, observation.id desc
  limit 1
) extraction on true
left join lateral (
  select observation.availability, observation.observed_at, observation.event_day, observation.source_capture_id
  from public.catalog_availability_observations observation
  where observation.catalog_id = offer.catalog_id
    and (
      observation.offer_id = offer.id
      or (observation.offer_id is null and observation.product_id = offer.product_id)
    )
  order by observation.observed_at desc, observation.created_at desc, observation.id desc
  limit 1
) latest on true
left join lateral (
  select media.*
  from public.catalog_media media
  where media.purpose = 'presentation'
    and media.review_status = 'approved'
    and (
      media.offer_id = offer.id
      or (offer.variant_id is not null and media.variant_id = offer.variant_id)
      or (media.product_id = offer.product_id and media.variant_id is null)
    )
  order by
    case
      when media.offer_id = offer.id then 1
      when offer.variant_id is not null and media.variant_id = offer.variant_id then 2
      else 3
    end,
    media.created_at desc,
    media.id desc
  limit 1
) presentation_media on true
where catalog.purpose = 'inventory'
  and catalog.published
  and offer.published;

revoke all on public.catalog_current_offers from public, anon, authenticated;
grant select on public.catalog_current_offers to authenticated;

-- Storage objects are created through the Storage API. The bucket must be
-- provisioned as private with id `private-catalog-artifacts`. Only INSERT is
-- allowed for the operator: no UPDATE/DELETE policy means no upsert/overwrite.
create policy "active_companions_read_catalog_artifacts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'private-catalog-artifacts'
    and (select public.catalog_is_active_companion())
  );

create policy "kavi_insert_immutable_catalog_artifacts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'private-catalog-artifacts'
    and (select public.catalog_is_operator())
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(originals|derivatives)/[0-9a-f]{64}\.[a-z0-9]+$'
  );

comment on table public.catalogs is
  'Source-backed MagicCon catalog families: Show Store, Black Lotus Store, and Prize Wall.';
comment on table public.catalog_source_captures is
  'Immutable source-capture ledger. Corrections append new captures rather than altering evidence.';
comment on table public.catalog_offer_observations is
  'Append-only reviewed extraction evidence for source name, raw text, price, tickets, and purchase limit. Published offers require a matching approved record.';
comment on table public.catalog_media is
  'Immutable media provenance and linkage. Only review fields can change; evidence photos remain distinct from approved exact-match presentation images.';
comment on table public.catalog_availability_observations is
  'Append-only product/offer availability observations with exact observation time and event-local day.';
comment on table public.catalog_interests is
  'Per-user shopping-list interest state, readable across active companions and writable only by its owner.';
comment on table public.catalog_promotion_batches is
  'Immutable Kavi-authorized promotion receipts. The retained plan makes replay exact and preserves rejected review history.';
comment on column public.catalogs.purpose is
  'Inventory catalogs may publish reviewed offers. Reference catalogs retain historical products/media for future matching and are structurally forbidden from publication.';
comment on function public.promote_catalog_batch(jsonb) is
  'Atomically applies one schema-version 1 reviewed catalog plan and returns an exact idempotent readback.';
comment on view public.catalog_current_offers is
  'Security-invoker companion read model for published offers and their latest product/offer observation.';

commit;
