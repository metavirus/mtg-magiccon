begin;

alter table public.wallet_receipts
  alter column original_html drop not null;

comment on column public.wallet_receipts.original_html is
  'Legacy transition field only. New proof must use private receipt_artifacts; purge after every legacy row has verified Storage readback.';

create table public.receipt_artifacts (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.wallet_receipts(id) on delete cascade,
  artifact_role text not null check (artifact_role in ('original','qr','transfer')),
  bucket_id text not null default 'private-receipt-artifacts'
    check (bucket_id = 'private-receipt-artifacts'),
  object_path text not null check (
    object_path = receipt_id::text || '/' || artifact_role || '/' || regexp_replace(object_path, '^.*/', '')
  ),
  mime_type text not null check (mime_type in ('image/png','image/jpeg','application/pdf','text/html')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  display_label text not null check (length(trim(display_label)) > 0),
  display_order integer not null default 1 check (display_order > 0),
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (bucket_id, object_path),
  unique (receipt_id, artifact_role, display_order)
);

alter table public.receipt_artifacts enable row level security;
alter table public.receipt_artifacts force row level security;
revoke all on public.receipt_artifacts from anon, authenticated;
grant select on public.receipt_artifacts to authenticated;
grant select, insert, update, delete on public.receipt_artifacts to service_role;

create policy "owners_or_attendees_select_receipt_artifacts"
  on public.receipt_artifacts for select to authenticated
  using (
    exists (
      select 1
      from public.wallet_receipts receipt
      where receipt.id = receipt_artifacts.receipt_id
        and (
          receipt.owner_id = (select auth.uid())
          or exists (
            select 1
            from public.companion_members attendee
            where attendee.person_key = any(receipt.attendee_person_keys)
              and attendee.user_id = (select auth.uid())
              and attendee.active
          )
        )
    )
  );

create index receipt_artifacts_receipt_role_idx
  on public.receipt_artifacts (receipt_id, artifact_role, display_order);

comment on table public.receipt_artifacts is
  'Private immutable proof manifest. Trusted intake writes objects and rows; authorized receipt viewers receive read-only access.';

with canonical_owner as (
  select user_id
  from public.companion_members
  where person_key = 'kavi' and active and user_id is not null
), legacy_badge_receipts as (
  select * from (values
    (
      md5('magiccon:wallet_receipt:gmail_legacy_capture:1868171070359890707')::uuid,
      '1868171070359890707', 'Black Lotus badge order', 'MagicCon: Atlanta 2026 :: Leap Conventions',
      '2026-06-16T09:19:00-07:00'::timestamptz, 2025.26::numeric, 'kavi', array['kavi','chris']::text[],
      '[{"title":"Black Lotus VIP | Early Bird","price":1005.13,"quantity":1,"attendee_person_keys":["kavi"]},{"title":"Black Lotus VIP | Early Bird","price":1005.13,"quantity":1,"attendee_person_keys":["chris"]},{"title":"Shipping","price":15,"quantity":1,"attendee_person_keys":["kavi","chris"]}]'::jsonb
    ),
    (
      md5('magiccon:wallet_receipt:gmail_legacy_capture:1868173301829594110')::uuid,
      '1868173301829594110', 'Juan Premium Weekend', 'MagicCon: Atlanta 2026 :: Leap Conventions',
      '2026-06-16T09:54:00-07:00'::timestamptz, 191.42::numeric, 'juan', array['juan']::text[],
      '[{"title":"Premium Weekend | Early Bird","price":191.42,"quantity":1,"attendee_person_keys":["juan"]}]'::jsonb
    )
  ) as seed(id, source_message_id, title, vendor, receipt_date, amount, attendee_person_key, attendee_person_keys, line_items)
)
insert into public.wallet_receipts (
  id, owner_id, source_system, source_message_id, receipt_type, title, vendor, receipt_date,
  amount, currency, attendee_person_key, attendee_person_keys, line_items, original_html, confidence
)
select seed.id, owner.user_id, 'gmail_legacy_capture', seed.source_message_id, 'badge', seed.title, seed.vendor,
  seed.receipt_date, seed.amount, 'USD', seed.attendee_person_key, seed.attendee_person_keys,
  seed.line_items, null, 'verified'
from legacy_badge_receipts seed
cross join canonical_owner owner
on conflict (id) do update set
  attendee_person_key = excluded.attendee_person_key,
  attendee_person_keys = excluded.attendee_person_keys,
  line_items = excluded.line_items,
  original_html = null,
  updated_at = now();

do $seed_guard$
begin
  if (select count(*) from public.companion_members where person_key = 'kavi' and active and user_id is not null) <> 1 then
    raise exception 'canonical_owner_binding_ambiguous';
  end if;
  if (select count(*) from public.wallet_receipts where id in (
    md5('magiccon:wallet_receipt:gmail_legacy_capture:1868171070359890707')::uuid,
    md5('magiccon:wallet_receipt:gmail_legacy_capture:1868173301829594110')::uuid
  ) and original_html is null) <> 2 then
    raise exception 'legacy_badge_seed_readback_failed';
  end if;
end
$seed_guard$;

drop policy if exists "authorized_receipt_artifact_downloads" on storage.objects;
create policy "authorized_receipt_artifact_downloads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'private-receipt-artifacts'
    and exists (
      select 1
      from public.receipt_artifacts artifact
      join public.wallet_receipts receipt on receipt.id = artifact.receipt_id
      where artifact.bucket_id = storage.objects.bucket_id
        and artifact.object_path = storage.objects.name
        and (
          receipt.owner_id = (select auth.uid())
          or exists (
            select 1
            from public.companion_members attendee
            where attendee.person_key = any(receipt.attendee_person_keys)
              and attendee.user_id = (select auth.uid())
              and attendee.active
          )
        )
    )
  );

commit;

select id, source_system, source_message_id, attendee_person_keys
from public.wallet_receipts
where id in (
  md5('magiccon:wallet_receipt:gmail_legacy_capture:1868171070359890707')::uuid,
  md5('magiccon:wallet_receipt:gmail_legacy_capture:1868173301829594110')::uuid
)
order by source_message_id;
