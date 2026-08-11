drop policy if exists "Owners can select personal notes" on public.personal_notes;

create policy "Authenticated users can select shared notes"
on public.personal_notes
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or visibility = 'shared'
);
