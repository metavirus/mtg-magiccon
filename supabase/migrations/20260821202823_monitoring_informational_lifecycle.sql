-- Official-link discovery is useful source evidence, but publishing a duplicate
-- Activity alert is not a canonical consequence that warrants Kavi approval.
-- Preserve the executable lifecycle for future consequential actions while
-- giving informational findings an ordinary unread/read/archive lifecycle.

drop function if exists public.execute_official_links_monitoring_action(uuid);
drop index if exists public.user_activity_events_reviewed_official_links_idempotency_idx;

alter table public.monitoring_findings
  drop constraint monitoring_findings_status_allowed,
  drop constraint monitoring_findings_action_lifecycle_semantics;

update public.monitoring_findings
set evidence = jsonb_set(
      evidence,
      '{presentation_links}',
      coalesce(action_payload -> 'links', '[]'::jsonb),
      true
    ),
    review_question = 'Official Magic Play links were detected and retained as source evidence.',
    status = 'unread',
    decision = null,
    decided_by = null,
    decided_at = null,
    staged_at = null,
    action_type = null,
    action_payload = null,
    execution_status = 'not_started',
    canonical_target = null,
    canonical_result = null,
    blocker = null,
    error_message = null,
    executed_at = null,
    deployment_evidence = null,
    verification_evidence = null,
    retry_count = 0,
    rollback_payload = null,
    updated_at = timezone('utc', now())
where fingerprint = 'bc7e5a90597e4ca6ee811d8254b73b10aae5d31ca2a2401a2454422164610cbd'
  and status = 'needs_review'
  and decision is null;

alter table public.monitoring_findings
  add constraint monitoring_findings_status_allowed
    check (status in (
      'unread',
      'read',
      'archived',
      'needs_review',
      'authorized',
      'staged',
      'completed',
      'dismissed'
    )),
  add constraint monitoring_findings_action_lifecycle_semantics check (
    (
      status in ('unread', 'read', 'archived')
      and decision is null
      and decided_by is null
      and decided_at is null
      and staged_at is null
      and action_type is null
      and action_payload is null
      and execution_status = 'not_started'
      and canonical_target is null
      and canonical_result is null
      and blocker is null
      and error_message is null
      and executed_at is null
      and deployment_evidence is null
      and verification_evidence is null
      and retry_count = 0
      and rollback_payload is null
    )
    or (
      status = 'needs_review'
      and decision is null
      and decided_by is null
      and decided_at is null
      and staged_at is null
      and execution_status = 'not_started'
      and executed_at is null
    )
    or (
      status = 'dismissed'
      and decision = 'no'
      and decided_by is not null
      and decided_at is not null
      and staged_at is null
      and execution_status = 'not_started'
      and executed_at is null
    )
    or (
      status = 'staged'
      and decision = 'yes'
      and decided_by is not null
      and decided_at is not null
      and staged_at is not null
      and action_type is not null
      and action_payload is not null
      and execution_status = 'blocked'
      and nullif(btrim(blocker), '') is not null
      and executed_at is null
    )
    or (
      status = 'authorized'
      and decision = 'yes'
      and decided_by is not null
      and decided_at is not null
      and action_type is not null
      and action_payload is not null
      and rollback_payload is not null
      and execution_status in ('queued', 'executing', 'blocked', 'failed')
      and (execution_status <> 'blocked' or nullif(btrim(blocker), '') is not null)
      and (execution_status <> 'failed' or nullif(btrim(error_message), '') is not null)
      and executed_at is null
    )
    or (
      status = 'completed'
      and decision = 'yes'
      and decided_by is not null
      and decided_at is not null
      and action_type is not null
      and action_payload is not null
      and rollback_payload is not null
      and execution_status = 'completed'
      and canonical_target is not null
      and canonical_result is not null
      and executed_at is not null
    )
  );

comment on table public.monitoring_findings is
  'Kavi-only deduplicated surveyor evidence. Informational findings use unread/read/archive state; only genuinely consequential findings enter the decision and execution lifecycle.';
comment on column public.monitoring_findings.status is
  'Informational: unread, read, archived. Consequential: needs_review, authorized, staged, completed, dismissed.';
comment on column public.monitoring_findings.evidence is
  'Source/diff evidence only. presentation_links may hold normalized labeled links for informational display; this is not canonical app data.';

-- Remove the obsolete browser-executable audit grants added for the retired RPC.
-- Kavi retains only the review-state/decision fields; action and result evidence
-- remain server-managed for any future consequential executor.
revoke update (
  execution_status,
  canonical_target,
  canonical_result,
  blocker,
  error_message,
  executed_at,
  deployment_evidence,
  verification_evidence
) on table public.monitoring_findings from authenticated;

drop policy kavi_manage_monitoring_finding_actions on public.monitoring_findings;

create policy kavi_manage_monitoring_finding_review_state
  on public.monitoring_findings
  for update
  to authenticated
  using (
    exists (
      select 1 from public.companion_members
      where person_key = 'kavi'
        and active
        and user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.companion_members
      where person_key = 'kavi'
        and active
        and user_id = (select auth.uid())
    )
    and (
      (status in ('unread', 'read', 'archived') and decision is null)
      or (status = 'needs_review' and decision is null)
      or (status in ('authorized', 'staged', 'completed') and decision = 'yes' and decided_by = (select auth.uid()))
      or (status = 'dismissed' and decision = 'no' and decided_by = (select auth.uid()))
    )
  );

alter table public.monitoring_findings enable row level security;
alter table public.monitoring_findings force row level security;

revoke all on table public.monitoring_findings from public, anon;
grant select on table public.monitoring_findings to authenticated;
