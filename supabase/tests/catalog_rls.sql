begin;
select plan(71);

select has_table('public', 'catalogs', 'catalogs exists');
select has_table('public', 'catalog_products', 'catalog_products exists');
select has_table('public', 'catalog_variants', 'catalog_variants exists');
select has_table('public', 'catalog_offers', 'catalog_offers exists');
select has_table('public', 'catalog_source_captures', 'catalog_source_captures exists');
select has_table('public', 'catalog_offer_observations', 'catalog_offer_observations exists');
select has_table('public', 'catalog_media', 'catalog_media exists');
select has_table('public', 'catalog_availability_observations', 'availability observations exist');
select has_table('public', 'catalog_interests', 'catalog interests exists');
select has_table('public', 'catalog_promotion_batches', 'promotion receipt ledger exists');
select has_view('public', 'catalog_current_offers', 'current-offer read view exists');

select ok((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.catalog_current_offers'::regclass), 'current-offer view is security invoker');
select enum_has_labels('public', 'catalog_family', array['show_store','black_lotus','prize_wall'], 'catalog family is intentionally closed');
select enum_has_labels('public', 'catalog_purpose', array['inventory','reference'], 'catalog purpose separates current inventory from retained reference material');
select enum_has_labels('public', 'catalog_availability', array['available','limited','sold_out','restocking','unavailable','unknown'], 'availability includes sold-out and uncertainty states');

select row_security_active('public.catalogs'), 'catalog RLS is active');
select row_security_active('public.catalog_products'), 'product RLS is active');
select row_security_active('public.catalog_variants'), 'variant RLS is active');
select row_security_active('public.catalog_offers'), 'offer RLS is active');
select row_security_active('public.catalog_source_captures'), 'capture RLS is active');
select row_security_active('public.catalog_offer_observations'), 'offer observation RLS is active');
select row_security_active('public.catalog_media'), 'media RLS is active');
select row_security_active('public.catalog_availability_observations'), 'availability RLS is active');
select row_security_active('public.catalog_interests'), 'interest RLS is active');

select ok((select bool_and(relforcerowsecurity) from pg_class where oid in (
  'public.catalogs'::regclass,
  'public.catalog_products'::regclass,
  'public.catalog_variants'::regclass,
  'public.catalog_offers'::regclass,
  'public.catalog_source_captures'::regclass,
  'public.catalog_offer_observations'::regclass,
  'public.catalog_media'::regclass,
  'public.catalog_availability_observations'::regclass,
  'public.catalog_interests'::regclass
)), 'RLS is forced on every catalog table');

select table_privs_are('public', 'catalogs', 'anon', array[]::text[], 'anonymous users cannot access catalogs');
select table_privs_are('public', 'catalogs', 'authenticated', array['INSERT','SELECT','UPDATE'], 'catalog writes omit delete');
select table_privs_are('public', 'catalog_source_captures', 'authenticated', array['INSERT','SELECT'], 'captures are append-only');
select table_privs_are('public', 'catalog_offer_observations', 'authenticated', array['INSERT','SELECT'], 'reviewed offer evidence is append-only');
select table_privs_are('public', 'catalog_media', 'authenticated', array['INSERT','SELECT'], 'media manifests are append-only');
select column_privs_are('public', 'catalog_media', 'review_status', 'authenticated', array['INSERT','SELECT','UPDATE'], 'only media review state is mutable');
select column_privs_are('public', 'catalog_media', 'object_path', 'authenticated', array['INSERT','SELECT'], 'media object path cannot be updated');
select policies_are('public', 'catalog_media', array['active_companions_select_catalog_media','kavi_insert_catalog_media','kavi_review_catalog_media']);
select like((select pg_get_constraintdef(oid) from pg_constraint where conname='catalog_presentation_media_gate_check'), '%exact_product%', 'approved presentation media requires an exact match');
select col_not_null('public', 'catalog_media', 'transform_metadata', 'derivative transform metadata is durable');
select table_privs_are('public', 'catalog_availability_observations', 'authenticated', array['INSERT','SELECT'], 'observations are append-only');
select table_privs_are('public', 'catalog_interests', 'authenticated', array['DELETE','INSERT','SELECT','UPDATE'], 'owners can manage their interests');
select like((select qual from pg_policies where schemaname='public' and tablename='catalog_interests' and policyname='owners_select_catalog_interests'), '%catalog_is_active_companion%', 'active companions share interest reads');
select ok((select count(*) from pg_indexes where schemaname='public' and tablename='catalog_availability_observations' and indexname in ('catalog_availability_offer_capture_time_uidx','catalog_availability_product_capture_time_uidx')) = 2, 'partial unique indexes deduplicate nullable-XOR observation targets');

select ok(exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='kavi_insert_immutable_catalog_artifacts' and cmd='INSERT' and roles='{authenticated}'), 'catalog artifact upload is operator insert-only');
select is((select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like '%catalog_artifact%' and cmd in ('UPDATE','DELETE')), 0::bigint, 'catalog artifact overwrite/delete policies do not exist');
select unlike(pg_get_functiondef('public.catalog_is_operator()'::regprocedure), '%user_metadata%', 'operator authorization never trusts user metadata');

select ok(to_regprocedure('public.promote_catalog_batch(jsonb)') is not null, 'catalog promotion RPC exists');
select is(
  (select prorettype::regtype::text from pg_proc where oid = 'public.promote_catalog_batch(jsonb)'::regprocedure),
  'jsonb',
  'catalog promotion RPC returns jsonb'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.promote_catalog_batch(jsonb)'::regprocedure),
  'catalog promotion RPC is security invoker'
);
select ok(
  'search_path=""' = any(coalesce((select proconfig from pg_proc where oid = 'public.promote_catalog_batch(jsonb)'::regprocedure), array[]::text[])),
  'catalog promotion RPC pins an empty search path'
);
select ok(
  not exists (
    select 1
    from pg_proc function_row,
         aclexplode(coalesce(function_row.proacl, acldefault('f', function_row.proowner))) privilege
    where function_row.oid = 'public.promote_catalog_batch(jsonb)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute catalog promotion'
);
select ok(not has_function_privilege('anon', 'public.promote_catalog_batch(jsonb)', 'EXECUTE'), 'anonymous users cannot execute catalog promotion');
select ok(has_function_privilege('authenticated', 'public.promote_catalog_batch(jsonb)', 'EXECUTE'), 'authenticated role receives explicit catalog promotion execute');
select unlike(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%user_metadata%', 'promotion authorization never trusts user metadata');
select like(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%return v_existing.readback%', 'same-key replay returns the stored exact readback');
select like(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%plan_sha256 <> v_plan_sha256%', 'same batch key with different JSON fails closed');
select like(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%pending catalog reviews cannot be promoted%', 'pending review payloads fail closed');
select like(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%fixture catalog plans cannot be promoted%', 'fixture payloads fail closed');
select like(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%reference catalogs cannot be promoted as current inventory%', 'reference catalog payloads fail closed');
select like(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%''promotions'', v_promoted_offer_ids%', 'readback uses the client promotions array contract');
select like(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%''promoted_count'', v_promotion_count%', 'readback includes the client promoted count');
select like(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%''retained_review_count'', v_retained_count%', 'readback includes the client retained-review count');
select unlike(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%promoted_offer_ids''%', 'obsolete promoted-offer readback key is absent');
select unlike(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%''counts'', jsonb_build_object%', 'obsolete nested count object is absent');
select row_security_active('public.catalog_promotion_batches'), 'promotion receipt RLS is active';
select ok((select relforcerowsecurity from pg_class where oid = 'public.catalog_promotion_batches'::regclass), 'promotion receipt RLS is forced');
select table_privs_are('public', 'catalog_promotion_batches', 'anon', array[]::text[], 'anonymous users cannot access promotion receipts');
select table_privs_are('public', 'catalog_promotion_batches', 'authenticated', array['INSERT','SELECT'], 'promotion receipts are append-only to the operator RPC');
select like((select with_check from pg_policies where schemaname='public' and tablename='catalog_offers' and policyname='kavi_insert_catalog_offers'), '%catalog_media%', 'published offer inserts require approved presentation media');
select like((select with_check from pg_policies where schemaname='public' and tablename='catalog_offers' and policyname='kavi_update_catalog_offers'), '%catalog_media%', 'published offer updates require approved presentation media');
select like((select pg_get_constraintdef(oid) from pg_constraint where conname='catalog_reference_never_published_check'), '%purpose = ''inventory''%', 'reference catalogs are structurally forbidden from publication');
select like(pg_get_viewdef('public.catalog_current_offers'::regclass, true), '%catalog.purpose = ''inventory''%', 'current-offer view excludes retained reference catalogs');
select like(pg_get_functiondef('public.promote_catalog_batch(jsonb)'::regprocedure), '%purpose, title, description, published%', 'promotion writes the explicit catalog purpose column');
select has_trigger('public', 'catalog_offers', 'catalog_offer_value_kind_guard', 'offer value-kind trigger exists');
select like(pg_get_functiondef('public.catalog_enforce_offer_value_kind()'::regprocedure), '%Prize Wall offers cannot carry a money price%', 'database rejects money-priced Prize Wall offers');

select * from finish();
rollback;
