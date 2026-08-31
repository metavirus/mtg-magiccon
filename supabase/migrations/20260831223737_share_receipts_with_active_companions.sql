drop policy if exists "owners_or_attendees_select_wallet_receipts" on public.wallet_receipts;
drop policy if exists "active_companions_select_wallet_receipts" on public.wallet_receipts;
create policy "active_companions_select_wallet_receipts"
  on public.wallet_receipts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.companion_members member
      where member.user_id = (select auth.uid())
        and member.active
    )
  );

drop policy if exists "owners_or_attendees_select_receipt_artifacts" on public.receipt_artifacts;
drop policy if exists "active_companions_select_receipt_artifacts" on public.receipt_artifacts;
create policy "active_companions_select_receipt_artifacts"
  on public.receipt_artifacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.companion_members member
      where member.user_id = (select auth.uid())
        and member.active
    )
  );

drop policy if exists "authorized_receipt_artifact_downloads" on storage.objects;
drop policy if exists "active_companion_receipt_artifact_downloads" on storage.objects;
create policy "active_companion_receipt_artifact_downloads"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'private-receipt-artifacts'
    and exists (
      select 1
      from public.companion_members member
      where member.user_id = (select auth.uid())
        and member.active
    )
    and exists (
      select 1
      from public.receipt_artifacts artifact
      where artifact.bucket_id = objects.bucket_id
        and artifact.object_path = objects.name
    )
  );

comment on table public.receipt_artifacts is
  'Shared receipt proof manifest for active companion members. Storage objects remain unavailable to anonymous visitors.';

