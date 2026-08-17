import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import { createActiveSkillSwitchGuard, getSkillSwitchErrorMessage, markActiveSkill, upsertActiveSkill } from '../src/lib/skillLibrary.js'

const tracksSource = await fs.readFile(new URL('../src/pages/Tracks.jsx', import.meta.url), 'utf8')
const dashboardSource = await fs.readFile(new URL('../src/pages/Dashboard.jsx', import.meta.url), 'utf8')
const intelligenceSource = await fs.readFile(new URL('../src/lib/learningIntelligence.js', import.meta.url), 'utf8')
const skillMigration = await fs.readFile(new URL('../backend/supabase/migrations/0078_skill_library_active_selection.sql', import.meta.url), 'utf8')
const missionMigration = await fs.readFile(new URL('../backend/supabase/migrations/0077_missions_authenticated_select.sql', import.meta.url), 'utf8')
const gameSource = await fs.readFile(new URL('../src/components/playground/GameComponents.jsx', import.meta.url), 'utf8')
const stylesSource = await fs.readFile(new URL('../src/index.css', import.meta.url), 'utf8')

const themeIds = ['canopy', 'moonlit', 'sunset', 'honey', 'aurora', 'harvest', 'frost', 'bloom']
const levelValues = ['beginner', 'familiar', 'intermediate', 'advanced']

function fakeEnrolment(id, title, startingLevel) {
  return { id, starting_level: startingLevel, skills: { title } }
}

test('skill enrolment contract captures level and persists active skill', () => {
  for (const level of levelValues) assert.match(tracksSource, new RegExp(`['"]${level}['"]`))
  assert.match(tracksSource, /How well do you understand/)
  assert.match(tracksSource, /startingLevel: selectedLevel/)
  assert.match(intelligenceSource, /p_starting_level: startingLevel/)
  assert.match(skillMigration, /starting_level text NOT NULL DEFAULT 'beginner'/i)
  assert.match(skillMigration, /active_skill_enrolment_id uuid/i)
  assert.match(skillMigration, /set_active_skill_enrolment/i)
})

test('adding a second skill leaves exactly one active skill', () => {
  const first = fakeEnrolment('skill-1', 'Cybersecurity', 'beginner')
  const second = fakeEnrolment('skill-2', 'Cloud & DevOps', 'familiar')
  const afterFirst = upsertActiveSkill([], first)
  const afterSecond = upsertActiveSkill(afterFirst, second)
  assert.equal(afterSecond.filter((item) => item.is_active).length, 1)
  assert.equal(afterSecond.find((item) => item.is_active)?.id, 'skill-2')
  assert.equal(afterSecond.find((item) => item.id === 'skill-1')?.is_active, false)
})

test('switching active skills remains single-source-of-truth after reload', () => {
  const saved = markActiveSkill([
    fakeEnrolment('skill-1', 'Cybersecurity', 'beginner'),
    fakeEnrolment('skill-2', 'Cloud & DevOps', 'familiar'),
    fakeEnrolment('skill-3', 'Data Analytics', 'intermediate'),
  ], 'skill-3')
  assert.equal(saved.filter((item) => item.is_active).length, 1)
  assert.equal(saved.find((item) => item.is_active)?.skills.title, 'Data Analytics')
  assert.match(intelligenceSource, /active_skill_enrolment_id/)
  assert.match(dashboardSource, /activeSkillTitle/)
})

test('concurrent switching applies only the latest learner intent', async () => {
  const guard = createActiveSkillSwitchGuard()
  const skills = [fakeEnrolment('skill-1', 'Cybersecurity', 'beginner'), fakeEnrolment('skill-2', 'Cloud & DevOps', 'familiar')]
  const firstIntent = guard.begin()
  const secondIntent = guard.begin()
  const results = []
  await Promise.all([
    new Promise((resolve) => setTimeout(() => { if (guard.isLatest(firstIntent)) results.push(markActiveSkill(skills, 'skill-1')); resolve() }, 20)),
    new Promise((resolve) => setTimeout(() => { if (guard.isLatest(secondIntent)) results.push(markActiveSkill(skills, 'skill-2')); resolve() }, 5)),
  ])
  assert.equal(results.length, 1)
  assert.equal(results[0].find((item) => item.is_active)?.id, 'skill-2')
})

test('offline switching preserves current state and returns a safe recovery message', () => {
  const message = getSkillSwitchErrorMessage(new TypeError('Failed to fetch'), false)
  assert.match(message, /offline/i)
  assert.match(message, /unchanged/i)
  const current = markActiveSkill([fakeEnrolment('skill-1', 'Cybersecurity', 'beginner'), fakeEnrolment('skill-2', 'Cloud & DevOps', 'familiar')], 'skill-1')
  assert.equal(current.find((item) => item.is_active)?.id, 'skill-1')
})

test('missions are readable through RLS without restoring client writes', () => {
  assert.match(missionMigration, /GRANT SELECT ON TABLE public\.missions TO authenticated/i)
  assert.match(missionMigration, /Users can view own missions/i)
  assert.match(missionMigration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.missions FROM authenticated/i)
  assert.match(missionMigration, /complete_daily_mission\(uuid\)/i)
})

test('all Owl Nest themes have selector hooks and visual palette coverage', () => {
  for (const themeId of themeIds) {
    assert.match(gameSource, new RegExp(`id: '${themeId}'`), `missing theme option: ${themeId}`)
    assert.match(stylesSource, new RegExp(`dk-ladder-theme-${themeId}`), `missing palette selector: ${themeId}`)
  }
  assert.match(gameSource, /Board mood/)
  assert.match(gameSource, /aria-pressed=\{theme === option\.id\}/)
  assert.match(stylesSource, /prefers-reduced-motion/)
})

test('theme switching preserves Owl Nest identity and accessible controls', () => {
  assert.match(gameSource, /Your nest token/)
  assert.match(gameSource, /Reach the nest/)
  assert.match(gameSource, /Choose .* board theme/)
  assert.match(stylesSource, /\.dk-ladder-theme-options/)
  assert.match(stylesSource, /\.dk-ladder-theme-option\.is-active/)
})
