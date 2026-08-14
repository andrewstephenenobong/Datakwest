import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function Remediate() {
  const { id } = useParams()
  const phaseNumber = parseInt(id, 10)
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const topics = location.state?.topics || []

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [remediation, setRemediation] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    async function load() {
      if (topics.length === 0) {
        setError('No weak topics to review. Go back and retake the quiz.')
        setLoading(false)
        return
      }

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

      setPhase(foundPhase)
      setAssessment(profile.assessment)
      setLoading(false)
      await generateRemediation(foundPhase, profile.assessment)
    }

    if (user) load()
    // The generator is intentionally called once per authenticated phase load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, phaseNumber])

  async function generateRemediation(foundPhase, assessmentData) {
    setGenerating(true)
    setError('')

    try {
      const backgroundSummary = assessmentData
        ? `${assessmentData.background || ''}. Excel: ${assessmentData.excelLevel || 'unknown'}. Coding: ${assessmentData.coding || 'unknown'}. SQL: ${assessmentData.sql || 'unknown'}.`
        : 'beginner'

      const { data, error: fnError } = await supabase.functions.invoke('generate-remediation', {
        body: { phaseTitle: foundPhase.title, topics, background: backgroundSummary }
      })

      if (fnError) throw fnError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))

      setRemediation(data.remediation)
    } catch (err) {
      console.error('Remediation generation error:', err)
      setError("We couldn't put your review together right now. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F7FA' }}>
        <div className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error && !generating && !remediation) {
    return (
      <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
          <p className="mb-4" style={{ color: '#991B1B' }}>{error}</p>
          <Link to={`/quiz/${phaseNumber}`} className="font-semibold" style={{ color: '#0A2342' }}>
            ← Back to Quiz
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to={`/quiz/${phaseNumber}`} className="text-sm font-semibold mb-6 inline-block" style={{ color: '#6B7A99' }}>
          ← Back to Quiz
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0A2342' }}>
          {phase?.title} — Focused Review
        </h1>
        <p className="text-sm mb-8" style={{ color: '#6B7A99' }}>
          Reviewing {topics.length} topic{topics.length !== 1 ? 's' : ''} you missed
        </p>

        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>
          {generating ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-full border-4 animate-spin mx-auto mb-4"
                style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
              <p className="font-medium" style={{ color: '#0A2342' }}>Putting your review together...</p>
            </div>
          ) : error ? (
            <div>
              <p className="text-sm mb-4" style={{ color: '#991B1B' }}>{error}</p>
              <button onClick={() => generateRemediation(phase, assessment)}
                className="px-5 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#D4AF37', color: '#0A2342' }}>
                Try again
              </button>
            </div>
          ) : remediation ? (
            <>
              <div className="rounded-2xl p-4 mb-6" style={{ background: '#FFFBEF', border: '1px solid #D4AF37' }}>
                <p className="text-sm" style={{ color: '#1E293B' }}>{remediation.intro}</p>
              </div>

              <div className="space-y-5 mb-8">
                {remediation.topicReviews?.map((item, i) => (
                  <div key={i} className="rounded-2xl p-5" style={{ background: '#F5F7FA' }}>
                    <p className="text-xs font-bold tracking-wide mb-2" style={{ color: '#0A2342' }}>
                      {item.topic.toUpperCase()}
                    </p>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: '#1E293B' }}>
                      {item.explanation}
                    </p>
                    {item.tip && (
                      <div className="rounded-xl p-3" style={{ background: '#0A2342' }}>
                        <p className="text-xs font-bold mb-1" style={{ color: '#D4AF37' }}>💡 TIP</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.tip}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => navigate(`/quiz/${phaseNumber}`)}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#D4AF37', color: '#0A2342' }}>
                I'm ready — Retake the Quiz
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
