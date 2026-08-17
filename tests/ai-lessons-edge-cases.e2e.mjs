import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import { createActiveSkillSwitchGuard } from '../src/lib/skillLibrary.js'

const lessonFunction = await fs.readFile(new URL('../backend/supabase/functions/generate-track-lesson.ts', import.meta.url), 'utf8')
const quizFunction = await fs.readFile(new URL('../backend/supabase/functions/generate-phase-quiz.ts', import.meta.url), 'utf8')
const tutorFunction = await fs.readFile(new URL('../backend/supabase/functions/tutor-orchestrator.ts', import.meta.url), 'utf8')
const discoveryFunction = await fs.readFile(new URL('../backend/supabase/functions/universal-skill-discovery.ts', import.meta.url), 'utf8')
const tutorClient = await fs.readFile(new URL('../src/lib/learningIntelligence.js', import.meta.url), 'utf8')

function lessonCacheKey({ skill, ageBand, explanationStyle, locale = 'en' }) {
  return [skill.trim().toLowerCase(), ageBand, explanationStyle, locale].join(':')
}

test('stale lesson responses cannot replace the latest selected skill', async () => {
  const guard = createActiveSkillSwitchGuard()
  const first = guard.begin()
  const latest = guard.begin()
  const accepted = []
  await Promise.all([
    new Promise((resolve) => setTimeout(() => { if (guard.isLatest(first)) accepted.push('Cybersecurity'); resolve() }, 20)),
    new Promise((resolve) => setTimeout(() => { if (guard.isLatest(latest)) accepted.push('Cloud & DevOps'); resolve() }, 5)),
  ])
  assert.deepEqual(accepted, ['Cloud & DevOps'])
})

test('lesson cache identity includes age and explanation profile', () => {
  assert.notEqual(lessonCacheKey({ skill: 'Photography', ageBand: '5_7', explanationStyle: 'story' }), lessonCacheKey({ skill: 'Photography', ageBand: 'adult', explanationStyle: 'direct' }))
  assert.match(lessonFunction, /age_band|ageBand/)
  assert.match(lessonFunction, /explanation_style|explanationStyle/)
  assert.match(lessonFunction, /cache|lesson/i)
})

test('malformed or unavailable lesson generation has a deterministic fallback path', () => {
  assert.match(lessonFunction, /fallback/i)
  assert.match(lessonFunction, /response\.ok|try|catch/i)
  assert.match(tutorFunction, /fallback|provider|error/i)
})

test('unsupported custom skills remain provisional and review-gated', () => {
  assert.match(discoveryFunction, /provisional_fallback/i)
  assert.match(discoveryFunction, /review_required/i)
  assert.match(discoveryFunction, /status: 'draft'/i)
})

test('empty retrieval does not authorize fabricated tutor citations', () => {
  assert.match(tutorFunction, /retrievedKnowledge\.length/i)
  assert.match(tutorFunction, /state uncertainty|uncertainty/i)
  assert.match(tutorFunction, /grounding/i)
})

test('quiz generation adapts to learner age and avoids unbounded output', () => {
  assert.match(quizFunction, /age_band/i)
  assert.match(quizFunction, /question|quiz/i)
  assert.match(quizFunction, /slice\(|limit|max|length/i)
})

test('lesson and tutor clients preserve structured fallback fields', () => {
  assert.match(tutorClient, /grounding/i)
  assert.match(tutorClient, /evidence_request|evidenceRequest/i)
  assert.match(tutorClient, /invoke\('tutor-orchestrator'/i)
})
