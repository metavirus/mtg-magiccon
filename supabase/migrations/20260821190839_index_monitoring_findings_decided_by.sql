create index monitoring_findings_decided_by_idx
  on public.monitoring_findings (decided_by)
  where decided_by is not null;
