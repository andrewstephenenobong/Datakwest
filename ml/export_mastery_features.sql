-- Export contract for the first mastery shadow model.
-- Run this query with an operator-controlled cutoff and join it to a later,
-- verified mastery outcome. Never use current mastery as a same-time target.
select
  fs.learner_id,
  fs.id as feature_snapshot_id,
  fs.snapshot_at,
  fs.feature_set_version,
  (fs.features ->> 'verified_evidence_count')::numeric as feature_verified_evidence_count,
  (fs.features ->> 'verified_node_count')::numeric as feature_verified_node_count,
  (fs.features ->> 'recent_accuracy')::numeric as feature_recent_accuracy,
  (fs.features ->> 'review_due_count')::numeric as feature_review_due_count,
  (fs.features ->> 'practice_streak_days')::numeric as feature_practice_streak_days,
  target.mastery_score as target_mastery_30d,
  target.observed_at as target_observed_at
from public.learner_feature_snapshots fs
join lateral (
  select
    mp.mastery_score,
    mp.updated_at as observed_at
  from public.learner_mastery_projections mp
  where mp.learner_id = fs.learner_id
    and mp.skill_graph_node_id = fs.skill_graph_node_id
    and mp.updated_at >= fs.snapshot_at + interval '30 days'
  order by mp.updated_at asc
  limit 1
) target on true
where fs.snapshot_at < now() - interval '30 days'
order by fs.snapshot_at asc
limit 100000;
