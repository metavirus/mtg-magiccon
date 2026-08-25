begin;

create table public.wallet_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_system text not null,
  source_message_id text not null,
  source_thread_id text,
  receipt_type text not null check (receipt_type in ('badge','ticketed_play','store','travel','hotel','other')),
  title text not null,
  vendor text not null,
  receipt_date timestamptz not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  attendee_person_key text not null references public.companion_members(person_key),
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  original_html text not null,
  confidence text not null default 'verified' check (confidence in ('verified','high','needs_review')),
  ingested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, source_system, source_message_id)
);

alter table public.wallet_receipts enable row level security;
alter table public.wallet_receipts force row level security;
revoke all on public.wallet_receipts from anon;
revoke all on public.wallet_receipts from authenticated;
grant select, insert, update, delete on public.wallet_receipts to authenticated;

create policy "owners_or_attendees_select_wallet_receipts"
  on public.wallet_receipts for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.companion_members attendee
      where attendee.person_key = wallet_receipts.attendee_person_key
        and attendee.user_id = (select auth.uid())
        and attendee.active
    )
  );
create policy "owners_insert_wallet_receipts"
  on public.wallet_receipts for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "owners_update_wallet_receipts"
  on public.wallet_receipts for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "owners_delete_wallet_receipts"
  on public.wallet_receipts for delete to authenticated
  using (owner_id = (select auth.uid()));

create index wallet_receipts_attendee_date_idx on public.wallet_receipts (attendee_person_key, receipt_date desc);
create index wallet_receipts_owner_date_idx on public.wallet_receipts (owner_id, receipt_date desc);

comment on table public.wallet_receipts is
  'Private receipt artifact bundles: normalized Wallet facts plus the full original source HTML, ingested once from Gmail or another proof source.';

commit;
