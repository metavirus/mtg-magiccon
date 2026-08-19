drop policy if exists "user_activity_events_select_own" on public.user_activity_events;

create policy "active_companions_select_group_activity"
  on public.user_activity_events
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      exists (
        select 1
        from public.companion_members as viewer
        where viewer.user_id = (select auth.uid())
          and viewer.active
      )
      and exists (
        select 1
        from public.companion_members as actor
        where actor.user_id = user_activity_events.owner_id
          and actor.active
      )
    )
  );

comment on policy "active_companions_select_group_activity" on public.user_activity_events is
  'Active Atlanta companions can read activity authored by active companions. Writes, updates, and deletes remain owner-only.';
