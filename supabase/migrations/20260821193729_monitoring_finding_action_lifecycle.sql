-- Extend the Kavi-only surveyor inbox from decision audit to an explicit,
-- consequence-aware action lifecycle. The queue remains noncanonical evidence;
-- canonical_target/result point at the separate state changed by an authorized
-- executor.

alter table public.monitoring_findings
  add column action_type text,
  add column action_payload jsonb,
  add column execution_status text not null default 'not_started',
  add column canonical_target jsonb,
  add column canonical_result jsonb,
  add column blocker text,
  add column error_message text,
  add column executed_at timestamptz,
  add column deployment_evidence jsonb,
  add column verification_evidence jsonb,
  add column retry_count integer not null default 0,
  add column rollback_payload jsonb;

alter table public.monitoring_findings
  drop constraint monitoring_findings_status_allowed,
  drop constraint monitoring_findings_decision_semantics;

-- Preserve any provisional Yes -> staged rows created before this migration as
-- explicitly blocked legacy work. They require a human-authored action mapping
-- before an executor may retry them.
update public.monitoring_findings
set action_type = 'manual_review',
    action_payload = jsonb_build_object(
      'reason', 'Legacy staged finding requires an explicit consequence mapping.'
    ),
    execution_status = 'blocked',
    blocker = 'Legacy staged finding requires an explicit consequence mapping.'
where status = 'staged';

alter table public.monitoring_findings
  add constraint monitoring_findings_status_allowed
    check (status in ('needs_review', 'authorized', 'staged', 'completed', 'dismissed')),
  add constraint monitoring_findings_execution_status_allowed
    check (execution_status in (
      'not_started',
      'queued',
      'executing',
      'completed',
      'blocked',
      'failed'
    )),
  add constraint monitoring_findings_retry_count_nonnegative
    check (retry_count >= 0),
  add constraint monitoring_findings_action_type_nonblank
    check (action_type is null or btrim(action_type) <> ''),
  add constraint monitoring_findings_action_payload_object
    check (action_payload is null or jsonb_typeof(action_payload) = 'object'),
  add constraint monitoring_findings_canonical_target_object
    check (canonical_target is null or jsonb_typeof(canonical_target) = 'object'),
  add constraint monitoring_findings_canonical_result_object
    check (canonical_result is null or jsonb_typeof(canonical_result) = 'object'),
  add constraint monitoring_findings_deployment_evidence_object
    check (deployment_evidence is null or jsonb_typeof(deployment_evidence) = 'object'),
  add constraint monitoring_findings_verification_evidence_object
    check (verification_evidence is null or jsonb_typeof(verification_evidence) = 'object'),
  add constraint monitoring_findings_rollback_payload_object
    check (rollback_payload is null or jsonb_typeof(rollback_payload) = 'object'),
  add constraint monitoring_findings_action_lifecycle_semantics check (
    (
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
  'Deduplicated surveyor evidence with Kavi-only consequence authorization and execution audit. It is not itself canonical app state.';
comment on column public.monitoring_findings.action_type is
  'Stable executor action identifier whose consequence is named in the review prompt.';
comment on column public.monitoring_findings.action_payload is
  'Bounded parameters Kavi authorized; executors must not broaden them.';
comment on column public.monitoring_findings.execution_status is
  'Action state: not_started, queued, executing, completed, failed, or blocked.';
comment on column public.monitoring_findings.canonical_target is
  'Stable type/key/location of the canonical object targeted by the authorized action.';
comment on column public.monitoring_findings.canonical_result is
  'Structured readback of the resulting canonical object or rollback state.';
comment on column public.monitoring_findings.deployment_evidence is
  'Structured deploy proof such as repository, commit, workflow run, and artifact identity.';
comment on column public.monitoring_findings.verification_evidence is
  'Structured validation/readback proof collected after execution or rollback.';
comment on column public.monitoring_findings.retry_count is
  'Number of execution retries after the initial attempt; increment before each retry.';
comment on column public.monitoring_findings.rollback_payload is
  'Bounded inverse operation captured before execution; null means the action is not reversibly executable.';

create index monitoring_findings_execution_status_updated_idx
  on public.monitoring_findings (execution_status, updated_at desc)
  where execution_status <> 'not_started';

-- Existing free-form activity history contains intentional repeated events, so
-- scope the idempotency guarantee to this reviewed-alert publication class.
create unique index user_activity_events_reviewed_official_links_idempotency_idx
  on public.user_activity_events (owner_id, object_id, activity_type)
  where activity_type = 'reviewed_official_links_published';

-- Reassert defense in depth and explicit Data API exposure after altering the
-- table. Only Kavi can see or mutate rows; anon and other companions receive no
-- rows even though authenticated has narrowly enumerated table/column grants.
alter table public.monitoring_findings enable row level security;
alter table public.monitoring_findings force row level security;

revoke all on table public.monitoring_findings from public, anon, authenticated;
grant select on table public.monitoring_findings to authenticated;
grant update (
  status,
  decision,
  decided_by,
  decided_at,
  staged_at,
  updated_at
) on table public.monitoring_findings to authenticated;

drop policy kavi_decide_monitoring_findings on public.monitoring_findings;

create policy kavi_manage_monitoring_finding_actions
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
      (status = 'needs_review' and decision is null)
      or (status in ('authorized', 'staged', 'completed') and decision = 'yes' and decided_by = (select auth.uid()))
      or (status = 'dismissed' and decision = 'no' and decided_by = (select auth.uid()))
    )
  );

-- One finding id is the entire callable contract. The function locks and uses
-- the server-stored action mapping, so a caller cannot broaden the approved
-- payload, target, or rollback. SECURITY DEFINER is justified because the
-- function must atomically update server-owned audit columns on a forced-RLS
-- table; the auth.uid Kavi guard, fixed empty search_path, single-action mapping,
-- and locked EXECUTE grants bound that privilege.
create or replace function public.execute_official_links_monitoring_action(
  p_finding_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_finding public.monitoring_findings%rowtype;
  v_activity public.user_activity_events%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_object_id text;
  v_target jsonb;
  v_result jsonb;
begin
  if v_owner_id is null or not exists (
    select 1
    from public.companion_members
    where person_key = 'kavi'
      and active
      and user_id = v_owner_id
  ) then
    raise exception 'Only active Kavi may execute reviewed monitoring actions.'
      using errcode = '42501';
  end if;

  select *
  into v_finding
  from public.monitoring_findings
  where id = p_finding_id
  for update;

  if not found then
    raise exception 'Monitoring finding is unavailable.' using errcode = 'P0002';
  end if;

  -- A completed call is idempotent and returns its prior verified readback.
  if v_finding.status = 'completed'
    and v_finding.decision = 'yes'
    and v_finding.execution_status = 'completed'
    and v_finding.action_type = 'publish_official_links_alert'
  then
    return jsonb_build_object(
      'finding_id', v_finding.id,
      'execution_status', v_finding.execution_status,
      'canonical_target', v_finding.canonical_target,
      'canonical_result', v_finding.canonical_result,
      'executed_at', v_finding.executed_at,
      'verification_evidence', v_finding.verification_evidence,
      'idempotent_replay', true
    );
  end if;

  if v_finding.status <> 'needs_review' or v_finding.decision is not null then
    raise exception 'Finding is not awaiting an initial decision.' using errcode = '23514';
  end if;

  if v_finding.action_type <> 'publish_official_links_alert'
    or v_finding.action_payload is null
    or v_finding.action_payload ->> 'kind' <> 'official_links_published'
    or v_finding.action_payload ->> 'destination' <> 'Activity'
    or nullif(btrim(v_finding.action_payload ->> 'summary'), '') is null
    or v_finding.action_payload ->> 'truth_class' <> 'reviewed_source_observation'
    or coalesce((v_finding.action_payload ->> 'canonical_fact_mutation')::boolean, true)
    or jsonb_typeof(v_finding.action_payload -> 'links') <> 'array'
    or jsonb_array_length(v_finding.action_payload -> 'links') = 0
    or v_finding.action_payload #>> '{source,finding_fingerprint}' <> v_finding.fingerprint
    or v_finding.rollback_payload <> jsonb_build_object('operation', 'remove_by_action_fingerprint')
  then
    raise exception 'Stored finding does not contain the exact executable official-links mapping.'
      using errcode = '23514';
  end if;

  v_object_id := 'monitoring-action:' || v_finding.fingerprint;
  v_target := jsonb_build_object(
    'kind', 'activity_reviewed_source_alerts',
    'destination', 'Activity',
    'idempotency_key', v_finding.fingerprint
  );

  insert into public.user_activity_events (
    owner_id,
    actor_label,
    object_id,
    object_kind,
    activity_type,
    summary,
    details,
    created_at
  ) values (
    v_owner_id,
    'Kavi',
    v_object_id,
    'alert',
    'reviewed_official_links_published',
    left(v_finding.action_payload ->> 'summary', 280),
    v_finding.action_payload,
    v_now
  )
  on conflict (owner_id, object_id, activity_type)
    where activity_type = 'reviewed_official_links_published'
  do update set details = public.user_activity_events.details
  returning * into v_activity;

  v_result := jsonb_build_object(
    'activity_event_id', v_activity.id,
    'object_id', v_activity.object_id,
    'activity_type', v_activity.activity_type,
    'published', true
  );

  update public.monitoring_findings
  set status = 'completed',
      decision = 'yes',
      decided_by = v_owner_id,
      decided_at = v_now,
      staged_at = null,
      execution_status = 'completed',
      canonical_target = v_target,
      canonical_result = v_result,
      blocker = null,
      error_message = null,
      executed_at = v_now,
      deployment_evidence = jsonb_build_object(
        'kind', 'database_rpc',
        'public_deploy_required', false
      ),
      verification_evidence = jsonb_build_object(
        'activity_event_id', v_activity.id,
        'idempotency_key', v_finding.fingerprint,
        'shared_activity_read_model', true
      ),
      updated_at = v_now
  where id = v_finding.id
  returning * into v_finding;

  return jsonb_build_object(
    'finding_id', v_finding.id,
    'execution_status', v_finding.execution_status,
    'canonical_target', v_finding.canonical_target,
    'canonical_result', v_finding.canonical_result,
    'executed_at', v_finding.executed_at,
    'verification_evidence', v_finding.verification_evidence,
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.execute_official_links_monitoring_action(uuid)
  from public, anon, authenticated;
grant execute on function public.execute_official_links_monitoring_action(uuid)
  to authenticated;

comment on function public.execute_official_links_monitoring_action(uuid) is
  'Kavi-only atomic authorization and idempotent publication of a pre-mapped reviewed official-links Activity alert.';
