-- Deterministic recommendation baseline.
-- The client may display this action but cannot set or override it.

create or replace function public.get_next_learning_action(
  p_enrolment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_enrolment public.learner_skill_enrolments;
  v_node public.skill_graph_nodes;
  v_mastery public.learner_node_mastery;
  v_state public.learner_skill_state;
  v_blocked_count integer := 0;
  v_action_type text;
  v_reason text;
  v_evidence_kind text;
  v_due boolean := false;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_enrolment
  from public.learner_skill_enrolments e
  where e.id = p_enrolment_id
    and e.learner_id = v_user_id
    and e.status = 'active';
  if v_enrolment.id is null then
    raise exception 'active_enrolment_not_found' using errcode = 'P0002';
  end if;

  select * into v_state
  from public.learner_skill_state s
  where s.learner_id = v_user_id
    and s.skill_graph_version_id = v_enrolment.skill_graph_version_id;

  with eligible_nodes as (
    select n.*
    from public.skill_graph_nodes n
    where n.skill_graph_version_id = v_enrolment.skill_graph_version_id
      and not exists (
        select 1
        from public.skill_graph_edges edge
        join public.skill_graph_nodes prerequisite on prerequisite.id = edge.from_node_id
        left join public.learner_node_mastery prerequisite_mastery
          on prerequisite_mastery.learner_id = v_user_id
         and prerequisite_mastery.skill_graph_version_id = v_enrolment.skill_graph_version_id
         and prerequisite_mastery.skill_graph_node_id = edge.from_node_id
        where edge.skill_graph_version_id = v_enrolment.skill_graph_version_id
          and edge.to_node_id = n.id
          and edge.edge_type = 'prerequisite'
          and coalesce(prerequisite_mastery.mastery_score, 0) < prerequisite.mastery_threshold
      )
  )
  select e.* into v_node
  from eligible_nodes e
  left join public.learner_node_mastery m
    on m.learner_id = v_user_id
   and m.skill_graph_version_id = v_enrolment.skill_graph_version_id
   and m.skill_graph_node_id = e.id
  where coalesce(m.mastery_score, 0) < e.mastery_threshold
     or (m.next_review_at is not null and m.next_review_at <= now())
  order by
    case when m.next_review_at is not null and m.next_review_at <= now() then 0 else 1 end,
    e.order_index,
    e.id
  limit 1;

  if v_node.id is null then
    select count(*)::integer into v_blocked_count
    from public.skill_graph_nodes n
    where n.skill_graph_version_id = v_enrolment.skill_graph_version_id
      and exists (
        select 1
        from public.skill_graph_edges edge
        join public.skill_graph_nodes prerequisite on prerequisite.id = edge.from_node_id
        left join public.learner_node_mastery prerequisite_mastery
          on prerequisite_mastery.learner_id = v_user_id
         and prerequisite_mastery.skill_graph_version_id = v_enrolment.skill_graph_version_id
         and prerequisite_mastery.skill_graph_node_id = edge.from_node_id
        where edge.skill_graph_version_id = v_enrolment.skill_graph_version_id
          and edge.to_node_id = n.id
          and edge.edge_type = 'prerequisite'
          and coalesce(prerequisite_mastery.mastery_score, 0) < prerequisite.mastery_threshold
      );

    if v_blocked_count > 0 then
      v_action_type := 'review_prerequisite';
      v_reason := 'all_available nodes are waiting for prerequisite evidence';
      v_evidence_kind := 'practice';
    else
      v_action_type := 'complete_path_reflection';
      v_reason := 'all currently published nodes meet the deterministic mastery threshold';
      v_evidence_kind := 'reflection';
    end if;

    update public.learner_skill_state
    set recommended_node_id = null,
        recommendation_reason = jsonb_build_object(
          'strategy', 'deterministic_baseline',
          'reason', v_reason,
          'action_type', v_action_type,
          'model_version', 'deterministic-baseline-v1'
        ),
        model_version = 'deterministic-baseline-v1',
        computed_at = now()
    where learner_id = v_user_id
      and skill_graph_version_id = v_enrolment.skill_graph_version_id;

    return jsonb_build_object(
      'enrolment_id', v_enrolment.id,
      'skill_graph_version_id', v_enrolment.skill_graph_version_id,
      'action_type', v_action_type,
      'title', initcap(replace(v_action_type, '_', ' ')),
      'instruction', v_reason,
      'evidence_kind', v_evidence_kind,
      'node_id', null,
      'node_key', null,
      'model_version', 'deterministic-baseline-v1'
    );
  end if;

  select * into v_mastery
  from public.learner_node_mastery m
  where m.learner_id = v_user_id
    and m.skill_graph_version_id = v_enrolment.skill_graph_version_id
    and m.skill_graph_node_id = v_node.id;

  v_due := v_mastery.next_review_at is not null and v_mastery.next_review_at <= now();
  v_action_type := case
    when v_due then 'review_misconception'
    when v_node.node_type in ('practice', 'assessment') then 'practice'
    when v_node.node_type = 'project' then 'submit_project'
    when v_node.node_type = 'reflection' then 'reflect'
    else 'continue_learning'
  end;
  v_reason := case
    when v_due then 'scheduled review is due based on the latest verified evidence'
    when coalesce(v_mastery.evidence_count, 0) = 0 then 'this node has not received verified evidence yet'
    else 'this node needs more verified evidence before it is considered mastered'
  end;
  v_evidence_kind := case when v_node.node_type = 'project' then 'project' when v_node.node_type = 'assessment' then 'quiz' else 'practice' end;

  update public.learner_skill_state
  set recommended_node_id = v_node.id,
      recommendation_reason = jsonb_build_object(
        'strategy', 'deterministic_baseline',
        'reason', v_reason,
        'action_type', v_action_type,
        'model_version', 'deterministic-baseline-v1'
      ),
      model_version = 'deterministic-baseline-v1',
      computed_at = now()
  where learner_id = v_user_id
    and skill_graph_version_id = v_enrolment.skill_graph_version_id;

  return jsonb_build_object(
    'enrolment_id', v_enrolment.id,
    'skill_graph_version_id', v_enrolment.skill_graph_version_id,
    'action_type', v_action_type,
    'title', v_node.title,
    'instruction', v_reason,
    'evidence_kind', v_evidence_kind,
    'node_id', v_node.id,
    'node_key', v_node.node_key,
    'node_type', v_node.node_type,
    'mastery_score', coalesce(v_mastery.mastery_score, 0),
    'confidence_score', coalesce(v_mastery.confidence_score, 0),
    'evidence_count', coalesce(v_mastery.evidence_count, 0),
    'model_version', 'deterministic-baseline-v1'
  );
end;
$$;

revoke all on function public.get_next_learning_action(uuid) from public;
grant execute on function public.get_next_learning_action(uuid) to authenticated;

comment on function public.get_next_learning_action(uuid) is 'Authenticated deterministic recommendation baseline. It reads server-computed mastery and graph prerequisites; clients cannot override its decision.';
