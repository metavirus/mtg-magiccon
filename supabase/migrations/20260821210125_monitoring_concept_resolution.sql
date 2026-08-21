create type public.monitoring_concept_resolution as enum (
  'noise',
  'corroboration',
  'new',
  'material_update',
  'contradiction',
  'milestone_transition'
);

create type public.monitoring_concept_attention as enum (
  'informational',
  'material_update',
  'contradiction',
  'milestone_transition',
  'archived'
);

create table public.monitoring_concepts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  concept_key text not null,
  concept_kind text not null,
  title text not null,
  latest_resolution public.monitoring_concept_resolution not null,
  attention_state public.monitoring_concept_attention not null,
  current_summary text not null,
  current_state jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  evidence_count integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint monitoring_concepts_owner_key_unique unique (owner_id, concept_key),
  constraint monitoring_concepts_id_owner_unique unique (id, owner_id),
  constraint monitoring_concepts_key_nonblank check (btrim(concept_key) <> ''),
  constraint monitoring_concepts_kind_nonblank check (btrim(concept_kind) <> ''),
  constraint monitoring_concepts_title_nonblank check (btrim(title) <> ''),
  constraint monitoring_concepts_summary_nonblank check (btrim(current_summary) <> ''),
  constraint monitoring_concepts_state_object check (jsonb_typeof(current_state) = 'object'),
  constraint monitoring_concepts_evidence_count_positive check (evidence_count > 0),
  constraint monitoring_concepts_seen_order check (last_seen_at >= first_seen_at),
  constraint monitoring_concepts_noise_is_not_a_concept check (latest_resolution <> 'noise'),
  constraint monitoring_concepts_attention_matches_resolution check (
    attention_state = 'archived'
    or (latest_resolution in ('new', 'corroboration') and attention_state in ('informational', 'material_update', 'contradiction', 'milestone_transition'))
    or (latest_resolution = 'material_update' and attention_state = 'material_update')
    or (latest_resolution = 'contradiction' and attention_state = 'contradiction')
    or (latest_resolution = 'milestone_transition' and attention_state = 'milestone_transition')
  )
);

comment on table public.monitoring_concepts is
  'Kavi-only deduplicated semantic interpretations derived from monitoring evidence. Concepts are noncanonical read models and never mutate source-backed facts.';
comment on column public.monitoring_concepts.latest_resolution is
  'Latest semantic resolution. Noise is part of the classifier vocabulary but is prohibited from creating a concept.';
comment on column public.monitoring_concepts.attention_state is
  'Durable attention rollup. Corroboration preserves the prior state instead of hiding a previously material concept.';
comment on column public.monitoring_concepts.current_state is
  'Structured derived interpretation with no authority to overwrite canonical facts.';

create table public.monitoring_concept_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  concept_id uuid not null,
  finding_id uuid not null references public.monitoring_findings (id) on delete restrict,
  resolution public.monitoring_concept_resolution not null,
  rationale text not null,
  extracted_state jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint monitoring_concept_evidence_concept_owner_fk
    foreign key (concept_id, owner_id)
    references public.monitoring_concepts (id, owner_id) on delete cascade,
  constraint monitoring_concept_evidence_concept_finding_unique unique (concept_id, finding_id),
  constraint monitoring_concept_evidence_noise_has_no_concept check (resolution <> 'noise'),
  constraint monitoring_concept_evidence_rationale_nonblank check (btrim(rationale) <> ''),
  constraint monitoring_concept_evidence_state_object check (jsonb_typeof(extracted_state) = 'object')
);

comment on table public.monitoring_concept_evidence is
  'Lineage from retained monitoring findings to derived concepts. Noise remains only on source evidence and does not create a concept row.';

create index monitoring_concepts_owner_attention_last_seen_idx
  on public.monitoring_concepts (owner_id, attention_state, last_seen_at desc);
create index monitoring_concept_evidence_owner_concept_observed_idx
  on public.monitoring_concept_evidence (owner_id, concept_id, observed_at desc);
create index monitoring_concept_evidence_finding_idx
  on public.monitoring_concept_evidence (finding_id);

create function public.preserve_monitoring_concept_attention_on_corroboration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.latest_resolution = 'corroboration' then
    new.attention_state := old.attention_state;
  end if;
  return new;
end;
$$;

create trigger preserve_monitoring_concept_attention_on_corroboration
before update of latest_resolution, attention_state on public.monitoring_concepts
for each row execute function public.preserve_monitoring_concept_attention_on_corroboration();

revoke all on function public.preserve_monitoring_concept_attention_on_corroboration()
  from public, anon, authenticated;

alter table public.monitoring_concepts enable row level security;
alter table public.monitoring_concepts force row level security;
alter table public.monitoring_concept_evidence enable row level security;
alter table public.monitoring_concept_evidence force row level security;

revoke all on table public.monitoring_concepts, public.monitoring_concept_evidence
  from public, anon, authenticated;
grant select on table public.monitoring_concepts, public.monitoring_concept_evidence
  to authenticated;

create policy kavi_select_monitoring_concepts
  on public.monitoring_concepts
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.companion_members
      where person_key = 'kavi'
        and active
        and user_id = (select auth.uid())
    )
  );

create policy kavi_select_monitoring_concept_evidence
  on public.monitoring_concept_evidence
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.companion_members
      where person_key = 'kavi'
        and active
        and user_id = (select auth.uid())
    )
  );

do $$
declare
  v_owner_id uuid;
  v_owner_count integer;
  v_concept_id uuid;
  v_finding public.monitoring_findings%rowtype;
  v_state jsonb;
begin
  select count(*), (array_agg(user_id))[1]
  into v_owner_count, v_owner_id
  from public.companion_members
  where person_key = 'kavi' and active and user_id is not null;

  if v_owner_count <> 1 then
    raise exception 'Expected exactly one active linked Kavi companion; found %.', v_owner_count;
  end if;

  select * into strict v_finding
  from public.monitoring_findings
  where fingerprint = 'bc7e5a90597e4ca6ee811d8254b73b10aae5d31ca2a2401a2454422164610cbd';

  v_state := jsonb_build_object(
    'resources', coalesce(v_finding.evidence -> 'presentation_links', '[]'::jsonb),
    'source_id', v_finding.source_id,
    'source_url', v_finding.source_url
  );

  insert into public.monitoring_concepts (
    owner_id, concept_key, concept_kind, title, latest_resolution,
    attention_state, current_summary, current_state, first_seen_at,
    last_seen_at, evidence_count
  ) values (
    v_owner_id,
    'atlanta:magic-play:official-resources-available',
    'official_resource_availability',
    'Official Magic Play resources are available',
    'new',
    'informational',
    v_finding.summary,
    v_state,
    v_finding.first_seen_at,
    v_finding.last_seen_at,
    1
  )
  returning id into v_concept_id;

  insert into public.monitoring_concept_evidence (
    owner_id, concept_id, finding_id, resolution, rationale,
    extracted_state, observed_at
  ) values (
    v_owner_id,
    v_concept_id,
    v_finding.id,
    'new',
    'First retained evidence of planning-relevant official Magic Play resource navigation.',
    v_state,
    v_finding.last_seen_at
  );
end;
$$;
