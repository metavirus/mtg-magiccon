-- Isolated local database only; auth.uid() must return an active operator fixture.
begin;
do $test$
declare
  plan jsonb := $plan${"schemaVersion": 1, "batchKey": "json-rpc", "catalog": {"catalogKey": "json-rpc", "eventKey": "json-rpc", "family": "show_store", "title": "Guard RPC", "section": null, "purpose": "inventory"}, "sourceCapture": {"identityKey": "json-rpc:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "captureKind": "official_web", "intakeSourceKind": "official_web", "sourceLabel": "Guard source", "sourceUrl": "https://example.com/source", "sourceSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "originalFilename": "source.json", "originalPath": "originals/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json", "observedOn": "2026-10-31", "rightsNote": null}, "retainedReviews": [{"sourceItemKey": "shirt", "decision": "approve", "reason": null, "reviewedBy": "operator", "reviewedAt": "2026-10-31T12:00:00Z"}], "promotions": [{"sourceItemKey": "shirt", "product": {"canonicalKey": "guard-shirt", "name": "Shirt", "category": "Apparel"}, "variant": {"variantKey": "large", "label": "Large", "sku": "SKU-L", "attributes": {"Size": "Large", "Color": "Blue"}}, "offer": {"offerKey": "shirt-large", "value": {"kind": "price", "amountMinor": 2500, "currency": "USD"}, "purchaseLimit": 2, "eligibilityNote": "VIP", "pickupNote": "Lounge", "sortOrder": 0, "published": true}, "reviewedObservation": {"sourceName": "Shirt", "sourceRawText": "Shirt Large $25", "value": {"kind": "price", "amountMinor": 2500, "currency": "USD"}, "reviewStatus": "approved", "reviewedBy": "operator", "reviewedAt": "2026-10-31T12:00:00Z"}, "presentationMedia": {"mediaRole": "product_image", "quality": "midsize", "matchStatus": "exact_variant", "source": "external", "path": null, "sha256": null, "externalUrl": "https://example.com/shirt.webp", "sourceProvider": "Test", "sourceUrl": "https://example.com/source", "reviewNote": null, "reviewStatus": "approved", "reviewedBy": "operator", "reviewedAt": "2026-10-31T12:00:00Z"}, "availabilityObservation": {"availability": "unknown", "observedAt": "2026-10-31T12:00:00Z", "eventDay": "2026-10-31", "quantitySeen": null, "note": null}}]}$plan$::jsonb;
  receipt jsonb;
  target uuid;
begin
  receipt := public.promote_catalog_batch(plan);
  target := (receipt->'promotions'->0->>'offer_id')::uuid;
  if target is null then raise exception 'FAIL: no promoted offer'; end if;
  if not exists(select 1 from public.catalog_media where source_capture_id=(receipt->>'source_capture_id')::uuid and media_role='source_original' and mime_type='application/json' and object_path like '%.json') then
    raise exception 'FAIL: JSON original MIME/path lost';
  end if;
  begin
    insert into public.catalog_media(source_capture_id,media_role,purpose,match_status,external_url,source_provider,source_url,mime_type)
      values((receipt->>'source_capture_id')::uuid,'product_image','evidence','unreviewed','https://example.com/image.json','Test','https://example.com/source','application/json');
    raise exception 'FAIL: JSON accepted as presentation image';
  exception when check_violation then
    if sqlerrm not like '%catalog_media_mime_type_check%' then raise; end if;
  end;
  declare bad jsonb := jsonb_set(plan,'{batchKey}','"json-invalid-kind"');
  begin
    bad := jsonb_set(bad,'{sourceCapture,captureKind}','"board_photo"');
    perform public.promote_catalog_batch(bad);
    raise exception 'FAIL: board photo accepted JSON original';
  exception when invalid_parameter_value then
    if sqlerrm not like 'source original path must%' then raise; end if;
  end;
  if not exists (select 1 from public.catalog_offers o join public.catalog_variants v on v.id=o.variant_id
    where o.id=target and o.purchase_limit=2 and o.eligibility_note='VIP' and o.pickup_note='Lounge'
      and v.sku='SKU-L' and v.attributes='{"Size":"Large","Color":"Blue"}'::jsonb) then
    raise exception 'FAIL: RPC dropped options or purchasing rules';
  end if;
  insert into public.catalog_interests(owner_id,offer_id,note) values(auth.uid(),target,'Keep my shirt');
  if public.promote_catalog_batch(plan) <> receipt then raise exception 'FAIL: replay changed receipt'; end if;
  plan := jsonb_set(plan,'{batchKey}','"json-rpc-rebind"');
  plan := jsonb_set(plan,'{promotions,0,product,canonicalKey}','"guard-different-product"');
  begin
    perform public.promote_catalog_batch(plan);
    raise exception 'FAIL: RPC rebound product';
  exception when check_violation then
    if sqlerrm not like 'catalog offer identity is immutable%' then raise; end if;
  end;
  if not exists(select 1 from public.catalog_interests i join public.catalog_offers o on o.id=i.offer_id join public.catalog_products p on p.id=o.product_id where i.offer_id=target and i.note='Keep my shirt' and p.canonical_key='guard-shirt') then
    raise exception 'FAIL: interest identity changed';
  end if;
  if exists(select 1 from public.catalog_products where canonical_key='guard-different-product') then raise exception 'FAIL: rejected batch partially committed'; end if;
  plan := jsonb_set(plan,'{promotions,0,product,canonicalKey}','"guard-shirt"');
  plan := plan #- '{promotions,0,variant,sku}' #- '{promotions,0,variant,attributes}' #- '{promotions,0,offer,eligibilityNote}' #- '{promotions,0,offer,pickupNote}';
  perform public.promote_catalog_batch(plan);
  if not exists (select 1 from public.catalog_offers o join public.catalog_variants v on v.id=o.variant_id where o.id=target and o.eligibility_note='VIP' and o.pickup_note='Lounge' and v.sku='SKU-L' and v.attributes->>'Size'='Large') then raise exception 'FAIL: legacy payload erased retained fields'; end if;
end;
$test$;
rollback;
