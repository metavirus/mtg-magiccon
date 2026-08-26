do $$
declare
  v_concept_key constant text := 'atlanta:magic-play:official-resources-available';
begin
  update public.monitoring_concepts
  set attention_state = 'archived',
      review_state = 'archived',
      updated_at = timezone('utc', now())
  where concept_key = v_concept_key;

  update public.monitoring_findings
  set status = 'archived',
      evidence = jsonb_set(
        jsonb_set(evidence, '{concept_resolution}', '"noise"'::jsonb, true),
        '{concept_rationale}',
        to_jsonb('Official resource-link discovery is evidence for maintained Info concepts, not a user-facing monitoring concept.'::text),
        true
      ),
      updated_at = timezone('utc', now())
  where evidence->'concept_keys' = jsonb_build_array(v_concept_key);
end
$$;
