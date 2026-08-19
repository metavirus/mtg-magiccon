begin;

drop policy if exists "active_companions_select_group_selections" on public.user_selections;
create policy "active_companions_select_group_selections"
  on public.user_selections
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      user_selections.object_kind = 'event'
      and user_selections.selection_key = 'state'
      and exists (select 1 from public.companion_members viewer where viewer.user_id = (select auth.uid()) and viewer.active)
      and exists (select 1 from public.companion_members owner where owner.user_id = user_selections.owner_id and owner.active)
    )
    or (
      user_selections.object_id = 'wallet-prize-tix'
      and user_selections.selection_key = 'balance'
      and exists (select 1 from public.companion_members owner where owner.person_key = 'kavi' and owner.user_id = user_selections.owner_id and owner.active)
      and exists (
        select 1 from public.companion_members viewer
        where viewer.person_key = 'juan'
          and viewer.active
          and (viewer.user_id = (select auth.uid()) or lower(viewer.auth_email) = lower((select auth.jwt() ->> 'email')))
      )
    )
  );

drop policy if exists "owners_insert_user_selections" on public.user_selections;
create policy "owners_insert_user_selections"
  on public.user_selections
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    or (
      object_id = 'wallet-prize-tix'
      and selection_key = 'balance'
      and exists (select 1 from public.companion_members owner where owner.person_key = 'kavi' and owner.user_id = user_selections.owner_id and owner.active)
      and exists (
        select 1 from public.companion_members viewer
        where viewer.person_key = 'juan'
          and viewer.active
          and (viewer.user_id = (select auth.uid()) or lower(viewer.auth_email) = lower((select auth.jwt() ->> 'email')))
      )
    )
  );

drop policy if exists "owners_update_user_selections" on public.user_selections;
create policy "owners_update_user_selections"
  on public.user_selections
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      object_id = 'wallet-prize-tix'
      and selection_key = 'balance'
      and exists (select 1 from public.companion_members owner where owner.person_key = 'kavi' and owner.user_id = user_selections.owner_id and owner.active)
      and exists (
        select 1 from public.companion_members viewer
        where viewer.person_key = 'juan'
          and viewer.active
          and (viewer.user_id = (select auth.uid()) or lower(viewer.auth_email) = lower((select auth.jwt() ->> 'email')))
      )
    )
  )
  with check (
    owner_id = (select auth.uid())
    or (
      object_id = 'wallet-prize-tix'
      and selection_key = 'balance'
      and exists (select 1 from public.companion_members owner where owner.person_key = 'kavi' and owner.user_id = user_selections.owner_id and owner.active)
      and exists (
        select 1 from public.companion_members viewer
        where viewer.person_key = 'juan'
          and viewer.active
          and (viewer.user_id = (select auth.uid()) or lower(viewer.auth_email) = lower((select auth.jwt() ->> 'email')))
      )
    )
  );

comment on policy "active_companions_select_group_selections" on public.user_selections is
  'Active companions share event states. Juan additionally shares Kavi''s Prize Tix balance; all other selections remain owner-private.';

commit;
