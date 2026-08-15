import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import OwlLoading from '../components/OwlLoading'
import { getAssessmentCenter } from '../lib/assessments'

export default function Assessments() {
  const { user } = useAuth()
  const [center, setCenter] = useState({ history: [], available: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCenter() {
      const { center: data, error: centerError } = await getAssessmentCenter()
      setCenter(data)
      setError(centerError?.message || '')
      setLoading(false)
    }

    if (user) loadCenter()
  }, [user])

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Measure your progress</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Assessments</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>Review your verified assessment evidence and see what is available next.</p>
        </div>

        {error && <div className="rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {loading ? (
          <OwlLoading message="Opening your assessment centre…" />
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-bold mb-4" style={{ color: '#0A2342' }}>Available assessments</h2>
              {center.available.length === 0 ? (
                <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
                  <p className="text-sm leading-6" style={{ color: '#6B7A99' }}>No published assessments are available yet. New baseline and skill checks will appear here when released.</p>
                  <div className="mt-4 flex flex-wrap gap-3"><Link to="/tracks" className="rounded-xl px-4 py-3 text-xs font-bold" style={{ background: '#0A2342', color: 'white' }}>Continue learning</Link><Link to="/tutor" className="rounded-xl border px-4 py-3 text-xs font-bold" style={{ borderColor: '#DCE5F0', color: '#2456A6' }}>Ask the Owl for a check-in</Link></div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {center.available.map((assessment) => (
                    <article key={assessment.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
                      <h3 className="font-bold" style={{ color: '#0A2342' }}>{assessment.title}</h3>
                      <p className="text-xs mt-2" style={{ color: '#6B7A99' }}>Version {assessment.version}</p>
                      <span className="inline-block mt-4 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: '#EAF7F0', color: '#2E7D32' }}>Published</span>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4" style={{ color: '#0A2342' }}>Your history</h2>
              {center.history.length === 0 ? (
                <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
                  <p className="text-sm leading-6" style={{ color: '#6B7A99' }}>Completed assessments and verified scores will appear here.</p>
                  <Link to="/practice" className="mt-4 inline-flex rounded-xl border px-4 py-3 text-xs font-bold" style={{ borderColor: '#DCE5F0', color: '#2456A6' }}>Build evidence through practice</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {center.history.map((attempt) => (
                    <article key={attempt.attempt_id} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold" style={{ color: '#0A2342' }}>{attempt.title}</h3>
                          <time className="block text-xs mt-2" style={{ color: '#6B7A99' }} dateTime={attempt.created_at}>{new Date(attempt.created_at).toLocaleString()}</time>
                        </div>
                        {attempt.score !== null && <span className="text-xl font-bold" style={{ color: '#0A2342' }}>{attempt.score}%</span>}
                      </div>
                      {attempt.feedback?.summary && <p className="text-sm mt-4" style={{ color: '#6B7A99' }}>{attempt.feedback.summary}</p>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
