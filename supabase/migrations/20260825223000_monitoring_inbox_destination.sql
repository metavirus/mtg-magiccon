begin;

alter table public.monitoring_findings
  drop constraint if exists monitoring_findings_destination_allowed;

alter table public.monitoring_findings
  add constraint monitoring_findings_destination_allowed
  check (destination in ('Home', 'Activity', 'Inbox'));

comment on column public.monitoring_findings.destination is
  'Home and Activity are informational monitoring surfaces. Inbox is reserved for persistent alerts that intersect shared companion selections.';

commit;
