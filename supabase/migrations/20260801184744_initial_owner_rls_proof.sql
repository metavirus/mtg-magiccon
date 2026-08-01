begin;

create table public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_notes_owner_required check (owner_id is not null)
);

comment on table public.personal_notes is 'Minimal private owner-scoped continuity record; not a speculative event-domain schema.';
alter table public.personal_notes enable row level security;
alter table public.personal_notes force row level security;

revoke all on table public.personal_notes from public, anon, authenticated;
grant select, insert, update, delete on table public.personal_notes to authenticated;

create policy "owners_select_personal_notes" on public.personal_notes
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "owners_insert_personal_notes" on public.personal_notes
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "owners_update_personal_notes" on public.personal_notes
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owners_delete_personal_notes" on public.personal_notes
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

commit;
