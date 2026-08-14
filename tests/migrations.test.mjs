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
const challengesClient = await readFile('src/lib/challenges.js', 'utf8')

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

test('challenge client reads through the protected RPC', () => {
  assert.match(challengesClient, /rpc\('get_challenge_center'/)
  assert.doesNotMatch(challengesClient, /insert\(|update\(|delete\(/)
})

test('backend source contains no obvious secret material', async () => {
  const files = [foundation, missions, readiness, projects, achievements, notifications, skillTree, assessments, challenges, missionClient, readinessClient, projectClient, tutorFunction, tutorClient, portfolioClient, achievementsClient, notificationsClient, skillTreeClient, assessmentsClient, challengesClient]
  const secretPattern = /(SUPABASE_SERVICE_ROLE|service_role|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,})/
  for (const content of files) assert.doesNotMatch(content, secretPattern)
})
