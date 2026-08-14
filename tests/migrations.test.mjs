import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const foundation = await readFile('backend/supabase/migrations/0002_blueprint_mvp_foundation.sql', 'utf8')
const missions = await readFile('backend/supabase/migrations/0003_daily_mission_progress.sql', 'utf8')
const missionClient = await readFile('src/lib/missions.js', 'utf8')

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

test('backend source contains no obvious secret material', async () => {
  const files = [foundation, missions, missionClient]
  const secretPattern = /(SUPABASE_SERVICE_ROLE|service_role|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,})/
  for (const content of files) assert.doesNotMatch(content, secretPattern)
})
