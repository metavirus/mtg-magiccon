-- The Kavi-only RLS policy is sufficient for this atomic action. Run with the
-- caller's privileges so the reviewed executor does not require a privileged
-- function exposed through the Data API.
alter function public.execute_official_links_monitoring_action(uuid)
  security invoker;

grant update (
  status,
  decision,
  decided_by,
  decided_at,
  staged_at,
  execution_status,
  canonical_target,
  canonical_result,
  blocker,
  error_message,
  executed_at,
  deployment_evidence,
  verification_evidence,
  updated_at
) on table public.monitoring_findings to authenticated;

comment on function public.execute_official_links_monitoring_action(uuid) is
  'Kavi-only RLS-governed atomic authorization and idempotent publication of a pre-mapped reviewed official-links Activity alert.';
