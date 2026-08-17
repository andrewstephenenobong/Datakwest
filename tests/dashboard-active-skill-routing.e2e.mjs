import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'

const dashboard = await fs.readFile(new URL('../src/pages/Dashboard.jsx', import.meta.url), 'utf8')
const trackLesson = await fs.readFile(new URL('../src/pages/TrackLesson.jsx', import.meta.url), 'utf8')

test('dashboard resolves next learning actions through the active skill track', () => {
  assert.match(dashboard, /active_skill_enrolment_id/)
  assert.match(dashboard, /from\('skill_tracks'\)/)
  assert.match(dashboard, /\/tracks\/\$\{encodeURIComponent\(activeTrackKey\)\}\/phase\/\$\{currentPhase\}/)
  assert.doesNotMatch(dashboard, /navigate\(`\/lesson\/\$\{nextAction\.node_id\}`\)/)
})

test('dashboard cannot render a stale roadmap when active skill differs', () => {
  assert.match(dashboard, /activeSkillMatchesProfileRoadmap/)
  assert.match(dashboard, /phases: \[\], skillLevels: \{\}/)
})

test('track lesson loads content using the route skill and phase', () => {
  assert.match(trackLesson, /\.eq\('skill', skill\)/)
  assert.match(trackLesson, /p:phaseNumber|phaseNumber/)
  assert.match(trackLesson, /setError\('Phase not found\.'\)/)
})
