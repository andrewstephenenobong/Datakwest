-- Query indexes for the learner-context and evidence flywheel.
-- These indexes support bounded, user-scoped reads made by the Tutor Orchestrator.

create index if not exists learner_interaction_events_learner_time_idx
  on public.learner_interaction_events(learner_id, created_at desc);

create index if not exists learner_evidence_learner_submitted_idx
  on public.learner_evidence(learner_id, submitted_at desc);

create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at desc);

create index if not exists skill_graph_node_sources_node_idx
  on public.skill_graph_node_sources(skill_graph_node_id);

comment on index public.learner_interaction_events_learner_time_idx is 'Supports recent learner-context retrieval for the Tutor Orchestrator.';
comment on index public.learner_evidence_learner_submitted_idx is 'Supports recent evidence retrieval for learner mastery context.';
comment on index public.messages_conversation_created_idx is 'Supports bounded conversation history retrieval for tutor context.';
