import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { awardXp } from '../lib/gamification'
import { logEvent } from '../lib/analytics'

const PASS_THRESHOLD = 70

export default function Quiz() {
  const { id } = useParams()
  const phaseNumber = parseInt(id, 10)
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [progressRow, setProgressRow] = useState(null)

  const [stage, setStage] = useState('intro')
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [missedTopics, setMissedTopics] = useState([])

  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('roadmap, assessment, xp, streak')
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

      const { data: progress } = await supabase
        .from('phase_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('phase_number', phaseNumber)
        .maybeSingle()

      setPhase(foundPhase)
      setAssessment(profile.assessment)
      setXp(profile.xp || 0)
      setStreak(profile.streak || 0)
      setProgressRow(progress || null)
      setLoading(false)
    }

    if (user) load()
  }, [user, phaseNumber])

  async function startQuiz() {
    setStage('generating')
    setError('')

    try {
      const backgroundSummary = assessment
        ? `${assessment.background || ''}. Excel: ${assessment.excelLevel || 'unknown'}. Coding: ${assessment.coding || 'unknown'}. SQL: ${assessment.sql || 'unknown'}.`
        : 'beginner'
      const learningStyle = assessment?.learningStyle || 'theory + practice'

      const { data, error: fnError } = await supabase.functions.invoke('generate-phase-quiz', {
        body: { phaseTitle: phase.title, topics: phase.topics, background: backgroundSummary, learningStyle }
      })

      if (fnError) throw fnError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))

      setQuestions(data.quiz.questions || [])
      setQIndex(0)
      setSelectedOption(null)
      setAnswered(false)
      setCorrectCount(0)
      setMissedTopics([])
      setStage('quiz')
      logEvent(user.id, 'quiz_started', { phase_number: phaseNumber })
    } catch (err) {
      console.error('Quiz generation error:', err)
      setError("We couldn't generate your quiz right now. Please try again.")
      setStage('intro')
    }
  }

  function handleAnswer(i) {
    if (answered) return
    setSelectedOption(i)
    setAnswered(true)
    if (i === questions[qIndex].correctIndex) {
      setCorrectCount(c => c + 1)
    } else {
      const topic = questions[qIndex].topic
      if (topic) setMissedTopics(prev => [...new Set([...prev, topic])])
    }
  }

  async function handleNext() {
    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1)
      setSelectedOption(null)
      setAnswered(false)
    } else {
      await finishQuiz()
    }
  }

  async function finishQuiz() {
    const percentage = Math.round((correctCount / questions.length) * 100)
    const passed = percentage >= PASS_THRESHOLD
    const isFirstPass = passed && !progressRow?.passed

    const newBest = Math.max(progressRow?.best_score || 0, percentage)
    const newAttempts = (progressRow?.attempts || 0) + 1

    const { data: upserted, error: upsertError } = await supabase
      .from('phase_progress')
      .upsert({
        user_id: user.id,
        phase_number: phaseNumber,
        best_score: newBest,
        passed: passed || progressRow?.passed || false,
        attempts: newAttempts,
        completed_at: passed ? new Date().toISOString() : progressRow?.completed_at || null
      }, { onConflict: 'user_id,phase_number' })
      .select()
      .single()

    if (upsertError) {
      console.error('Phase progress upsert error:', upsertError)
      setError("Your score was calculated, but we couldn't save your progress. Please try again.")
    } else {
      setProgressRow(upserted)
    }

    logEvent(user.id, passed ? 'quiz_passed' : 'quiz_failed', { phase_number: phaseNumber, percentage, attempt: newAttempts })

    if (isFirstPass && !upsertError) {
      const newXp = await awardXp(user.id, xp, 50)
      setXp(newXp)
    }

    setStage('results')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F7FA' }}>
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error && !phase) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F7FA' }}>
        <p style={{ color: '#991B1B' }}>{error}</p>
      </div>
    )
  }

  const percentage = questions.length ? Math.round((correctCount / questions.length) * 100) : 0
  const passedThisAttempt = percentage >= PASS_THRESHOLD
  const currentQuestion = questions[qIndex]

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar xp={xp} streak={streak} />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold mb-6 inline-block" style={{ color: '#6B7A99' }}>
          ← Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0A2342' }}>{phase.title} — Phase Quiz</h1>
        <p className="text-sm mb-8" style={{ color: '#6B7A99' }}>
          {progressRow?.passed ? `Best score: ${progressRow.best_score}% — Passed ✓` : `Pass with ${PASS_THRESHOLD}% or higher to unlock the next phase`}
        </p>

        {stage === 'intro' && (
          <div className="bg-white rounded-3xl p-8 text-center" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>
            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
            )}
            <p className="text-sm mb-6" style={{ color: '#1E293B' }}>
              This quiz covers everything from this phase. You'll need {PASS_THRESHOLD}% or higher to pass and unlock the next phase.
            </p>
            <button onClick={startQuiz}
              className="px-8 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#D4AF37', color: '#0A2342' }}>
              {progressRow ? 'Retake Quiz' : 'Start Quiz'}
            </button>
          </div>
        )}

        {stage === 'generating' && (
          <div className="bg-white rounded-3xl p-10 text-center" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>
            <div className="w-10 h-10 rounded-full border-4 animate-spin mx-auto mb-4" style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
            <p className="font-medium" style={{ color: '#0A2342' }}>Putting your exam together...</p>
            <p className="text-sm mt-1" style={{ color: '#6B7A99' }}>Covering everything from this phase</p>
          </div>
        )}

        {stage === 'quiz' && currentQuestion && (
          <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold" style={{ color: '#6B7A99' }}>
                QUESTION {qIndex + 1} OF {questions.length}
              </p>
              <div className="flex gap-1 flex-wrap max-w-50 justify-end">
                {questions.map((_, i) => (
                  <div key={i} className="w-4 h-1.5 rounded-full" style={{ background: i <= qIndex ? '#D4AF37' : '#E2E8F0' }} />
                ))}
              </div>
            </div>

            <p className="text-sm font-bold mb-4" style={{ color: '#0A2342' }}>{currentQuestion.question}</p>

            <div className="space-y-2 mb-4">
              {currentQuestion.options.map((opt, i) => {
                const isCorrect = i === currentQuestion.correctIndex
                const isSelected = i === selectedOption
                let bg = '#FAFAFA', border = '#E2E8F0'
                if (answered && isSelected) {
                  bg = isCorrect ? '#E8F5E9' : '#FEE2E2'
                  border = isCorrect ? '#2E7D32' : '#991B1B'
                }
                return (
                  <button key={i} onClick={() => handleAnswer(i)} disabled={answered}
                    className="w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all"
                    style={{ borderColor: border, background: bg, color: '#0A2342' }}>
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                )
              })}
            </div>

            {answered && (
              <button onClick={handleNext}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#D4AF37', color: '#0A2342' }}>
                {qIndex < questions.length - 1 ? 'Next question →' : 'See results'}
              </button>
            )}
          </div>
        )}

        {stage === 'results' && (
          <div className="bg-white rounded-3xl p-8 text-center" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>
            <p className="text-5xl font-bold mb-2" style={{ color: passedThisAttempt ? '#2E7D32' : '#991B1B' }}>
              {percentage}%
            </p>
            <p className="text-sm mb-6" style={{ color: '#6B7A99' }}>
              {correctCount} out of {questions.length} correct
            </p>

            {error && (
              <div className="rounded-2xl p-4 mb-4 text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                {error}
              </div>
            )}

            {passedThisAttempt ? (
              <div className="rounded-2xl p-5 mb-6" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                🎉 You passed! The next phase is now unlocked.
              </div>
            ) : (
              <div className="rounded-2xl p-5 mb-6 text-left" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                <p className="font-bold mb-2">You need {PASS_THRESHOLD}% to pass.</p>
                {missedTopics.length > 0 ? (
                  <>
                    <p className="text-sm mb-2">Here's specifically what to review:</p>
                    <ul className="text-sm list-disc pl-5 space-y-1">
                      {missedTopics.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm">Review the lessons and try again.</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!passedThisAttempt && (
                <button onClick={startQuiz}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: '#D4AF37', color: '#0A2342' }}>
                  Try Again
                </button>
              )}
              {!passedThisAttempt && missedTopics.length > 0 && (
                <Link to={`/remediate/${phaseNumber}`} state={{ topics: missedTopics }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border-2 text-center transition-all"
                  style={{ borderColor: '#D4AF37', color: '#0A2342' }}>
                  Review Weak Topics →
                </Link>
              )}
              <Link to="/dashboard"
                className="flex-1 py-3 rounded-xl text-sm font-bold border-2 text-center transition-all"
                style={{ borderColor: '#0A2342', color: '#0A2342' }}>
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
