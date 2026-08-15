import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const foundation = await readFile('backend/supabase/migrations/0002_blueprint_mvp_foundation.sql', 'utf8')
const missions = await readFile('backend/supabase/migrations/0003_daily_mission_progress.sql', 'utf8')
const readiness = await readFile('backend/supabase/migrations/0004_readiness_scoring.sql', 'utf8')
const missionClient = await readFile('src/lib/missions.js', 'utf8')
const readinessClient = await readFile('src/lib/readiness.js', 'utf8')
const projects = await readFile('backend/supabase/migrations/0005_project_submission_workflow.sql', 'utf8')
const projectClient = await readFile('src/lib/projects.js', 'utf8')
const tutorFunction = await readFile('backend/supabase/functions/tutor-chat.ts', 'utf8')
const tutorClient = await readFile('src/lib/tutor.js', 'utf8')
const portfolioClient = await readFile('src/lib/portfolio.js', 'utf8')
const achievements = await readFile('backend/supabase/migrations/0006_achievements.sql', 'utf8')
const achievementsClient = await readFile('src/lib/achievements.js', 'utf8')
const notifications = await readFile('backend/supabase/migrations/0007_notifications.sql', 'utf8')
const notificationsClient = await readFile('src/lib/notifications.js', 'utf8')
const skillTree = await readFile('backend/supabase/migrations/0008_skill_tree.sql', 'utf8')
const skillTreeClient = await readFile('src/lib/skillTree.js', 'utf8')
const assessments = await readFile('backend/supabase/migrations/0009_assessment_center.sql', 'utf8')
const assessmentsClient = await readFile('src/lib/assessments.js', 'utf8')
const challenges = await readFile('backend/supabase/migrations/0010_challenge_center.sql', 'utf8')
const challengeParticipation = await readFile('backend/supabase/migrations/0011_challenge_participation.sql', 'utf8')
const practiceEngine = await readFile('backend/supabase/migrations/0012_practice_engine.sql', 'utf8')
const practiceClient = await readFile('src/lib/practice.js', 'utf8')
const communityHub = await readFile('backend/supabase/migrations/0013_community_hub.sql', 'utf8')
const communityClient = await readFile('src/lib/community.js', 'utf8')
const communityDiscussions = await readFile('backend/supabase/migrations/0014_community_discussions.sql', 'utf8')
const peerReview = await readFile('backend/supabase/migrations/0015_peer_review.sql', 'utf8')
const peerReviewClient = await readFile('src/lib/peerReview.js', 'utf8')
const skillBattles = await readFile('backend/supabase/migrations/0016_skill_battles.sql', 'utf8')
const skillBattlesClient = await readFile('src/lib/skillBattles.js', 'utf8')
const marketplace = await readFile('backend/supabase/migrations/0017_marketplace.sql', 'utf8')
const marketplaceClient = await readFile('src/lib/marketplace.js', 'utf8')
const richerLiveChallenges = await readFile('backend/supabase/migrations/0018_richer_live_challenges.sql', 'utf8')
const liveChallengesClient = await readFile('src/lib/liveChallenges.js', 'utf8')
const challengesClient = await readFile('src/lib/challenges.js', 'utf8')
const platformGovernance = await readFile('backend/supabase/migrations/0019_platform_governance.sql', 'utf8')
const interviewSimulator = await readFile('backend/supabase/migrations/0020_interview_simulator.sql', 'utf8')
const interviewEvaluator = await readFile('backend/supabase/migrations/0021_interview_evaluator.sql', 'utf8')
const interviewEvaluatorWorker = await readFile('backend/supabase/migrations/0022_interview_evaluator_worker.sql', 'utf8')
const interviewEvaluatorFunction = await readFile('backend/supabase/functions/evaluate-interview.ts', 'utf8')
const interviewClient = await readFile('src/lib/interviews.js', 'utf8')
const interviewsPage = await readFile('src/pages/Interviews.jsx', 'utf8')
const adminGovernanceClient = await readFile('src/lib/adminGovernance.js', 'utf8')
const adminGovernancePage = await readFile('src/pages/AdminGovernance.jsx', 'utf8')
const app = await readFile('src/App.jsx', 'utf8')
const landingPage = await readFile('src/pages/Landing.jsx', 'utf8')
const onboardingPage = await readFile('src/pages/Onboarding.jsx', 'utf8')
const loginPage = await readFile('src/pages/Login.jsx', 'utf8')
const signupPage = await readFile('src/pages/Signup.jsx', 'utf8')
const passwordField = await readFile('src/components/PasswordField.jsx', 'utf8')
const publicAiMigration = await readFile('backend/supabase/migrations/0023_public_ai_preview.sql', 'utf8')
const publicAiTenMessageMigration = await readFile('backend/supabase/migrations/0025_public_ai_preview_ten_messages.sql', 'utf8')
const publicAiFunction = await readFile('backend/supabase/functions/public-ai-preview.ts', 'utf8')
const publicAiClient = await readFile('src/lib/publicAi.js', 'utf8')
const careerCentreMigration = await readFile('backend/supabase/migrations/0024_career_centre.sql', 'utf8')
const careerCentreClient = await readFile('src/lib/careerCentre.js', 'utf8')
const careerCentrePage = await readFile('src/pages/CareerCentre.jsx', 'utf8')
const profileIdentityMigration = await readFile('backend/supabase/migrations/0026_profile_identity.sql', 'utf8')
const recoveryState = await readFile('src/components/RecoveryState.jsx', 'utf8')
const errorBoundary = await readFile('src/components/ErrorBoundary.jsx', 'utf8')
const appSource = await readFile('src/App.jsx', 'utf8')
const vercelConfig = await readFile('vercel.json', 'utf8')

const requiredFoundationTables = [
  'career_paths',
  'skills',
  'concept_nodes',
  'content_lessons',
  'exercises',
  'assessments',
  'attempts',
  'missions',
  'projects',
  'submissions',
  'reviews',
  'portfolios',
  'certificates',
  'conversations',
  'messages',
  'readiness_snapshots',
  'analytics_events',
]

test('foundation migration declares required blueprint entities', () => {
  for (const table of requiredFoundationTables) {
    assert.match(foundation, new RegExp(`create table if not exists public\\.${table}\\b`), `missing table: ${table}`)
  }
  assert.match(foundation, /alter table public\./)
  assert.match(foundation, /enable row level security/)
})

test('daily mission completion is server-authoritative', () => {
  assert.match(missions, /create or replace function public\.complete_daily_mission/i)
  assert.match(missions, /security definer/i)
  assert.match(missions, /auth\.uid\(\)/i)
  assert.match(missions, /for update/i)
  assert.match(missions, /insert into public\.xp_events/i)
  assert.match(missions, /insert into public\.streaks/i)
  assert.match(missions, /grant execute on function public\.complete_daily_mission\(uuid\) to authenticated/i)
  assert.doesNotMatch(missions, /create policy[\s\S]*for update[\s\S]*on public\.missions/i)
})

test('daily mission client uses the protected RPC', () => {
  assert.match(missionClient, /from\('missions'\)/)
  assert.match(missionClient, /rpc\('complete_daily_mission'/)
  assert.doesNotMatch(missionClient, /from\('xp_events'\)/)
  assert.doesNotMatch(missionClient, /from\('streaks'\)/)
})

test('readiness scoring is derived server-side from learner evidence', () => {
  assert.match(readiness, /create or replace function public\.get_readiness_score/i)
  assert.match(readiness, /security definer/i)
  assert.match(readiness, /auth\.uid\(\)/i)
  assert.match(readiness, /from public\.attempts/i)
  assert.match(readiness, /from public\.missions/i)
  assert.match(readiness, /from public\.submissions/i)
  assert.match(readiness, /grant execute on function public\.get_readiness_score\(\) to authenticated/i)
})

test('readiness client does not accept a client-supplied score', () => {
  assert.match(readinessClient, /rpc\('get_readiness_score'\)/)
  assert.doesNotMatch(readinessClient, /score:/)
})

test('project submission workflow controls status transitions server-side', () => {
  assert.match(projects, /create or replace function public\.submit_project_evidence/i)
  assert.match(projects, /security definer/i)
  assert.match(projects, /auth\.uid\(\)/i)
  assert.match(projects, /status = 'published'/i)
  assert.match(projects, /status = 'submitted'/i)
  assert.match(projects, /grant execute on function public\.submit_project_evidence\(uuid, jsonb, text\) to authenticated/i)
  assert.doesNotMatch(projects, /create policy[\s\S]*for update[\s\S]*on public\.submissions/i)
})

test('project client submits evidence through the protected RPC', () => {
  assert.match(projectClient, /from\('projects'\)/)
  assert.match(projectClient, /rpc\('submit_project_evidence'/)
  assert.doesNotMatch(projectClient, /from\('submissions'\)/)
})

test('Tutor AI function enforces authenticated, bounded, usage-limited requests', () => {
  assert.match(tutorFunction, /auth\.getUser\(\)/)
  assert.match(tutorFunction, /MAX_MESSAGE_LENGTH = 4000/)
  assert.match(tutorFunction, /DAILY_LIMIT = 60/)
  assert.match(tutorFunction, /ai_usage/)
  assert.match(tutorFunction, /GEMINI_API_KEY/)
  assert.match(tutorFunction, /conversation_id/)
  assert.match(tutorFunction, /role: 'assistant'/)
  assert.doesNotMatch(tutorFunction, /console\.log\(/)
  assert.doesNotMatch(tutorFunction, /Access-Control-Allow-Origin': '\*'/)
})

test('Tutor client sends only user-safe request data', () => {
  assert.match(tutorClient, /functions\.invoke\('tutor-chat'/)
  assert.doesNotMatch(tutorClient, /GEMINI_API_KEY|SERVICE_ROLE|apiKey/i)
})

test('portfolio client reads learner-owned evidence without mutation paths', () => {
  assert.match(portfolioClient, /from\('submissions'\)/)
  assert.match(portfolioClient, /eq\('user_id', userId\)/)
  assert.doesNotMatch(portfolioClient, /insert\(|update\(|delete\(/)
})

test('achievements are awarded from server-verified evidence', () => {
  assert.match(achievements, /create or replace function public\.get_learner_achievements/i)
  assert.match(achievements, /security definer/i)
  assert.match(achievements, /auth\.uid\(\)/i)
  assert.match(achievements, /insert into public\.user_badges/i)
  assert.match(achievements, /on conflict \(user_id, badge_id\) do nothing/i)
  assert.match(achievements, /grant execute on function public\.get_learner_achievements\(\) to authenticated/i)
})

test('achievements client uses the protected RPC', () => {
  assert.match(achievementsClient, /rpc\('get_learner_achievements'\)/)
  assert.doesNotMatch(achievementsClient, /from\('user_badges'\)/)
})

test('notification read state is protected and owner-scoped', () => {
  assert.match(notifications, /create or replace function public\.mark_notification_read/i)
  assert.match(notifications, /security definer/i)
  assert.match(notifications, /auth\.uid\(\)/i)
  assert.match(notifications, /user_id = v_user_id/i)
  assert.match(notifications, /grant execute on function public\.mark_notification_read\(uuid\) to authenticated/i)
  assert.doesNotMatch(notifications, /create policy[\s\S]*for update[\s\S]*on public\.notifications/i)
})

test('notifications client reads own items and marks them through the RPC', () => {
  assert.match(notificationsClient, /from\('notifications'\)/)
  assert.match(notificationsClient, /eq\('user_id', userId\)/)
  assert.match(notificationsClient, /rpc\('mark_notification_read'/)
  assert.doesNotMatch(notificationsClient, /update\('notifications'\)/)
})

test('skill tree is published-only and authenticated', () => {
  assert.match(skillTree, /create or replace function public\.get_learner_skill_tree/i)
  assert.match(skillTree, /auth\.uid\(\)/i)
  assert.match(skillTree, /cp\.status = 'published'/i)
  assert.match(skillTree, /cl\.status = 'published'/i)
  assert.match(skillTree, /grant execute on function public\.get_learner_skill_tree\(text\) to authenticated/i)
})

test('skill tree client uses the protected read RPC', () => {
  assert.match(skillTreeClient, /rpc\('get_learner_skill_tree'/)
  assert.doesNotMatch(skillTreeClient, /insert\(|update\(|delete\(/)
})

test('assessment center is authenticated and returns published availability plus own history', () => {
  assert.match(assessments, /create or replace function public\.get_assessment_center/i)
  assert.match(assessments, /security definer/i)
  assert.match(assessments, /auth\.uid\(\)/i)
  assert.match(assessments, /a\.user_id = v_user_id/i)
  assert.match(assessments, /ass\.status = 'published'/i)
  assert.match(assessments, /grant execute on function public\.get_assessment_center\(\) to authenticated/i)
  assert.match(assessments, /attempts_user_assessment_created_idx/i)
})

test('assessment client reads through the protected RPC', () => {
  assert.match(assessmentsClient, /rpc\('get_assessment_center'/)
  assert.doesNotMatch(assessmentsClient, /insert\(|update\(|delete\(/)
})

test('challenge center is authenticated and exposes only active or scheduled challenges', () => {
  assert.match(challenges, /create or replace function public\.get_challenge_center/i)
  assert.match(challenges, /security definer/i)
  assert.match(challenges, /auth\.uid\(\)/i)
  assert.match(challenges, /status in \('active', 'scheduled'\)/i)
  assert.match(challenges, /ends_at IS NULL OR c\.ends_at >= now\(\)/i)
  assert.match(challenges, /grant execute on function public\.get_challenge_center\(\) to authenticated/i)
  assert.match(challenges, /challenges_status_schedule_idx/i)
})

test('challenge client reads and enrolls through protected RPCs', () => {
  assert.match(challengesClient, /rpc\('get_challenge_center'/)
  assert.match(challengesClient, /rpc\('join_challenge'/)
  assert.doesNotMatch(challengesClient, /from\('challenge_participants'\)/)
})

test('challenge participation is owner-scoped and server-authoritative', () => {
  assert.match(challengeParticipation, /create table if not exists public\.challenge_participants/i)
  assert.match(challengeParticipation, /auth\.uid\(\)/i)
  assert.match(challengeParticipation, /create or replace function public\.join_challenge\(p_challenge_id uuid\)/i)
  assert.match(challengeParticipation, /status in \('active', 'scheduled'\)/i)
  assert.match(challengeParticipation, /on conflict \(challenge_id, user_id\)/i)
  assert.match(challengeParticipation, /grant execute on function public\.join_challenge\(uuid\) to authenticated/i)
  assert.doesNotMatch(challengeParticipation, /create policy[\s\S]*for insert[\s\S]*challenge_participants/i)
})

test('practice engine creates protected sessions and selects learner-safe items', () => {
  assert.match(practiceEngine, /create table if not exists public\.practice_sessions/i)
  assert.match(practiceEngine, /create table if not exists public\.practice_session_items/i)
  assert.match(practiceEngine, /create or replace function public\.start_practice_session/i)
  assert.match(practiceEngine, /auth\.uid\(\)/i)
  assert.match(practiceEngine, /'prompt', pi\.prompt/i)
  assert.match(practiceEngine, /'metadata', pi\.metadata/i)
  assert.doesNotMatch(practiceEngine, /'answer', pi\.answer/i)
  assert.match(practiceEngine, /grant execute on function public\.start_practice_session\(uuid, text, integer, integer\) to authenticated/i)
})

test('practice answer submission scores server-side and prevents duplicate answers', () => {
  assert.match(practiceEngine, /create or replace function public\.submit_practice_answer/i)
  assert.match(practiceEngine, /v_expected := v_item\.answer/i)
  assert.match(practiceEngine, /v_correct boolean/i)
  assert.match(practiceEngine, /insert into public\.attempts/i)
  assert.match(practiceEngine, /practice_item_already_answered/i)
  assert.match(practiceEngine, /update public\.practice_session_items/i)
  assert.match(practiceEngine, /grant execute on function public\.submit_practice_answer\(uuid, uuid, jsonb, integer\) to authenticated/i)
  assert.doesNotMatch(practiceEngine, /create policy[\s\S]*for insert[\s\S]*practice_session_items/i)
})

test('practice history is authenticated, bounded, and learner-scoped', () => {
  assert.match(practiceEngine, /create or replace function public\.get_practice_history/i)
  assert.match(practiceEngine, /user_id = v_user_id AND practice_item_id IS NOT NULL/i)
  assert.match(practiceEngine, /p_limit < 1 OR p_limit > 100/i)
  assert.match(practiceEngine, /grant execute on function public\.get_practice_history\(integer\) to authenticated/i)
})

test('practice client uses protected RPCs for session, answers, and history', () => {
  assert.match(practiceClient, /rpc\('start_practice_session'/)
  assert.match(practiceClient, /rpc\('submit_practice_answer'/)
  assert.match(practiceClient, /rpc\('get_practice_history'/)
  assert.doesNotMatch(practiceClient, /from\('practice_items'\)/)
  assert.doesNotMatch(practiceClient, /from\('attempts'\)/)
})

test('community hub is authenticated, published-only, and membership is server-authoritative', () => {
  assert.match(communityHub, /create table if not exists public\.community_memberships/i)
  assert.match(communityHub, /create or replace function public\.get_community_hub/i)
  assert.match(communityHub, /create or replace function public\.join_community/i)
  assert.match(communityHub, /create or replace function public\.leave_community/i)
  assert.match(communityHub, /auth\.uid\(\)/i)
  assert.match(communityHub, /status = 'active'/i)
  assert.match(communityHub, /visibility in \('public', 'organisation'\)/i)
  assert.match(communityHub, /grant execute on function public\.join_community\(uuid\) to authenticated/i)
  assert.match(communityHub, /grant execute on function public\.leave_community\(uuid\) to authenticated/i)
  assert.doesNotMatch(communityHub, /create policy[\s\S]*for insert[\s\S]*community_memberships/i)
})

test('community client uses protected discovery, membership, feed, post, and report RPCs', () => {
  assert.match(communityClient, /rpc\('get_community_hub'/)
  assert.match(communityClient, /rpc\('join_community'/)
  assert.match(communityClient, /rpc\('leave_community'/)
  assert.match(communityClient, /rpc\('get_community_feed'/)
  assert.match(communityClient, /rpc\('create_community_post'/)
  assert.match(communityClient, /rpc\('create_moderation_report'/)
  assert.doesNotMatch(communityClient, /from\('community_memberships'\)/)
  assert.doesNotMatch(communityClient, /from\('community_posts'\)/)
})

test('community discussions are moderated, membership-gated, and server-authoritative', () => {
  assert.match(communityDiscussions, /create table if not exists public\.community_posts/i)
  assert.match(communityDiscussions, /create table if not exists public\.community_reports/i)
  assert.match(communityDiscussions, /create or replace function public\.get_community_feed/i)
  assert.match(communityDiscussions, /create or replace function public\.create_community_post/i)
  assert.match(communityDiscussions, /create or replace function public\.report_community_post/i)
  assert.match(communityDiscussions, /membership_required/i)
  assert.match(communityDiscussions, /p_limit < 1 OR p_limit > 50/i)
  assert.match(communityDiscussions, /grant execute on function public\.create_community_post\(uuid, text\) to authenticated/i)
  assert.match(communityDiscussions, /grant execute on function public\.report_community_post\(uuid, text, text\) to authenticated/i)
  assert.doesNotMatch(communityDiscussions, /create policy[\s\S]*for insert[\s\S]*community_posts/i)
  assert.doesNotMatch(communityDiscussions, /create policy[\s\S]*for insert[\s\S]*community_reports/i)
})

test('peer review is private, reviewer-scoped, and server-authoritative', () => {
  assert.match(peerReview, /create table if not exists public\.peer_review_requests/i)
  assert.match(peerReview, /create or replace function public\.create_peer_review_request/i)
  assert.match(peerReview, /create or replace function public\.get_peer_review_workspace/i)
  assert.match(peerReview, /create or replace function public\.accept_peer_review/i)
  assert.match(peerReview, /create or replace function public\.submit_peer_review/i)
  assert.match(peerReview, /reviewer_id = v_user_id/i)
  assert.match(peerReview, /p_score < 0 OR p_score > 100/i)
  assert.match(peerReview, /insert into public\.reviews/i)
  assert.match(peerReview, /grant execute on function public\.submit_peer_review\(uuid, numeric, jsonb\) to authenticated/i)
  assert.doesNotMatch(peerReview, /create policy[\s\S]*for insert[\s\S]*peer_review_requests/i)
})

test('peer review client uses protected workspace and submission RPCs', () => {
  assert.match(peerReviewClient, /rpc\('get_peer_review_workspace'/)
  assert.match(peerReviewClient, /rpc\('accept_peer_review'/)
  assert.match(peerReviewClient, /rpc\('submit_peer_review'/)
  assert.doesNotMatch(peerReviewClient, /from\('peer_review_requests'\)/)
  assert.doesNotMatch(peerReviewClient, /from\('reviews'\)/)
})

test('skill battles are enrollment-gated and leaderboard scores are server-derived', () => {
  assert.match(skillBattles, /add column if not exists challenge_id uuid/i)
  assert.match(skillBattles, /create or replace function public\.get_skill_battle_lobby/i)
  assert.match(skillBattles, /create or replace function public\.start_skill_battle/i)
  assert.match(skillBattles, /create or replace function public\.get_skill_battle_leaderboard/i)
  assert.match(skillBattles, /challenge_type = 'battle'/i)
  assert.match(skillBattles, /battle_enrollment_required/i)
  assert.match(skillBattles, /public\.start_practice_session/i)
  assert.match(skillBattles, /sum\(a\.score\)/i)
  assert.match(skillBattles, /row_number\(\) over/i)
  assert.match(skillBattles, /grant execute on function public\.start_skill_battle\(uuid, uuid, integer, integer\) to authenticated/i)
  assert.doesNotMatch(skillBattles, /create policy[\s\S]*for insert[\s\S]*practice_sessions/i)
})

test('skill battles client uses protected lobby, session, answer, and leaderboard RPCs', () => {
  assert.match(skillBattlesClient, /rpc\('get_skill_battle_lobby'/)
  assert.match(skillBattlesClient, /rpc\('start_skill_battle'/)
  assert.match(skillBattlesClient, /rpc\('submit_practice_answer'/)
  assert.match(skillBattlesClient, /rpc\('get_skill_battle_leaderboard'/)
  assert.doesNotMatch(skillBattlesClient, /from\('challenge_participants'\)/)
  assert.doesNotMatch(skillBattlesClient, /from\('attempts'\)/)
})

test('marketplace is published-only, learner-owned, and RPC-mutation-only', () => {
  assert.match(marketplace, /create or replace function public\.get_marketplace/i)
  assert.match(marketplace, /create or replace function public\.get_my_applications/i)
  assert.match(marketplace, /create or replace function public\.apply_to_opportunity/i)
  assert.match(marketplace, /create or replace function public\.withdraw_application/i)
  assert.match(marketplace, /status = 'published'/i)
  assert.match(marketplace, /auth\.uid\(\)/i)
  assert.match(marketplace, /invalid_application_evidence/i)
  assert.match(marketplace, /grant execute on function public\.apply_to_opportunity\(uuid, jsonb\) to authenticated/i)
  assert.doesNotMatch(marketplace, /create policy[\s\S]*for insert[\s\S]*applications/i)
})

test('marketplace client uses protected listing and application RPCs', () => {
  assert.match(marketplaceClient, /rpc\('get_marketplace'/)
  assert.match(marketplaceClient, /rpc\('get_my_applications'/)
  assert.match(marketplaceClient, /rpc\('apply_to_opportunity'/)
  assert.match(marketplaceClient, /rpc\('withdraw_application'/)
  assert.doesNotMatch(marketplaceClient, /from\('opportunities'\)/)
  assert.doesNotMatch(marketplaceClient, /from\('applications'\)/)
})

test('richer live challenges are timed, private, scored, and dispute-capable', () => {
  assert.match(richerLiveChallenges, /create table if not exists public\.challenge_rounds/i)
  assert.match(richerLiveChallenges, /answer_key jsonb/i)
  assert.match(richerLiveChallenges, /create table if not exists public\.challenge_round_sessions/i)
  assert.match(richerLiveChallenges, /create table if not exists public\.challenge_checkpoint_submissions/i)
  assert.match(richerLiveChallenges, /create table if not exists public\.challenge_score_disputes/i)
  assert.match(richerLiveChallenges, /create or replace function public\.get_live_challenge_workspace/i)
  assert.match(richerLiveChallenges, /create or replace function public\.start_live_challenge_round/i)
  assert.match(richerLiveChallenges, /create or replace function public\.submit_live_challenge_round/i)
  assert.match(richerLiveChallenges, /create or replace function public\.get_live_challenge_leaderboard/i)
  assert.match(richerLiveChallenges, /create or replace function public\.report_live_challenge_score/i)
  assert.match(richerLiveChallenges, /challenge_enrollment_required/i)
  assert.match(richerLiveChallenges, /now\(\) between r\.starts_at and r\.ends_at/i)
  assert.match(richerLiveChallenges, /answer_key/i)
  assert.match(richerLiveChallenges, /row_number\(\) over/i)
  assert.match(richerLiveChallenges, /grant execute on function public\.submit_live_challenge_round\(uuid, jsonb\) to authenticated/i)
  assert.doesNotMatch(richerLiveChallenges, /create policy[\s\S]*for insert[\s\S]*challenge_round_sessions/i)
})

test('live challenges client uses protected workspace, round, leaderboard, and dispute RPCs', () => {
  assert.match(liveChallengesClient, /rpc\('get_live_challenge_workspace'/)
  assert.match(liveChallengesClient, /rpc\('start_live_challenge_round'/)
  assert.match(liveChallengesClient, /rpc\('submit_live_challenge_round'/)
  assert.match(liveChallengesClient, /rpc\('get_live_challenge_leaderboard'/)
  assert.match(liveChallengesClient, /rpc\('report_live_challenge_score'/)
  assert.doesNotMatch(liveChallengesClient, /from\('challenge_round_sessions'\)/)
  assert.doesNotMatch(liveChallengesClient, /from\('challenge_checkpoint_submissions'\)/)
})

test('interview simulator client and route use protected RPCs', () => {
  assert.match(interviewClient, /rpc\('get_interview_workspace'/)
  assert.match(interviewClient, /rpc\('start_interview_session'/)
  assert.match(interviewClient, /rpc\('submit_interview_response'/)
  assert.match(interviewClient, /rpc\('submit_interview_session'/)
  assert.match(interviewClient, /functions\.invoke\('evaluate-interview'/)
  assert.doesNotMatch(interviewClient, /from\(['"]interview_(sessions|responses|templates)/)
  assert.match(interviewsPage, /getInterviewWorkspace/)
  assert.match(interviewsPage, /startInterviewSession/)
  assert.match(interviewsPage, /submitInterviewResponse/)
  assert.match(interviewsPage, /submitInterviewSession/)
  assert.match(interviewsPage, /evaluateInterview/)
  assert.match(interviewsPage, /getInterviewEvaluation/)
  assert.match(interviewsPage, /selectedLocale/)
  assert.match(interviewsPage, /evidence_fresh_until/)
  assert.match(app, /path="\/interviews" element={<Protected><Interviews \/><\/Protected>}/)
})

test('interview simulator is private, versioned, and server-authoritative', () => {
  for (const table of ['interview_templates', 'interview_sessions', 'interview_responses']) {
    assert.match(interviewSimulator, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'), `missing interview table: ${table}`)
  }
  for (const rpc of ['get_interview_workspace', 'start_interview_session', 'submit_interview_response', 'submit_interview_session']) {
    assert.match(interviewSimulator, new RegExp(`create or replace function public\\.${rpc}`, 'i'), `missing interview RPC: ${rpc}`)
    assert.match(interviewSimulator, new RegExp(`grant execute on function public\\.${rpc}`, 'i'))
  }
  assert.match(interviewSimulator, /security definer/i)
  assert.match(interviewSimulator, /set search_path = public/i)
  assert.match(interviewSimulator, /auth\.uid\(\)/i)
  assert.match(interviewSimulator, /evaluation_status text not null default 'pending'/i)
  assert.match(interviewSimulator, /total_score numeric\(5,2\)/i)
  assert.match(interviewSimulator, /prompt_snapshot jsonb/i)
  assert.match(interviewSimulator, /status = 'published'/i)
  assert.match(interviewSimulator, /revoke all on table public\.interview_sessions from anon, authenticated/i)
  assert.match(interviewSimulator, /revoke all on table public\.interview_responses from anon, authenticated/i)
  assert.doesNotMatch(interviewSimulator, /create policy[\\s\\S]*for insert[\\s\\S]*interview_sessions/i)
  assert.doesNotMatch(interviewSimulator, /create policy[\\s\\S]*for insert[\\s\\S]*interview_responses/i)
})
test('interview evaluator is versioned, privileged, multilingual-ready, and freshness-aware', () => {
  assert.match(interviewEvaluator, /create table if not exists public\.interview_evaluations\b/i)
  assert.match(interviewEvaluator, /default_locale text not null default 'en'/i)
  assert.match(interviewEvaluator, /supported_locales jsonb/i)
  assert.match(interviewEvaluator, /create or replace function public\.evaluate_interview_session/i)
  assert.match(interviewEvaluator, /create or replace function public\.get_interview_evaluation/i)
  assert.match(interviewEvaluator, /interview:evaluate/i)
  assert.match(interviewEvaluator, /interview_evaluation_permission_required/i)
  assert.match(interviewEvaluator, /evidence_fresh_until/i)
  assert.match(interviewEvaluator, /evaluation_version/i)
  assert.match(interviewEvaluator, /p_locale text/i)
  assert.match(interviewEvaluator, /interview_locale_unavailable/i)
  assert.match(interviewEvaluator, /interview_score \* 0\.15/i)
  assert.match(interviewEvaluator, /rubric_version', 2/i)
  assert.match(interviewEvaluator, /insert into public\.admin_audit_log/i)
  assert.match(interviewEvaluator, /security definer/i)
  assert.match(interviewEvaluator, /set search_path = public/i)
  assert.match(interviewEvaluator, /grant execute on function public\.get_interview_evaluation\(uuid\) to authenticated/i)
  assert.doesNotMatch(interviewEvaluator, /create policy[\s\S]*for insert[\s\S]*interview_evaluations/i)
})
test('interview evaluator worker is authenticated, structured, and RPC-only', () => {
  assert.match(interviewEvaluatorWorker, /evaluate_interview_session_system/i)
  assert.match(interviewEvaluatorWorker, /auth\.jwt\(\) ->> 'role'/i)
  assert.match(interviewEvaluatorWorker, /system_evaluation_only/i)
  assert.match(interviewEvaluatorWorker, /grant execute on function public\.evaluate_interview_session_system/i)
  assert.match(interviewEvaluatorWorker, /insert into public\.domain_events/i)
  assert.match(interviewEvaluatorFunction, /auth\.getUser\(\)/i)
  assert.match(interviewEvaluatorFunction, /GEMINI_API_KEY/i)
  assert.match(interviewEvaluatorFunction, /response_mime_type: 'application\/json'/i)
  assert.match(interviewEvaluatorFunction, /evaluate_interview_session_system/i)
  assert.match(interviewEvaluatorFunction, /rubric_scores/i)
  assert.match(interviewEvaluatorFunction, /locale/i)
  assert.doesNotMatch(interviewEvaluatorFunction, /console\.log\(/i)
})
test('platform governance is scoped, auditable, and RPC-only', () => {
  for (const table of ['platform_policies', 'admin_assignments', 'admin_access_reviews', 'moderation_cases', 'moderation_reports', 'moderation_evidence', 'moderation_actions', 'moderation_appeals', 'moderation_notes', 'admin_audit_log', 'domain_events', 'outbox_jobs']) {
    assert.match(platformGovernance, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'), `missing governance table: ${table}`)
  }
  assert.match(platformGovernance, /create or replace function public\.has_admin_permission/i)
  assert.match(platformGovernance, /create or replace function public\.create_moderation_report/i)
  assert.match(platformGovernance, /create or replace function public\.get_moderation_queue/i)
  assert.match(platformGovernance, /create or replace function public\.claim_moderation_case/i)
  assert.match(platformGovernance, /create or replace function public\.apply_moderation_action/i)
  assert.match(platformGovernance, /create or replace function public\.submit_moderation_appeal/i)
  assert.match(platformGovernance, /create or replace function public\.get_admin_audit_events/i)
  assert.match(platformGovernance, /security definer/i)
  assert.match(platformGovernance, /set search_path = public/i)
  assert.match(platformGovernance, /admin_permission_required/i)
  assert.match(platformGovernance, /insert into public\.admin_audit_log/i)
  assert.match(platformGovernance, /insert into public\.domain_events/i)
  assert.match(platformGovernance, /insert into public\.outbox_jobs/i)
  assert.match(platformGovernance, /revoke all on function public\.apply_moderation_action/i)
  assert.doesNotMatch(platformGovernance, /create policy[\s\S]*for insert[\s\S]*moderation_cases/i)
  assert.doesNotMatch(platformGovernance, /create policy[\s\S]*for insert[\s\S]*admin_audit_log/i)
})

test('admin governance client and console use protected RPCs', () => {
  assert.match(adminGovernanceClient, /supabase\.rpc\(name, args\)/)
  for (const rpc of ['create_moderation_report', 'get_moderation_queue', 'claim_moderation_case', 'apply_moderation_action', 'submit_moderation_appeal', 'get_admin_audit_events']) {
    assert.match(adminGovernanceClient, new RegExp(`['\"]${rpc}['\"]`))
  }
  assert.match(adminGovernancePage, /getModerationQueue/)
  assert.match(adminGovernancePage, /applyModerationAction/)
  assert.match(adminGovernancePage, /claimModerationCase/)
  assert.match(adminGovernancePage, /getAdminAuditEvents/)
  assert.doesNotMatch(adminGovernancePage, /from\(['\"]moderation_/)
})

test('public product demo and auth UX are wired for the broader digital-skills product', () => {
  assert.match(app, /path="\/" element={<Landing \/>}/)
  assert.match(landingPage, /Try the AI/)
  assert.match(landingPage, /Explore your directions/)
  assert.match(landingPage, /Learn by making/)
  assert.match(landingPage, /limited public demo/i)
  assert.doesNotMatch(onboardingPage, /Get hired as a Data Analyst/)
  assert.match(onboardingPage, /Start a career in digital skills/)
  assert.match(onboardingPage, /grid auto-rows-\[minmax\(156px,1fr\)\]/)
  assert.match(onboardingPage, /h-full min-h-\[156px\]/)
  assert.match(onboardingPage, /What do you want to learn\?/)
  assert.match(onboardingPage, /data-onboarding-step/)
  assert.match(onboardingPage, /Learn the landscape/)
  assert.match(onboardingPage, /Quick fit check/)
  assert.match(onboardingPage, /full_name: user\.user_metadata/)
  assert.match(onboardingPage, /skillQuestions/)
  assert.match(onboardingPage, /customDiscoveryOrientation/)
  assert.match(onboardingPage, /customDiscoveryQuiz/)
  assert.match(onboardingPage, /recommendedSubdomain/)
  assert.match(onboardingPage, /skillStep\[0\]/)
  assert.match(onboardingPage, /lg:mt-\[104px\]/)
  assert.doesNotMatch(onboardingPage, /min-h-\[760px\]/)
  assert.match(loginPage, /PasswordField/)
  assert.match(signupPage, /PasswordField/)
  assert.match(passwordField, /Show password/)
  assert.match(passwordField, /type={visible \? 'text' : 'password'}/)
})

test('backend source contains no obvious secret material', () => {
  const files = [foundation, missions, readiness, projects, achievements, notifications, skillTree, assessments, challenges, challengeParticipation, practiceEngine, communityHub, communityDiscussions, peerReview, skillBattles, marketplace, richerLiveChallenges, missionClient, readinessClient, projectClient, tutorFunction, tutorClient, portfolioClient, achievementsClient, notificationsClient, skillTreeClient, assessmentsClient, challengesClient, practiceClient, communityClient, peerReviewClient, skillBattlesClient, marketplaceClient, liveChallengesClient]
  const secretPattern = /(SUPABASE_SERVICE_ROLE|service_role|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,})/
  for (const content of files) assert.doesNotMatch(content, secretPattern)
})

test('branded recovery states cover 404 and application errors', () => {
  assert.match(recoveryState, /datakwest_icon_1\.png/)
  assert.match(recoveryState, /This is not the learning space you’re looking for\./)
  assert.match(recoveryState, /Something interrupted your learning path\./)
  assert.match(recoveryState, /Go to Datakwest home/)
  assert.match(recoveryState, /Go back/)
  assert.match(errorBoundary, /RecoveryState type="error"/)
  assert.match(appSource, /Route path="\*" element=\{<NotFound \/>\}/)
  assert.match(vercelConfig, /\{ "source": "\/\(\.\*\)", "destination": "\/" \}/)
})

test('signup captures learner identity and profile identity is protected', () => {
  assert.match(signupPage, /signup-full-name/)
  assert.match(signupPage, /signup-username/)
  assert.match(signupPage, /options: \{ data: \{ full_name: fullName\.trim\(\), username: normalizedUsername/)
  assert.match(profileIdentityMigration, /ADD COLUMN IF NOT EXISTS full_name text/i)
  assert.match(profileIdentityMigration, /ADD COLUMN IF NOT EXISTS username text/i)
  assert.match(profileIdentityMigration, /raw_user_meta_data/)
  assert.match(profileIdentityMigration, /CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key/i)
})

test('public AI preview is anonymous-limited, structured, and non-mutating', () => {
  assert.match(publicAiMigration, /create table if not exists public\.public_ai_preview_usage/i)
  assert.match(publicAiMigration, /call_count integer/i)
  assert.match(publicAiMigration, /consume_public_ai_preview/i)
  assert.match(publicAiMigration, /grant execute on function public\.consume_public_ai_preview\(text\) to service_role/i)
  assert.match(publicAiTenMessageMigration, /v_limit constant integer := 10/i)
  assert.match(publicAiTenMessageMigration, /call_count >= 0 AND call_count <= 10/i)
  assert.match(publicAiFunction, /visitorToken/i)
  assert.match(publicAiFunction, /consume_public_ai_preview/i)
  assert.match(publicAiFunction, /responseMimeType: 'application\/json'/i)
  assert.match(publicAiFunction, /never guarantee employment/i)
  assert.doesNotMatch(publicAiFunction, /auth\.getUser\(\)/i)
  assert.match(publicAiClient, /functions\.invoke\('public-ai-preview'/i)
  assert.match(landingPage, /DEMO_REMAINING_KEY/)
  assert.match(landingPage, /complimentary AI coaching/)
  assert.match(landingPage, /Ask Datakwest AI/)
})

test('Career Centre aggregates protected readiness and career evidence', () => {
  assert.match(careerCentreMigration, /create or replace function public\.get_career_centre\(\)/i)
  assert.match(careerCentreMigration, /auth\.uid\(\)/i)
  assert.match(careerCentreMigration, /get_readiness_score\(\)/i)
  assert.match(careerCentreMigration, /from public\.submissions/i)
  assert.match(careerCentreMigration, /from public\.interview_sessions/i)
  assert.match(careerCentreMigration, /from public\.applications/i)
  assert.match(careerCentreMigration, /from public\.opportunities/i)
  assert.match(careerCentreMigration, /grant execute on function public\.get_career_centre\(\) to authenticated/i)
  assert.match(careerCentreClient, /rpc\('get_career_centre'\)/i)
  assert.match(careerCentrePage, /Career Centre/i)
  assert.match(app, /path="\/career-centre"/i)
  assert.match(landingPage, /replace\(\/\\\\\\\\n\/g/i)
})
