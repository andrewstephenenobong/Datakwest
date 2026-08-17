import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'

const lesson = await fs.readFile(new URL('../src/pages/Lesson.jsx', import.meta.url), 'utf8')
const lessonCss = await fs.readFile(new URL('../src/index.css', import.meta.url), 'utf8')
const trackLesson = await fs.readFile(new URL('../src/pages/TrackLesson.jsx', import.meta.url), 'utf8')

const requiredLessonVariants = [
  ['explanation', 'activeContent.explanation'],
  ['diagram', 'DiagramRenderer diagram={activeContent.diagram}'],
  ['key points', 'activeContent.keyPoints?.length > 0'],
  ['example', 'activeContent.example'],
  ['exercise', 'activeContent.exercise'],
  ['hands-on practice', 'activeContent.practiceTask'],
  ['interactive quiz', 'currentQuestion'],
]

test('lesson renders every supported generated-content variant', () => {
  for (const [label, source] of requiredLessonVariants) assert.match(lesson, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${label} rendering branch`)
  assert.match(lesson, /lesson-example-card/)
  assert.match(lesson, /lesson-exercise-card/)
  assert.match(lesson, /lesson-quiz-panel/)
})

test('practice evaluator supports SQL, Excel, and Python lesson tasks', () => {
  assert.match(lesson, /practiceType === 'python'/)
  assert.match(lesson, /practiceType === 'excel'/)
  assert.match(lesson, /'WRITE REAL SQL'/)
  assert.match(lesson, /evaluate-practice/)
  assert.match(lesson, /schemaDescription/)
  assert.match(lesson, /sampleRows/)
  assert.match(lesson, /expectedOutcome/)
})

test('practice completion is required before a lesson can be marked complete', () => {
  assert.match(lesson, /if \(activeContentRef\.practiceTask && !practiceFeedback\?\.isCorrect\) return/)
  assert.match(lesson, /const practiceRequired = activeContent\.practiceTask && !practiceFeedback\?\.isCorrect/)
  assert.match(lesson, /disabled=\{practiceRequired\}/)
})

test('interactive quiz supports answer selection, feedback, progression, and completion', () => {
  assert.match(lesson, /setSelectedOption\(i\)/)
  assert.match(lesson, /setAnswered\(true\)/)
  assert.match(lesson, /currentQuestion\.correctIndex/)
  assert.match(lesson, /Next question →/)
  assert.match(lesson, /Complete lesson ✓/)
  assert.match(lesson, /handleNextQuestion\(questions\.length\)/)
})

test('lesson path supports locked, current, completed, review, and retake states', () => {
  assert.match(lesson, /return 'completed'/)
  assert.match(lesson, /return 'current'/)
  assert.match(lesson, /return 'locked'/)
  assert.match(lesson, /openLessonForReview/)
  assert.match(lesson, /openLessonForRetake/)
  assert.match(lesson, /Review my past answer/)
  assert.match(lesson, /Take lesson again/)
})

test('lesson completion persists progress and awards learning signals once', () => {
  assert.match(lesson, /\.update\(\{ completed: true \}\)/)
  assert.match(lesson, /if \(!wasAlreadyCompleted\)/)
  assert.match(lesson, /awardXp\(/)
  assert.match(lesson, /checkInStreak\(/)
  assert.match(lesson, /awardSkillProgress\(/)
  assert.match(lesson, /lesson_completed/)
  assert.match(lesson, /lesson_retaken/)
})

test('lesson surface styles keep content, quiz, and navigation readable in dark mode', () => {
  for (const selector of ['.lesson-content-card', '.lesson-example-card', '.lesson-exercise-card', '.lesson-quiz-option', '.lesson-back-link']) {
    assert.ok(lessonCss.includes(selector), `missing lesson selector ${selector}`)
    assert.match(lessonCss, /html\[data-theme='dark'\]/, `missing dark-mode rules for ${selector}`)
  }
  assert.match(lessonCss, /\.learner-nav-desktop\s*\{[\s\S]*?position:\s*sticky/)
  assert.match(lessonCss, /\.app-navbar\s*\{[\s\S]*?position:\s*static !important/)
})

test('generated track lessons remain skill-aware and phase-addressable', () => {
  assert.match(trackLesson, /useParams\(\)/)
  assert.match(trackLesson, /skill, phaseNumber/)
  assert.match(trackLesson, /generate-track-lesson/)
  assert.match(trackLesson, /Phase not found\./)
})
