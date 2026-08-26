begin;

alter table public.wallet_receipts
  add column attendee_person_keys text[];

update public.wallet_receipts
set attendee_person_keys = array[attendee_person_key]
where attendee_person_keys is null;

alter table public.wallet_receipts
  alter column attendee_person_keys set not null,
  alter column attendee_person_keys set default '{}'::text[],
  add constraint wallet_receipts_has_attendees
    check (cardinality(attendee_person_keys) > 0);

drop policy "owners_or_attendees_select_wallet_receipts" on public.wallet_receipts;
create policy "owners_or_attendees_select_wallet_receipts"
  on public.wallet_receipts for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.companion_members attendee
      where attendee.person_key = any(wallet_receipts.attendee_person_keys)
        and attendee.user_id = (select auth.uid())
        and attendee.active
    )
  );

create index wallet_receipts_attendees_gin_idx
  on public.wallet_receipts using gin (attendee_person_keys);

comment on column public.wallet_receipts.attendee_person_keys is
  'All companion identities authorized to view and use this shared receipt artifact.';

commit;
