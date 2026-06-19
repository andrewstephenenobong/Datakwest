import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

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
  const [activeIndex, setActiveIndex] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [qIndex, setQIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [answered, setAnswered] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('roadmap, assessment')
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

  async function openLesson(index) {
    const status = getLessonStatus(index)
    if (status === 'locked') return

    setError('')
    setActiveIndex(index)
    setQIndex(0)
    setSelectedOption(null)
    setAnswered(false)

    const existingRow = lessonRows.find(r => r.lesson_index === index)
    if (existingRow?.content) {
      setViewMode('content')
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
          completed: false
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      setLessonRows(prev => [...prev.filter(r => r.lesson_index !== index), upserted])
    } catch (err) {
      console.error(err)
      setError(`Error generating lesson: ${err.message}`)
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

  async function markComplete() {
    const row = lessonRows.find(r => r.lesson_index === activeIndex)
    if (!row) return

    const { error: updateError } = await supabase
      .from('lessons')
      .update({ completed: true })
      .eq('id', row.id)

    if (!updateError) {
      setLessonRows(prev =>
        prev.map(r => r.id === row.id ? { ...r, completed: true } : r)
      )
    }

    setViewMode('path')
    setActiveIndex(null)
    setQIndex(0)
    setSelectedOption(null)
    setAnswered(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F7FA' }}>
        <div className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
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

  const allCompleted = lessonTitles.every(
    (_, i) => lessonRows.find(r => r.lesson_index === i)?.completed
  )
  const activeContent = activeIndex !== null
    ? lessonRows.find(r => r.lesson_index === activeIndex)?.content
    : null
  const questions = activeContent?.checkQuestions || []
  const currentQuestion = questions[qIndex]

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold mb-6 inline-block"
          style={{ color: '#6B7A99' }}>
          ← Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0A2342' }}>{phase.title}</h1>
        <p className="text-sm mb-8" style={{ color: '#6B7A99' }}>{phase.weeks}</p>

        {/* LESSON PATH VIEW */}
        {viewMode === 'path' && (
          <div className="space-y-4">
            {allCompleted && (
          <div className="rounded-2xl p-6 text-center mb-4" style={{ background: '#E8F5E9' }}>
            <p className="font-bold mb-3" style={{ color: '#2E7D32' }}>🎉 All lessons complete!</p>
            <Link to={`/quiz/${phaseNumber}`}
             className="inline-block px-6 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#D4AF37', color: '#0A2342' }}>
              Take Phase Quiz →
           </Link>
        </div>
      )}

            {lessonTitles.map((title, index) => {
              const status = getLessonStatus(index)
              return (
                <button
                  key={index}
                  onClick={() => openLesson(index)}
                  disabled={status === 'locked'}
                  className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 text-left transition-all"
                  style={{
                    boxShadow: '0 2px 12px rgba(10,35,66,0.06)',
                    opacity: status === 'locked' ? 0.5 : 1,
                    cursor: status === 'locked' ? 'default' : 'pointer'
                  }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{
                      background: status === 'completed' ? '#0A2342' : status === 'current' ? '#D4AF37' : '#E2E8F0',
                      color: status === 'locked' ? '#6B7A99' : 'white'
                    }}>
                    {status === 'completed' ? '✓' : index + 1}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#0A2342' }}>{title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7A99' }}>
                      {status === 'completed' ? 'Completed' : status === 'current' ? 'Start lesson' : 'Locked'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* LESSON CONTENT VIEW */}
        {viewMode === 'content' && (
          <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>

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
                {/* Lesson Title */}
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => { setViewMode('path'); setActiveIndex(null) }}
                    className="text-sm font-semibold" style={{ color: '#6B7A99' }}>←</button>
                  <h2 className="text-xl font-bold" style={{ color: '#0A2342' }}>
                    {lessonTitles[activeIndex]}
                  </h2>
                </div>

                {/* Explanation */}
                <div className="text-sm mb-6 space-y-3 leading-relaxed" style={{ color: '#1E293B' }}>
                  {activeContent.explanation.split('\n').filter(Boolean).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {/* Key Points */}
                {activeContent.keyPoints?.length > 0 && (
                  <div className="rounded-2xl p-5 mb-6" style={{ background: '#F5F7FA' }}>
                    <p className="text-xs font-bold mb-3" style={{ color: '#0A2342' }}>📌 KEY POINTS</p>
                    <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: '#1E293B' }}>
                      {activeContent.keyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Example */}
                {activeContent.example && (
                  <div className="rounded-2xl p-5 mb-6"
                    style={{ background: '#FFFBEF', border: '1px solid #D4AF37' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: '#0A2342' }}>💡 REAL-WORLD EXAMPLE</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#1E293B' }}>{activeContent.example}</p>
                  </div>
                )}

                {/* Exercise */}
                {activeContent.exercise && (
                  <div className="rounded-2xl p-5 mb-6"
                    style={{ background: '#F0F4FF', border: '1px solid #0A2342' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: '#0A2342' }}>🏋️ TRY IT YOURSELF</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#1E293B' }}>{activeContent.exercise}</p>
                  </div>
                )}

                {/* Quiz Questions */}
                {currentQuestion && (
                  <div className="border-t pt-6" style={{ borderColor: '#E2E8F0' }}>
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-semibold" style={{ color: '#6B7A99' }}>
                        QUIZ — QUESTION {qIndex + 1} OF {questions.length}
                      </p>
                      <div className="flex gap-1">
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
                            className="w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all"
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
                )}

                {/* No questions fallback */}
                {!currentQuestion && !generating && (
                  <button onClick={markComplete}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all mt-4"
                    style={{ background: '#D4AF37', color: '#0A2342' }}>
                    Mark as complete ✓
                  </button>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}