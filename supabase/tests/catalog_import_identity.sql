-- Run only against an isolated local database after catalog migrations.
-- Uses real SQL updates/upserts and rolls back every fixture.
begin;
insert into public.catalogs(id,event_key,family,title) values ('10000000-0000-4000-8000-000000000001','guard-test','show_store','Test');
insert into public.catalog_products(id,canonical_key,name,category) values
('20000000-0000-4000-8000-000000000001','guard-a','A','Test'),
('20000000-0000-4000-8000-000000000002','guard-b','B','Test');
insert into public.catalog_variants(id,product_id,variant_key,label) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','large','Large');
insert into public.catalog_offers(id,catalog_id,product_id,offer_key,price_amount,currency) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','stable',25,'USD');
do $$
begin
  begin
    insert into public.catalog_offers(catalog_id,product_id,offer_key,price_amount,currency)
    values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','stable',30,'USD')
    on conflict (catalog_id,offer_key) do update set product_id=excluded.product_id;
    raise exception 'FAIL: UPSERT rebound a product';
  exception when check_violation then
    if sqlerrm not like 'catalog offer identity is immutable%' then raise; end if;
  end;
  begin
    update public.catalog_offers set variant_id='30000000-0000-4000-8000-000000000001' where offer_key='stable';
    raise exception 'FAIL: null variant rebound';
  exception when check_violation then
    if sqlerrm not like 'catalog offer identity is immutable%' then raise; end if;
  end;
  begin
    update public.catalog_offers set offer_key='renamed' where offer_key='stable';
    raise exception 'FAIL: offer key changed';
  exception when check_violation then
    if sqlerrm not like 'catalog offer identity is immutable%' then raise; end if;
  end;
  update public.catalog_offers set price_amount=30, purchase_limit=2, eligibility_note='VIP', pickup_note='Lounge' where offer_key='stable';
  if not exists(select 1 from public.catalog_offers where offer_key='stable' and price_amount=30 and purchase_limit=2 and product_id='20000000-0000-4000-8000-000000000001' and variant_id is null) then
    raise exception 'FAIL: ordinary offer update lost identity';
  end if;
end;
$$;
rollback;
