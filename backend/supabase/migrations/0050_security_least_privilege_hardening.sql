-- Datakwest security hardening: remove accidental public object/function exposure.
-- This migration intentionally preserves explicit learner/admin RPC grants and RLS policies.

-- Trigger/event helpers are not API RPCs. They must not be callable through PostgREST.
revoke execute on function public._recompute_mastery_after_verified_attempt() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Remove inherited object privileges that are not required by PostgREST roles.
-- Explicit SELECT/INSERT/UPDATE grants already granted to authenticated remain intact.
revoke references, trigger, truncate on all tables in schema public from public;

-- Server-only governance, telemetry, budget, evaluation, and model tables must not be
-- directly accessible through the anonymous/authenticated PostgREST roles.
revoke all on table
  public.admin_access_reviews,
  public.admin_assignments,
  public.admin_audit_log,
  public.admin_role_permissions,
  public.ai_budget_counters,
  public.ai_contexts,
  public.ai_evaluation_cases,
  public.ai_evaluation_results,
  public.ai_evaluation_runs,
  public.ai_feature_limits,
  public.ai_runtime_events,
  public.audit_events,
  public.learner_feature_snapshots,
  public.ml_models,
  public.ml_training_runs,
  public.ml_inference_requests,
  public.ml_shadow_outcomes,
  public.universal_skill_generation_runs
from anon, authenticated;

-- Prevent future public-schema tables from inheriting the same broad privileges.
alter default privileges in schema public revoke references, trigger, truncate on tables from public;

comment on function public._recompute_mastery_after_verified_attempt() is
  'Internal trigger helper; API EXECUTE revoked by security hardening migration 0050.';
comment on function public.rls_auto_enable() is
  'Internal event-trigger helper; API EXECUTE revoked by security hardening migration 0050.';
comment on function public.handle_new_user() is
  'Internal auth trigger helper; API EXECUTE revoked by security hardening migration 0050.';
