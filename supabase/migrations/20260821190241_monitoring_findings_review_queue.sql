create table public.monitoring_findings (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  source_id text not null,
  source_label text not null,
  source_url text not null,
  destination text not null default 'Activity',
  title text not null,
  summary text not null,
  review_question text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'needs_review',
  decision text,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  occurrence_count integer not null default 1,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  staged_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint monitoring_findings_fingerprint_unique unique (fingerprint),
  constraint monitoring_findings_fingerprint_length check (char_length(fingerprint) between 32 and 128),
  constraint monitoring_findings_source_id_length check (char_length(source_id) between 1 and 120),
  constraint monitoring_findings_destination_allowed check (destination in ('Home', 'Activity')),
  constraint monitoring_findings_status_allowed check (status in ('needs_review', 'staged', 'dismissed')),
  constraint monitoring_findings_decision_allowed check (decision is null or decision in ('yes', 'no')),
  constraint monitoring_findings_occurrence_count_positive check (occurrence_count > 0),
  constraint monitoring_findings_decision_semantics check (
    (status = 'needs_review' and decision is null and decided_by is null and decided_at is null and staged_at is null)
    or (status = 'staged' and decision = 'yes' and decided_by is not null and decided_at is not null and staged_at is not null)
    or (status = 'dismissed' and decision = 'no' and decided_by is not null and decided_at is not null and staged_at is null)
  )
);

comment on table public.monitoring_findings is 'Deduplicated surveyor findings awaiting Kavi review. Yes stages a candidate for later ingestion; no dismisses it. Neither path mutates canonical facts.';
comment on column public.monitoring_findings.fingerprint is 'Stable SHA-256 over source identity and the material diff; repeated observations increment occurrence_count instead of creating inbox spam.';
comment on column public.monitoring_findings.evidence is 'Source/diff evidence only. This is not normalized or canonical app data.';

create index monitoring_findings_status_last_seen_idx on public.monitoring_findings (status, last_seen_at desc);
create index monitoring_findings_source_last_seen_idx on public.monitoring_findings (source_id, last_seen_at desc);

alter table public.monitoring_findings enable row level security;
alter table public.monitoring_findings force row level security;

revoke all on table public.monitoring_findings from public, anon, authenticated;
grant select on table public.monitoring_findings to authenticated;
grant update (status, decision, decided_by, decided_at, staged_at, updated_at) on table public.monitoring_findings to authenticated;

create policy kavi_select_monitoring_findings
  on public.monitoring_findings
  for select
  to authenticated
  using (
    exists (
      select 1 from public.companion_members
      where person_key = 'kavi'
        and active
        and user_id = (select auth.uid())
    )
  );

create policy kavi_decide_monitoring_findings
  on public.monitoring_findings
  for update
  to authenticated
  using (
    status = 'needs_review'
    and exists (
      select 1 from public.companion_members
      where person_key = 'kavi'
        and active
        and user_id = (select auth.uid())
    )
  )
  with check (
    decided_by = (select auth.uid())
    and (
      (status = 'staged' and decision = 'yes' and decided_at is not null and staged_at is not null)
      or (status = 'dismissed' and decision = 'no' and decided_at is not null and staged_at is null)
    )
    and exists (
      select 1 from public.companion_members
      where person_key = 'kavi'
        and active
        and user_id = (select auth.uid())
    )
  );
