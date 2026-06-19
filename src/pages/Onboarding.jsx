import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const steps = [
  {
    key: 'background',
    question: "What's your background?",
    options: ['Student, no work experience', 'Working professional', 'Career switcher', 'Recent graduate']
  },
  {
    key: 'goal',
    question: "What's your main goal?",
    options: ['Get hired as a Data Analyst', 'Freelance / consulting work', 'Build skills for my current job', 'Just exploring for now']
  },
  {
    key: 'availability',
    question: 'How much time can you commit weekly?',
    options: ['Less than 5 hrs/week', '5–10 hrs/week', '10–20 hrs/week', '20+ hrs/week (full-time)']
  },
  {
    key: 'excelLevel',
    question: "What's your Excel experience?",
    options: ['No experience at all', 'Basic formatting only', 'Comfortable with formulas', 'Advanced (pivot tables, macros)']
  },
  {
    key: 'coding',
    question: 'Do you have any coding experience?',
    options: ['No experience at all', "A little, I've tried before", 'Comfortable with basics', 'Experienced programmer']
  },
  {
    key: 'sql',
    question: "What's your SQL experience?",
    options: ['No experience at all', 'Basic SELECT queries', 'Comfortable with joins & subqueries', 'Advanced SQL']
  },
  {
    key: 'targetIndustry',
    question: 'Any specific industry you want to target?',
    options: ['General business (open)', 'Finance', 'Tech', 'Healthcare', 'Marketing']
  },
  {
    key: 'learningStyle',
    question: 'How do you like to learn?',
    options: ['Theory + practice together', 'Practice-first, theory later', 'Visual / diagram-heavy explanations', 'Reading & documentation']
  },
  {
    key: 'device',
    question: 'What device will you mainly use?',
    options: ['Windows PC', 'Mac', 'Linux', 'Mobile phone only (no PC)']
  }
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [otherText, setOtherText] = useState('')

  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  async function handleSelect(value) {
    setError('')
    const updatedAnswers = { ...answers, [step.key]: value }
    setAnswers(updatedAnswers)
    setShowOtherInput(false)
    setOtherText('')

    if (isLastStep) {
      await generateRoadmap(updatedAnswers)
    } else {
      setStepIndex(stepIndex + 1)
    }
  }

  function handleOtherSubmit() {
    if (otherText.trim()) handleSelect(otherText.trim())
  }

  function handleBack() {
    setError('')
    setShowOtherInput(false)
    setOtherText('')
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  async function generateRoadmap(finalAnswers) {
    setGenerating(true)
    setError('')

    try {
      if (!user) {
        throw new Error('No authenticated user found. Please log in again.')
      }

      const { data, error: fnError } = await supabase.functions.invoke('smart-task', {
        body: { assessment: finalAnswers }
      })

      if (fnError) throw fnError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          assessment: finalAnswers,
          roadmap: data.roadmap,
          onboarding_completed: true
        })

      if (upsertError) throw upsertError

      navigate('/dashboard')
    } catch (err) {
      console.error('Onboarding error:', err)
      setError("We couldn't build your roadmap right now. Please try again.")
      setGenerating(false)
    }
  }

  if (generating) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F7FA' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 animate-spin mx-auto mb-6"
            style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0A2342' }}>Building your personalized roadmap...</h2>
          <p className="text-sm" style={{ color: '#6B7A99' }}>This usually takes a few seconds</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: '#F5F7FA' }}>
      <div className="w-full max-w-xl">

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold tracking-widest" style={{ color: '#6B7A99' }}>
              QUESTION {stepIndex + 1} OF {steps.length}
            </span>
            {stepIndex > 0 && (
              <button onClick={handleBack} className="text-xs font-semibold" style={{ color: '#0A2342' }}>
                ← Back
              </button>
            )}
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: '#E2E8F0' }}>
            <div className="h-2 rounded-full transition-all duration-300"
              style={{ background: '#D4AF37', width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>
          <h2 className="text-2xl font-bold mb-8" style={{ color: '#0A2342' }}>{step.question}</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm break-words" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
          )}

          {!showOtherInput ? (
            <div className="space-y-3">
              {step.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className="w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all"
                  style={{ borderColor: '#E2E8F0', color: '#0A2342', background: '#FAFAFA' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.background = '#FFFBEF' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FAFAFA' }}
                >
                  {option}
                </button>
              ))}

              <button
                onClick={() => setShowOtherInput(true)}
                className="w-full text-left px-5 py-4 rounded-xl border-2 border-dashed text-sm font-medium transition-all"
                style={{ borderColor: '#E2E8F0', color: '#6B7A99', background: 'transparent' }}
              >
                Other (please specify)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={otherText}
                onChange={e => setOtherText(e.target.value)}
                placeholder="Type your answer..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#0A2342', color: '#0A2342' }}
                onKeyDown={e => { if (e.key === 'Enter') handleOtherSubmit() }}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleOtherSubmit}
                  disabled={!otherText.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: '#D4AF37', color: '#0A2342' }}
                >
                  Continue
                </button>
                <button
                  onClick={() => { setShowOtherInput(false); setOtherText('') }}
                  className="px-5 py-3 rounded-xl text-sm font-medium border-2"
                  style={{ borderColor: '#E2E8F0', color: '#6B7A99' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}