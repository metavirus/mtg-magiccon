-- Concrete Kavi-only A/B factual choices. The client selects only a key;
-- target, values, rollback, and labels are server-stored and validated here.

alter table public.monitoring_findings
  add column selected_choice_key text;

alter table public.monitoring_findings
  drop constraint monitoring_findings_status_allowed,
  drop constraint monitoring_findings_action_lifecycle_semantics;

alter table public.monitoring_findings
  add constraint monitoring_findings_status_allowed
    check (status in ('unread','read','archived','needs_review','deferred','authorized','staged','completed','dismissed')),
  add constraint monitoring_findings_selected_choice_nonblank
    check (selected_choice_key is null or btrim(selected_choice_key) <> ''),
  add constraint monitoring_findings_action_lifecycle_semantics check (
    (status in ('unread','read','archived') and decision is null and decided_by is null and decided_at is null and staged_at is null and action_type is null and action_payload is null and execution_status = 'not_started' and canonical_target is null and canonical_result is null and blocker is null and error_message is null and executed_at is null and deployment_evidence is null and verification_evidence is null and retry_count = 0 and rollback_payload is null and selected_choice_key is null)
    or (status in ('needs_review','deferred') and decision is null and decided_by is null and decided_at is null and staged_at is null and execution_status = 'not_started' and executed_at is null and selected_choice_key is null)
    or (status = 'dismissed' and decision = 'no' and decided_by is not null and decided_at is not null and staged_at is null and execution_status = 'not_started' and executed_at is null and selected_choice_key is null)
    or (status = 'staged' and decision = 'yes' and decided_by is not null and decided_at is not null and staged_at is not null and action_type is not null and action_payload is not null and execution_status = 'blocked' and nullif(btrim(blocker), '') is not null and executed_at is null)
    or (status = 'authorized' and decision = 'yes' and decided_by is not null and decided_at is not null and action_type is not null and action_payload is not null and rollback_payload is not null and execution_status in ('queued','executing','blocked','failed') and (execution_status <> 'blocked' or nullif(btrim(blocker), '') is not null) and (execution_status <> 'failed' or nullif(btrim(error_message), '') is not null) and executed_at is null)
    or (status = 'completed' and decision = 'yes' and decided_by is not null and decided_at is not null and action_type is not null and action_payload is not null and rollback_payload is not null and execution_status = 'completed' and canonical_target is not null and canonical_result is not null and executed_at is not null)
  );

comment on column public.monitoring_findings.selected_choice_key is
  'Server-validated key of the concrete factual option Kavi selected; null while unresolved or deferred.';

grant update (status, decision, decided_by, decided_at, staged_at, updated_at)
  on table public.monitoring_findings to authenticated;

drop policy kavi_manage_monitoring_finding_review_state on public.monitoring_findings;
create policy kavi_manage_monitoring_finding_review_state
  on public.monitoring_findings for update to authenticated
  using (exists (select 1 from public.companion_members where person_key='kavi' and active and user_id=(select auth.uid())))
  with check (
    exists (select 1 from public.companion_members where person_key='kavi' and active and user_id=(select auth.uid()))
    and (
      (status in ('unread','read','archived','needs_review','deferred') and decision is null)
      or (status in ('authorized','staged','completed') and decision='yes' and decided_by=(select auth.uid()))
      or (status='dismissed' and decision='no' and decided_by=(select auth.uid()))
    )
  );

create unique index user_activity_events_factual_choice_idempotency_idx
  on public.user_activity_events (owner_id, object_id, activity_type)
  where activity_type = 'monitoring_factual_choice_resolved';

create function public.resolve_monitoring_factual_choice(p_finding_id uuid, p_choice_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_finding public.monitoring_findings%rowtype;
  v_choice jsonb;
  v_topic public.info_topics%rowtype;
  v_prior text;
  v_value text;
  v_label text;
  v_activity_id uuid;
  v_section_index integer;
  v_fact_index integer;
  v_match_count integer;
  v_article jsonb;
  v_now timestamptz := timezone('utc', now());
begin
  if v_owner_id is null or not exists (select 1 from public.companion_members where person_key='kavi' and active and user_id=v_owner_id) then
    raise exception 'Only active Kavi may resolve factual choices.' using errcode='42501';
  end if;
  if nullif(btrim(p_choice_key), '') is null then raise exception 'Choice key is required.' using errcode='22023'; end if;

  select * into v_finding from public.monitoring_findings where id=p_finding_id for update;
  if not found then raise exception 'Monitoring finding is unavailable.' using errcode='P0002'; end if;
  if v_finding.status='completed' and v_finding.execution_status='completed' and v_finding.selected_choice_key=p_choice_key then
    return jsonb_build_object('status','completed','choice_key',v_finding.selected_choice_key,'canonical_result',v_finding.canonical_result,'idempotent_replay',true);
  end if;
  if v_finding.status not in ('needs_review','deferred') or v_finding.decision is not null then raise exception 'Finding is not awaiting a factual choice.' using errcode='23514'; end if;
  if v_finding.action_type <> 'resolve_info_topic_article_fact_conflict'
     or v_finding.action_payload->>'target_kind' <> 'info_topic_article_fact'
     or v_finding.action_payload->>'topic_key' <> 'on-demand-play'
     or v_finding.action_payload->>'section_key' <> 'registration-hours'
     or v_finding.action_payload->>'fact_label' <> 'Constructed & Draft · Sun'
     or jsonb_typeof(v_finding.action_payload->'choice_options') <> 'array'
     or jsonb_array_length(v_finding.action_payload->'choice_options') <> 2
     or v_finding.rollback_payload->>'operation' <> 'restore_info_topic_article_fact'
  then raise exception 'Finding does not contain the exact factual-choice mapping.' using errcode='23514'; end if;

  select value into v_choice from jsonb_array_elements(v_finding.action_payload->'choice_options') where value->>'choice_key'=p_choice_key;
  if v_choice is null then raise exception 'Choice is not one of the server-stored options.' using errcode='22023'; end if;
  v_value := nullif(btrim(v_choice->>'value'), ''); v_label := nullif(btrim(v_choice->>'label'), '');
  if v_value is null or v_label is null then raise exception 'Stored choice is incomplete.' using errcode='23514'; end if;

  select * into v_topic from public.info_topics where topic_key=v_finding.action_payload->>'topic_key' for update;
  if not found then raise exception 'Bound Info topic is unavailable.' using errcode='P0002'; end if;
  select count(*), min((section_ordinality - 1)::integer), min((fact_ordinality - 1)::integer)
    into v_match_count, v_section_index, v_fact_index
  from jsonb_array_elements(v_topic.article->'sections') with ordinality as section_row(section_value, section_ordinality)
  cross join lateral jsonb_array_elements(section_row.section_value->'facts') with ordinality as fact_row(fact_value, fact_ordinality)
  where section_row.section_value->>'key'=v_finding.action_payload->>'section_key'
    and fact_row.fact_value->>'label'=v_finding.action_payload->>'fact_label';
  if v_match_count <> 1 then raise exception 'Bound article fact path is missing or ambiguous.' using errcode='23514'; end if;
  v_prior := v_topic.article #>> array['sections',v_section_index::text,'facts',v_fact_index::text,'value'];
  if v_finding.rollback_payload->>'topic_key' <> v_topic.topic_key
     or v_finding.rollback_payload->>'section_key' <> v_finding.action_payload->>'section_key'
     or v_finding.rollback_payload->>'fact_label' <> v_finding.action_payload->>'fact_label'
     or v_finding.rollback_payload->>'value' <> v_prior then
    raise exception 'Canonical value changed since this choice was prepared.' using errcode='40001';
  end if;

  v_article := jsonb_set(v_topic.article, array['sections',v_section_index::text,'facts',v_fact_index::text,'value'], to_jsonb(v_value), false);
  update public.info_topics set article=v_article, updated_at=v_now where topic_key=v_topic.topic_key;
  insert into public.user_activity_events(owner_id,actor_label,object_id,object_kind,activity_type,summary,details,created_at)
  values(v_owner_id,'Kavi','monitoring-choice:'||v_finding.fingerprint,'info','monitoring_factual_choice_resolved',
    left(v_finding.title||': '||v_label,280), jsonb_build_object('destination','Info','topic_key',v_topic.topic_key,'section_key',v_finding.action_payload->>'section_key','fact_label',v_finding.action_payload->>'fact_label','choice_key',p_choice_key,'choice_label',v_label,'prior_value',v_prior,'current_value',v_value,'finding_id',v_finding.id),v_now)
  on conflict (owner_id,object_id,activity_type) where activity_type='monitoring_factual_choice_resolved'
  do update set details=public.user_activity_events.details returning id into v_activity_id;

  update public.monitoring_findings set status='completed',decision='yes',decided_by=v_owner_id,decided_at=v_now,staged_at=null,
    execution_status='completed',selected_choice_key=p_choice_key,
    canonical_target=jsonb_build_object('kind','info_topic_article_fact','topic_key',v_topic.topic_key,'section_key',v_finding.action_payload->>'section_key','fact_label',v_finding.action_payload->>'fact_label'),
    canonical_result=jsonb_build_object('topic_key',v_topic.topic_key,'section_key',v_finding.action_payload->>'section_key','fact_label',v_finding.action_payload->>'fact_label','prior_value',v_prior,'current_value',v_value,'activity_event_id',v_activity_id),
    blocker=null,error_message=null,executed_at=v_now,verification_evidence=jsonb_build_object('activity_event_id',v_activity_id,'readback_value',v_value),updated_at=v_now
  where id=v_finding.id returning * into v_finding;
  return jsonb_build_object('status','completed','choice_key',p_choice_key,'canonical_result',v_finding.canonical_result,'idempotent_replay',false);
end;
$$;

revoke all on function public.resolve_monitoring_factual_choice(uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_monitoring_factual_choice(uuid,text) to authenticated;
comment on function public.resolve_monitoring_factual_choice(uuid,text) is
  'Kavi-only atomic resolver for the exact allowlisted Constructed & Draft Sunday fact inside the maintained On-Demand article.';
