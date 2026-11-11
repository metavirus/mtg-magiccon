-- Keep existing private notes private. New shared exhibitor notes are visible to active companions.
create policy exhibitor_notes_companion_read
on public.personal_notes
as restrictive
for select
to authenticated
using (
  object_kind <> 'exhibitor'
  or owner_id = (select auth.uid())
  or exists (
    select 1 from public.companion_members
    where user_id = (select auth.uid()) and active
  )
);

alter table public.personal_notes drop constraint exhibitor_notes_private;
