import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import DiagramRenderer from '../components/DiagramRenderer'
import OwlLoading from '../components/OwlLoading'
import { awardXp, checkInStreak, awardSkillProgress } from '../lib/gamification'
import { logEvent } from '../lib/analytics'

export default function Lesson() {
  const { id } = useParams()
  const phaseNumber = parseInt(id, 10)
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [lessonTitles, setLessonTitles] = useState([])
  const [lessonRows, setLessonRows] = useState([])

  const [viewMode, setViewMode] = useState('path')
  const [choiceIndex, setChoiceIndex] = useState(null)
  const [reviewOnly, setReviewOnly] = useState(false)
  const [activeIndex, setActiveIndex] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [qIndex, setQIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [answered, setAnswered] = useState(false)

  const [practiceSubmission, setPracticeSubmission] = useState('')
  const [practiceFeedback, setPracticeFeedback] = useState(null)
  const [practiceEvaluating, setPracticeEvaluating] = useState(false)
  const [practiceError, setPracticeError] = useState('')

  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lastActiveDate, setLastActiveDate] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('roadmap, assessment, xp, streak, last_active_date')
        .eq('id', user.id)
        .single()

      if (profileError || !profile?.roadmap) {
        setError('Could not load your roadmap.')
        setLoading(false)
        return
      }

      const foundPhase = profile.roadmap.phases?.find(p => p.number === phaseNumber)
      if (!foundPhase) {
        setError('Phase not found.')
        setLoading(false)
        return
      }

      const titles = foundPhase.topics.split('·').map(t => t.trim()).filter(Boolean)

      const { data: existingLessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', user.id)
        .eq('phase_number', phaseNumber)
        .order('lesson_index', { ascending: true })

      setPhase(foundPhase)
      setAssessment(profile.assessment)
      setXp(profile.xp || 0)
      setStreak(profile.streak || 0)
      setLastActiveDate(profile.last_active_date || null)
      setLessonTitles(titles)
      setLessonRows(existingLessons || [])
      setLoading(false)
    }

    if (user) load()
  }, [user, phaseNumber])

  function getLessonStatus(index) {
    const row = lessonRows.find(r => r.lesson_index === index)
    if (row?.completed) return 'completed'
    const firstIncomplete = lessonTitles.findIndex(
      (_, i) => !lessonRows.find(r => r.lesson_index === i)?.completed
    )
    if (index === firstIncomplete) return 'current'
    return 'locked'
  }

  function resetPracticeState() {
    setQIndex(0)
    setSelectedOption(null)
    setAnswered(false)
    setPracticeSubmission('')
    setPracticeFeedback(null)
    setPracticeError('')
  }

  function handleLessonClick(index) {
    const status = getLessonStatus(index)
    if (status === 'locked') return

    if (status === 'completed') {
      setChoiceIndex(index)
      setViewMode('choice')
      return
    }

    openLesson(index)
  }

  function openLessonForReview(index) {
    const existingRow = lessonRows.find(r => r.lesson_index === index)
    setError('')
    setActiveIndex(index)
    setReviewOnly(true)
    resetPracticeState()
    if (existingRow?.practice_submission && existingRow?.practice_feedback) {
      setPracticeSubmission(existingRow.practice_submission)
      setPracticeFeedback(existingRow.practice_feedback)
    }
    setViewMode('content')
  }

  function openLessonForRetake(index) {
    setReviewOnly(false)
    resetPracticeState()
    openLesson(index, { forceRetake: true })
  }

  async function openLesson(index, { forceRetake = false } = {}) {
    const status = getLessonStatus(index)
    if (status === 'locked') return

    setError('')
    setActiveIndex(index)
    setReviewOnly(false)
    logEvent(user.id, 'lesson_started', { phase_number: phaseNumber, lesson_index: index, topic: lessonTitles[index] })
    setQIndex(0)
    setSelectedOption(null)
    setAnswered(false)

    if (!forceRetake) {
      setPracticeSubmission('')
      setPracticeFeedback(null)
      setPracticeError('')
    }

    const existingRow = lessonRows.find(r => r.lesson_index === index)
    if (existingRow?.content) {
      setViewMode('content')
      if (!forceRetake && existingRow.practice_submission && existingRow.practice_feedback) {
        setPracticeSubmission(existingRow.practice_submission)
        setPracticeFeedback(existingRow.practice_feedback)
      }
      return
    }

    setGenerating(true)
    setViewMode('content')

    try {
      const backgroundSummary = assessment
        ? `${assessment.background || ''}. Excel: ${assessment.excelLevel || 'unknown'}. Coding: ${assessment.coding || 'unknown'}. SQL: ${assessment.sql || 'unknown'}.`
        : 'beginner'
      const learningStyle = assessment?.learningStyle || 'theory + practice'

      const { data, error: fnError } = await supabase.functions.invoke('smart-service', {
        body: {
          topic: lessonTitles[index],
          phaseTitle: phase.title,
          background: backgroundSummary,
          learningStyle
        }
      })

      if (fnError) throw fnError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))

      const { data: upserted, error: upsertError } = await supabase
        .from('lessons')
        .upsert({
          user_id: user.id,
          phase_number: phaseNumber,
          lesson_index: index,
          title: lessonTitles[index],
          content: data.content,
          skill: data.content.skill || 'none',
          completed: false
        }, { onConflict: 'user_id,phase_number,lesson_index' })
        .select()
        .single()

      if (upsertError) throw upsertError

      setLessonRows(prev => [...prev.filter(r => r.lesson_index !== index), upserted])
    } catch (err) {
      console.error('Lesson generation error:', err)
      setError("We couldn't load this lesson right now. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  function handleAnswer(i) {
    if (!answered) {
      setSelectedOption(i)
      setAnswered(true)
    }
  }

  function handleNextQuestion(totalQuestions) {
    if (qIndex < totalQuestions - 1) {
      setQIndex(qIndex + 1)
      setSelectedOption(null)
      setAnswered(false)
    } else {
      markComplete()
    }
  }

  async function submitPractice() {
    if (!practiceSubmission.trim()) return

    setPracticeEvaluating(true)
    setPracticeError('')

    try {
      const task = activeContentRef.practiceTask
      const { data, error: fnError } = await supabase.functions.invoke('evaluate-practice', {
        body: {
          task: task.task,
          schemaDescription: task.schemaDescription,
          sampleRows: task.sampleRows,
          expectedOutcome: task.expectedOutcome,
          submission: practiceSubmission,
          practiceType: task.practiceType
        }
      })

      if (fnError) throw fnError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))

      setPracticeFeedback(data)
      logEvent(user.id, 'practice_submitted', { phase_number: phaseNumber, lesson_index: activeIndex, correct: data.isCorrect, practice_type: task.practiceType })

      const row = lessonRows.find(r => r.lesson_index === activeIndex)
      if (row) {
        const { error: updateError } = await supabase
          .from('lessons')
          .update({
            practice_submission: practiceSubmission,
            practice_feedback: data,
            practice_attempts: (row.practice_attempts || 0) + 1
          })
          .eq('id', row.id)

        if (!updateError) {
          setLessonRows(prev => prev.map(r => r.id === row.id
            ? { ...r, practice_submission: practiceSubmission, practice_feedback: data, practice_attempts: (r.practice_attempts || 0) + 1 }
            : r
          ))
        }
      }
    } catch (err) {
      console.error('Practice evaluation error:', err)
      setPracticeError("We couldn't check your answer right now. Please try again.")
    } finally {
      setPracticeEvaluating(false)
    }
  }

  function retryPractice() {
    setPracticeFeedback(null)
    setPracticeSubmission('')
    setPracticeError('')
  }

  async function markComplete() {
    if (activeContentRef.practiceTask && !practiceFeedback?.isCorrect) return

    const row = lessonRows.find(r => r.lesson_index === activeIndex)
    if (!row) return

    const wasAlreadyCompleted = row.completed

    const { error: updateError } = await supabase
      .from('lessons')
      .update({ completed: true })
      .eq('id', row.id)

    if (!updateError) {
      setLessonRows(prev =>
        prev.map(r => r.id === row.id ? { ...r, completed: true } : r)
      )

      if (!wasAlreadyCompleted) {
        const newXp = await awardXp(user.id, xp, 10)
        setXp(newXp)
        logEvent(user.id, 'lesson_completed', { phase_number: phaseNumber, lesson_index: activeIndex })
        const { streak: newStreak } = await checkInStreak(user.id, streak, lastActiveDate)
        setStreak(newStreak)
        if (row.skill && row.skill !== 'none') {
          await awardSkillProgress(user.id, row.skill, 4)
        }
      } else {
        logEvent(user.id, 'lesson_retaken', { phase_number: phaseNumber, lesson_index: activeIndex })
      }
    }

    setViewMode('path')
    setActiveIndex(null)
    setReviewOnly(false)
    resetPracticeState()
  }

  function backToPath() {
    setViewMode('path')
    setActiveIndex(null)
    setChoiceIndex(null)
    setReviewOnly(false)
    resetPracticeState()
  }

  if (loading) return <OwlLoading message="Opening your lesson…" />

  if (error && !phase) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F7FA' }}>
        <p style={{ color: '#991B1B' }}>{error}</p>
      </div>
    )
  }

  const allCompleted = lessonTitles.every(
    (_, i) => lessonRows.find(r => r.lesson_index === i)?.completed
  )
  const activeContent = activeIndex !== null
    ? lessonRows.find(r => r.lesson_index === activeIndex)?.content
    : null
  const activeContentRef = activeContent || {}
  const questions = activeContent?.checkQuestions || []
  const currentQuestion = questions[qIndex]
  const showPracticeReadOnly = reviewOnly && activeContentRef.practiceTask

  return (
    <div className="lesson-page min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar xp={xp} streak={streak} />
      <main className="lesson-shell max-w-3xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="lesson-back-link inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-black mb-6"
          style={{ color: '#0A2342', borderColor: '#B9C8D8', background: '#FFFFFF' }}>
          <span aria-hidden="true">←</span> Back to Dashboard
        </Link>

        <header className="lesson-hero mb-8 rounded-3xl border p-6 sm:p-8" style={{ borderColor: '#DCE5F0', background: '#FFFFFF' }}>
          <p className="lesson-eyebrow text-xs font-black uppercase tracking-[.18em]" style={{ color: '#8A6500' }}>Your guided lesson</p>
          <h1 className="lesson-page-title mt-2 text-3xl font-black tracking-tight" style={{ color: '#0A2342' }}>{phase.title}</h1>
          <p className="lesson-page-subtitle mt-2 text-sm font-semibold" style={{ color: '#52677E' }}>{phase.weeks}</p>
        </header>

        {viewMode === 'path' && (
          <div className="space-y-4">
            {lessonTitles.map((title, index) => {
              const status = getLessonStatus(index)
              return (
                <button
                  key={index}
                  onClick={() => handleLessonClick(index)}
                  disabled={status === 'locked'}
                  className={`lesson-path-card lesson-path-card-${status} w-full flex items-center gap-4 bg-white rounded-2xl p-5 text-left transition-all`}
                  style={{
                    boxShadow: '0 2px 12px rgba(10,35,66,0.06)',
                    opacity: status === 'locked' ? 0.5 : 1,
                    cursor: status === 'locked' ? 'default' : 'pointer'
                  }}
                >
                  <div className={`lesson-step-indicator lesson-step-indicator-${status} w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm`}
                    style={{
                      background: status === 'completed' ? '#0A2342' : status === 'current' ? '#D4AF37' : '#E2E8F0',
                      color: status === 'locked' ? '#6B7A99' : 'white'
                    }}>
                    {status === 'completed' ? '✓' : index + 1}
                  </div>
                  <div>
                    <p className="lesson-path-title font-medium">{title}</p>
                    <p className="lesson-path-subtitle text-xs mt-0.5">
                      {status === 'completed' ? 'Completed — tap to review or retake' : status === 'current' ? 'Start lesson' : 'Locked'}
                    </p>
                  </div>
                </button>
              )
            })}

            {allCompleted && (
              <div className="rounded-2xl p-6 text-center" style={{ background: '#E8F5E9' }}>
                <p className="font-bold mb-3" style={{ color: '#2E7D32' }}>🎉 All lessons complete!</p>
                <Link to={`/quiz/${phaseNumber}`}
                  className="inline-block px-6 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: '#D4AF37', color: '#0A2342' }}>
                  Take Phase Quiz →
                </Link>
              </div>
            )}
          </div>
        )}

        {viewMode === 'choice' && choiceIndex !== null && (
          <div className="lesson-choice-card lesson-surface bg-white rounded-3xl p-8 text-center" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>
            <button onClick={backToPath} className="text-sm font-semibold mb-6 inline-block" style={{ color: '#6B7A99' }}>
              ← Back
            </button>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#0A2342' }}>{lessonTitles[choiceIndex]}</h2>
            <p className="text-sm mb-6" style={{ color: '#6B7A99' }}>You've already completed this lesson. What would you like to do?</p>

            <div className="space-y-3">
              <button
                onClick={() => openLessonForReview(choiceIndex)}
                className="w-full py-3 rounded-xl text-sm font-bold border-2 transition-all"
                style={{ borderColor: '#0A2342', color: '#0A2342' }}
              >
                📖 Review my past answer
              </button>
              <button
                onClick={() => openLessonForRetake(choiceIndex)}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#D4AF37', color: '#0A2342' }}
              >
                🔁 Take lesson again
              </button>
            </div>
          </div>
        )}

        {viewMode === 'content' && (
          <div className="lesson-content-card lesson-surface bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>

            {generating ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 rounded-full border-4 animate-spin mx-auto mb-4"
                  style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
                <p className="font-medium mb-1" style={{ color: '#0A2342' }}>Crafting your lesson...</p>
                <p className="text-sm" style={{ color: '#6B7A99' }}>Personalizing this just for you — a few seconds</p>
              </div>

            ) : error ? (
              <div>
                <p className="text-sm mb-4" style={{ color: '#991B1B' }}>{error}</p>
                <button onClick={() => openLesson(activeIndex)}
                  className="px-5 py-2 rounded-xl text-sm font-bold"
                  style={{ background: '#D4AF37', color: '#0A2342' }}>
                  Try again
                </button>
              </div>

            ) : activeContent ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={backToPath}
                    className="text-sm font-semibold" style={{ color: '#6B7A99' }}>←</button>
                  <h2 className="lesson-content-title text-xl font-black" style={{ color: '#0A2342' }}>
                    {lessonTitles[activeIndex]}
                  </h2>
                  {reviewOnly && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#F5F7FA', color: '#6B7A99' }}>
                      Reviewing
                    </span>
                  )}
                </div>

                <div className="lesson-body-copy text-sm mb-6 space-y-3 leading-relaxed" style={{ color: '#1E293B' }}>
                  {activeContent.explanation.split('\n').filter(Boolean).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                <DiagramRenderer diagram={activeContent.diagram} />

                {activeContent.keyPoints?.length > 0 && (
                  <div className="rounded-2xl p-5 mb-6" style={{ background: '#F5F7FA' }}>
                    <p className="lesson-section-label text-xs font-black mb-3" style={{ color: '#0A2342' }}>📌 KEY POINTS</p>
                    <ul className="lesson-section-copy text-sm space-y-2 list-disc pl-5" style={{ color: '#1E293B' }}>
                      {activeContent.keyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeContent.example && (
                  <div className="lesson-example-card rounded-2xl p-5 mb-6"
                    style={{ background: '#FFFBEF', border: '1px solid #D4AF37' }}>
                    <p className="lesson-section-label text-xs font-black mb-2" style={{ color: '#0A2342' }}>💡 REAL-WORLD EXAMPLE</p>
                    <p className="lesson-section-copy text-sm leading-relaxed" style={{ color: '#1E293B' }}>{activeContent.example}</p>
                  </div>
                )}

                {activeContent.exercise && (
                  <div className="lesson-exercise-card rounded-2xl p-5 mb-6"
                    style={{ background: '#F0F4FF', border: '1px solid #0A2342' }}>
                    <p className="lesson-section-label text-xs font-black mb-2" style={{ color: '#0A2342' }}>🏋️ TRY IT YOURSELF</p>
                    <p className="lesson-section-copy text-sm leading-relaxed" style={{ color: '#1E293B' }}>{activeContent.exercise}</p>
                  </div>
                )}

                {activeContent.practiceTask && (
                  <div className="rounded-2xl p-5 mb-6" style={{ background: '#FFFFFF', border: '2px solid #D4AF37' }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <p className="text-xs font-bold" style={{ color: '#0A2342' }}>
                        ⌨️ HANDS-ON PRACTICE — {
                          activeContent.practiceTask.practiceType === 'python' ? 'WRITE REAL PYTHON'
                          : activeContent.practiceTask.practiceType === 'excel' ? 'WRITE THE EXCEL FORMULA'
                          : 'WRITE REAL SQL'
                        }
                      </p>
                      {!reviewOnly && !practiceFeedback?.isCorrect && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#FFFBEF', color: '#D4AF37', border: '1px solid #D4AF37' }}>
                          Required to continue
                        </span>
                      )}
                    </div>

                    <div className="rounded-xl p-4 mb-4" style={{ background: '#0A2342' }}>
                      <p className="text-xs font-mono mb-2" style={{ color: '#D4AF37' }}>{activeContent.practiceTask.schemaDescription}</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {activeContent.practiceTask.sampleRows}
                      </pre>
                    </div>

                    <p className="text-sm font-bold mb-3" style={{ color: '#0A2342' }}>{activeContent.practiceTask.task}</p>

                    {showPracticeReadOnly ? (
                      <div>
                        <div className="rounded-xl p-4 mb-3" style={{ background: '#F5F7FA' }}>
                          <p className="text-xs font-mono mb-1" style={{ color: '#6B7A99' }}>Your saved answer:</p>
                          <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: '#0A2342' }}>
                            {practiceSubmission || 'No saved answer found for this lesson.'}
                          </pre>
                        </div>
                        {practiceFeedback?.output && (
                          <div className="rounded-xl p-4 mb-3" style={{ background: '#0A2342' }}>
                            <p className="text-xs font-mono mb-1" style={{ color: '#D4AF37' }}>OUTPUT:</p>
                            <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: 'white' }}>{practiceFeedback.output}</pre>
                          </div>
                        )}
                        {practiceFeedback?.feedback && (
                          <div className="rounded-xl p-4" style={{
                            background: practiceFeedback.isCorrect ? '#E8F5E9' : '#FEE2E2',
                            color: practiceFeedback.isCorrect ? '#2E7D32' : '#991B1B'
                          }}>
                            <p className="font-bold text-sm mb-1">
                              {practiceFeedback.isCorrect ? '✅ Marked correct' : '❌ Was marked incorrect'}
                            </p>
                            <p className="text-sm leading-relaxed">{practiceFeedback.feedback}</p>
                          </div>
                        )}
                      </div>
                    ) : !practiceFeedback ? (
                      <>
                        <textarea
                          value={practiceSubmission}
                          onChange={e => setPracticeSubmission(e.target.value)}
                          placeholder={
                            activeContent.practiceTask.practiceType === 'python' ? 'Write your Python code here...'
                            : activeContent.practiceTask.practiceType === 'excel' ? 'Write your formula here... e.g. =SUM(B2:B6)'
                            : 'Write your SQL query here...'
                          }
                          rows={6}
                          className="w-full px-4 py-3 rounded-xl border-2 text-sm font-mono outline-none resize-none"
                          style={{ borderColor: '#E2E8F0', color: '#0A2342', background: '#FAFAFA' }}
                        />

                        {practiceError && (
                          <p className="text-sm mt-2" style={{ color: '#991B1B' }}>{practiceError}</p>
                        )}

                        <button
                          onClick={submitPractice}
                          disabled={!practiceSubmission.trim() || practiceEvaluating}
                          className="w-full mt-3 py-3 rounded-xl text-sm font-bold transition-all"
                          style={{
                            background: practiceSubmission.trim() ? '#D4AF37' : '#E2E8F0',
                            color: practiceSubmission.trim() ? '#0A2342' : '#6B7A99'
                          }}
                        >
                          {practiceEvaluating
                            ? 'Checking...'
                            : activeContent.practiceTask.practiceType === 'python' ? 'Submit code'
                            : activeContent.practiceTask.practiceType === 'excel' ? 'Submit formula'
                            : 'Submit query'}
                        </button>
                      </>
                    ) : (
                      <div>
                        <div className="rounded-xl p-4 mb-3" style={{ background: '#F5F7FA' }}>
                          <p className="text-xs font-mono mb-1" style={{ color: '#6B7A99' }}>Your code:</p>
                          <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: '#0A2342' }}>{practiceSubmission}</pre>
                        </div>

                        {practiceFeedback.output && (
                          <div className="rounded-xl p-4 mb-3" style={{ background: '#0A2342' }}>
                            <p className="text-xs font-mono mb-1" style={{ color: '#D4AF37' }}>OUTPUT:</p>
                            <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: 'white' }}>{practiceFeedback.output}</pre>
                          </div>
                        )}

                        <div className="rounded-xl p-4" style={{
                          background: practiceFeedback.isCorrect ? '#E8F5E9' : '#FEE2E2',
                          color: practiceFeedback.isCorrect ? '#2E7D32' : '#991B1B'
                        }}>
                          <p className="font-bold text-sm mb-1">
                            {practiceFeedback.isCorrect ? '✅ Correct!' : '❌ Not quite right'}
                          </p>
                          <p className="text-sm leading-relaxed">{practiceFeedback.feedback}</p>
                          {!practiceFeedback.isCorrect && (
                            <p className="text-xs font-semibold mt-2">You'll need to get this right before you can move on — give it another try below.</p>
                          )}
                        </div>

                        {!practiceFeedback.isCorrect && (
                          <button
                            onClick={retryPractice}
                            className="w-full mt-3 py-3 rounded-xl text-sm font-bold border-2 transition-all"
                            style={{ borderColor: '#0A2342', color: '#0A2342' }}
                          >
                            Try again
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {reviewOnly ? (
                  <div className="rounded-2xl p-5 text-center" style={{ background: '#F5F7FA' }}>
                    <p className="text-sm font-semibold" style={{ color: '#0A2342' }}>
                      ✓ This lesson's quiz was already completed.
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B7A99' }}>
                      Individual quiz answers aren't saved — only your hands-on practice answer is kept for review.
                    </p>
                    <button onClick={backToPath}
                      className="mt-4 px-6 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{ background: '#D4AF37', color: '#0A2342' }}>
                      Back to lessons
                    </button>
                  </div>
                ) : currentQuestion ? (
                  <div className="lesson-quiz-panel border-t pt-6" style={{ borderColor: '#E2E8F0' }}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-semibold" style={{ color: '#6B7A99' }}>
                        QUIZ — QUESTION {qIndex + 1} OF {questions.length}
                      </p>
                      <div className="flex gap-1 flex-wrap max-w-50 justify-end">
                        {questions.map((_, i) => (
                          <div key={i} className="w-6 h-1.5 rounded-full"
                            style={{ background: i <= qIndex ? '#D4AF37' : '#E2E8F0' }} />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm font-bold mb-4" style={{ color: '#0A2342' }}>
                      {currentQuestion.question}
                    </p>

                    <div className="space-y-2 mb-4">
                      {currentQuestion.options.map((opt, i) => {
                        const isCorrect = i === currentQuestion.correctIndex
                        const isSelected = i === selectedOption
                        let bg = '#FAFAFA', border = '#E2E8F0', color = '#0A2342'
                        if (answered && isSelected) {
                          bg = isCorrect ? '#E8F5E9' : '#FEE2E2'
                          border = isCorrect ? '#2E7D32' : '#991B1B'
                        }
                        return (
                          <button key={i} onClick={() => handleAnswer(i)} disabled={answered}
                            className="lesson-quiz-option w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all"
                            style={{ borderColor: border, background: bg, color }}>
                            <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                            {opt}
                          </button>
                        )
                      })}
                    </div>

                    {answered && (
                      <div>
                        <div className="rounded-xl p-3 mb-4 text-sm"
                          style={{
                            background: selectedOption === currentQuestion.correctIndex ? '#E8F5E9' : '#FEE2E2',
                            color: selectedOption === currentQuestion.correctIndex ? '#2E7D32' : '#991B1B'
                          }}>
                          {selectedOption === currentQuestion.correctIndex
                            ? '✅ Correct! Great work.'
                            : `❌ Not quite. The correct answer is: ${currentQuestion.options[currentQuestion.correctIndex]}`}
                        </div>
                        <button onClick={() => handleNextQuestion(questions.length)}
                          className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                          style={{ background: '#D4AF37', color: '#0A2342' }}>
                          {qIndex < questions.length - 1 ? 'Next question →' : 'Complete lesson ✓'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : !generating ? (() => {
                  const practiceRequired = activeContent.practiceTask && !practiceFeedback?.isCorrect
                  return (
                    <button onClick={markComplete} disabled={practiceRequired}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all mt-4"
                      style={{ background: practiceRequired ? '#E2E8F0' : '#D4AF37', color: practiceRequired ? '#6B7A99' : '#0A2342' }}>
                      {practiceRequired ? 'Complete the practice task above first' : 'Mark as complete ✓'}
                    </button>
                  )
                })() : null}
              </>
            ) : null}
          </div>
        )}
      </main>
    </div>
  )
}