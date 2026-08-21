alter table public.monitoring_concepts
  add column review_state text not null default 'unread',
  add constraint monitoring_concepts_review_state_allowed
    check (review_state in ('unread', 'read', 'archived'));

comment on column public.monitoring_concepts.review_state is
  'Kavi review state only: unread, read, or archived. It does not change semantic resolution or canonical facts.';

grant update (review_state, updated_at)
  on table public.monitoring_concepts to authenticated;

create policy kavi_update_monitoring_concept_review_state
  on public.monitoring_concepts
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.companion_members
      where person_key = 'kavi'
        and active
        and user_id = (select auth.uid())
    )
  )
  with check (
    owner_id = (select auth.uid())
    and review_state in ('unread', 'read', 'archived')
    and exists (
      select 1 from public.companion_members
      where person_key = 'kavi'
        and active
        and user_id = (select auth.uid())
    )
  );
