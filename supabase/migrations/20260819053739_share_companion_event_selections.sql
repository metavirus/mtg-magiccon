drop policy if exists "owners_select_user_selections" on public.user_selections;

create policy "active_companions_select_group_selections"
  on public.user_selections
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      user_selections.object_kind = 'event'
      and user_selections.selection_key = 'state'
      and
      exists (
        select 1
        from public.companion_members as viewer
        where viewer.user_id = (select auth.uid())
          and viewer.active
      )
      and exists (
        select 1
        from public.companion_members as owner
        where owner.user_id = user_selections.owner_id
          and owner.active
      )
    )
  );

comment on policy "active_companions_select_group_selections" on public.user_selections is
  'Active Atlanta companions can read event planning states made by active companions. Every other selection and all writes remain owner-only.';
