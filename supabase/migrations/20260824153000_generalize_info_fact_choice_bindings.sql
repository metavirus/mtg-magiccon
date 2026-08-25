-- Generalized server-side allowlist for deterministic maintained-Info factual choices.
create table public.info_fact_choice_bindings (
  concept_key text primary key check (concept_key = btrim(concept_key) and concept_key <> ''),
  topic_key text not null references public.info_topics(topic_key) on delete restrict,
  section_key text not null,
  fact_label text not null,
  value_kind text not null check (value_kind in ('time','time_range','currency_increment','currency_per_visit')),
  consequence_class text not null check (consequence_class in ('activity_choice','urgent_activity_choice')),
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique(topic_key, section_key, fact_label)
);

alter table public.info_fact_choice_bindings enable row level security;
alter table public.info_fact_choice_bindings force row level security;
revoke all on table public.info_fact_choice_bindings from public, anon, authenticated;

insert into public.info_fact_choice_bindings(concept_key,topic_key,section_key,fact_label,value_kind,consequence_class) values
('atlanta:hours:show-floor:friday','hours','hours','Friday, Nov. 13','time_range','activity_choice'),
('atlanta:hours:show-floor:saturday','hours','hours','Saturday, Nov. 14','time_range','activity_choice'),
('atlanta:hours:show-floor:sunday','hours','hours','Sunday, Nov. 15','time_range','activity_choice'),
('atlanta:will-call:hours:thursday','will-call','hours','Thursday, Nov. 12','time_range','activity_choice'),
('atlanta:will-call:hours:friday','will-call','hours','Friday, Nov. 13','time_range','activity_choice'),
('atlanta:will-call:hours:saturday','will-call','hours','Saturday, Nov. 14','time_range','activity_choice'),
('atlanta:will-call:hours:sunday','will-call','hours','Sunday, Nov. 15','time_range','activity_choice'),
('atlanta:on-demand-play:registration-hours:constructed-draft:sunday','on-demand-play','registration-hours','Constructed & Draft · Sun','time_range','activity_choice'),
('atlanta:on-demand-play:registration-hours:commander:sunday','on-demand-play','registration-hours','Commander · Sun','time_range','activity_choice'),
('atlanta:on-demand-play:voucher-price','on-demand-play','how-to-play','Voucher price','currency_increment','activity_choice'),
('atlanta:on-demand-play:purchase-cap','on-demand-play','how-to-play','Purchase cap','currency_per_visit','activity_choice'),
('atlanta:prize-tix:sunday-line-cutoff','prize-tix','location-hours','Sunday line cutoff','time','urgent_activity_choice');

create or replace function public.resolve_monitoring_factual_choice(p_finding_id uuid, p_choice_key text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_owner_id uuid := (select auth.uid()); v_finding public.monitoring_findings%rowtype;
  v_binding public.info_fact_choice_bindings%rowtype; v_topic public.info_topics%rowtype;
  v_choice jsonb; v_prior text; v_value text; v_label text; v_activity_id uuid;
  v_section_index integer; v_fact_index integer; v_match_count integer; v_article jsonb;
  v_now timestamptz := timezone('utc', now());
begin
  if v_owner_id is null or not exists (select 1 from public.companion_members where person_key='kavi' and active and user_id=v_owner_id)
    then raise exception 'Only active Kavi may resolve factual choices.' using errcode='42501'; end if;
  if nullif(btrim(p_choice_key),'') is null then raise exception 'Choice key is required.' using errcode='22023'; end if;
  select * into v_finding from public.monitoring_findings where id=p_finding_id for update;
  if not found then raise exception 'Monitoring finding is unavailable.' using errcode='P0002'; end if;
  if v_finding.status='completed' and v_finding.execution_status='completed' and v_finding.selected_choice_key=p_choice_key then
    return jsonb_build_object('status','completed','choice_key',v_finding.selected_choice_key,'canonical_result',v_finding.canonical_result,'idempotent_replay',true); end if;
  if v_finding.status not in ('needs_review','deferred') or v_finding.decision is not null
    then raise exception 'Finding is not awaiting a factual choice.' using errcode='23514'; end if;
  if v_finding.action_type <> 'resolve_info_topic_article_fact_conflict'
    or v_finding.action_payload->>'target_kind' <> 'info_topic_article_fact'
    or jsonb_typeof(v_finding.action_payload->'choice_options') <> 'array'
    or jsonb_array_length(v_finding.action_payload->'choice_options') <> 2
    or v_finding.rollback_payload->>'operation' <> 'restore_info_topic_article_fact'
    then raise exception 'Finding does not contain a factual-choice mapping.' using errcode='23514'; end if;
  select * into v_binding from public.info_fact_choice_bindings
    where concept_key=v_finding.action_payload->>'concept_key' and enabled;
  if not found
    or v_binding.topic_key <> v_finding.action_payload->>'topic_key'
    or v_binding.section_key <> v_finding.action_payload->>'section_key'
    or v_binding.fact_label <> v_finding.action_payload->>'fact_label'
    then raise exception 'Finding is not bound to an approved maintained fact.' using errcode='23514'; end if;
  select value into v_choice from jsonb_array_elements(v_finding.action_payload->'choice_options') where value->>'choice_key'=p_choice_key;
  if v_choice is null then raise exception 'Choice is not one of the server-stored options.' using errcode='22023'; end if;
  v_value:=nullif(btrim(v_choice->>'value'),''); v_label:=nullif(btrim(v_choice->>'label'),'');
  if v_value is null or v_label is null then raise exception 'Stored choice is incomplete.' using errcode='23514'; end if;
  select * into v_topic from public.info_topics where topic_key=v_binding.topic_key for update;
  if not found then raise exception 'Bound Info topic is unavailable.' using errcode='P0002'; end if;
  select count(*),min((section_ordinality-1)::integer),min((fact_ordinality-1)::integer)
    into v_match_count,v_section_index,v_fact_index
    from jsonb_array_elements(v_topic.article->'sections') with ordinality s(section_value,section_ordinality)
    cross join lateral jsonb_array_elements(s.section_value->'facts') with ordinality f(fact_value,fact_ordinality)
    where s.section_value->>'key'=v_binding.section_key and f.fact_value->>'label'=v_binding.fact_label;
  if v_match_count<>1 then raise exception 'Bound article fact path is missing or ambiguous.' using errcode='23514'; end if;
  v_prior:=v_topic.article #>> array['sections',v_section_index::text,'facts',v_fact_index::text,'value'];
  if v_finding.rollback_payload->>'topic_key'<>v_binding.topic_key
    or v_finding.rollback_payload->>'section_key'<>v_binding.section_key
    or v_finding.rollback_payload->>'fact_label'<>v_binding.fact_label
    or v_finding.rollback_payload->>'value'<>v_prior
    then raise exception 'Canonical value changed since this choice was prepared.' using errcode='40001'; end if;
  v_article:=jsonb_set(v_topic.article,array['sections',v_section_index::text,'facts',v_fact_index::text,'value'],to_jsonb(v_value),false);
  update public.info_topics set article=v_article,updated_at=v_now where topic_key=v_topic.topic_key;
  insert into public.user_activity_events(owner_id,actor_label,object_id,object_kind,activity_type,summary,details,created_at)
    values(v_owner_id,'Kavi','monitoring-choice:'||v_finding.fingerprint,'info','monitoring_factual_choice_resolved',left(v_finding.title||': '||v_label,280),
      jsonb_build_object('destination','Info','concept_key',v_binding.concept_key,'topic_key',v_binding.topic_key,'section_key',v_binding.section_key,'fact_label',v_binding.fact_label,'choice_key',p_choice_key,'choice_label',v_label,'prior_value',v_prior,'current_value',v_value,'finding_id',v_finding.id),v_now)
    on conflict(owner_id,object_id,activity_type) where activity_type='monitoring_factual_choice_resolved'
    do update set details=excluded.details returning id into v_activity_id;
  update public.monitoring_findings set status='completed',decision='yes',decided_by=v_owner_id,decided_at=v_now,staged_at=null,execution_status='completed',selected_choice_key=p_choice_key,
    canonical_target=jsonb_build_object('kind','info_topic_article_fact','concept_key',v_binding.concept_key,'topic_key',v_binding.topic_key,'section_key',v_binding.section_key,'fact_label',v_binding.fact_label),
    canonical_result=jsonb_build_object('topic_key',v_binding.topic_key,'section_key',v_binding.section_key,'fact_label',v_binding.fact_label,'prior_value',v_prior,'current_value',v_value,'activity_event_id',v_activity_id),
    blocker=null,error_message=null,executed_at=v_now,verification_evidence=jsonb_build_object('activity_event_id',v_activity_id,'readback_value',v_value),updated_at=v_now
    where id=v_finding.id returning * into v_finding;
  return jsonb_build_object('status','completed','choice_key',p_choice_key,'canonical_result',v_finding.canonical_result,'idempotent_replay',false);
end; $$;

revoke all on function public.resolve_monitoring_factual_choice(uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_monitoring_factual_choice(uuid,text) to authenticated;
comment on function public.resolve_monitoring_factual_choice(uuid,text) is 'Kavi-only atomic resolver for server-allowlisted maintained Info fact bindings.';
