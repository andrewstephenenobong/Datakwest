import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getChallengeCenter } from '../lib/challenges'

const typeLabels = {
  weekly: 'Weekly challenge',
  monthly: 'Monthly challenge',
  seasonal: 'Seasonal challenge',
  battle: 'Battle',
  adventure: 'Adventure',
  simulation: 'Simulation',
}

function formatDate(value) {
  if (!value) return 'Date to be announced'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Challenges() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadChallenges() {
      const { center, error: centerError } = await getChallengeCenter()
      setChallenges(center.challenges || [])
      setError(centerError?.message || '')
      setLoading(false)
    }

    if (user) loadChallenges()
  }, [user])

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Learn by doing</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Challenges</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>Take on structured learning challenges designed to turn knowledge into evidence.</p>
        </div>

        {error && <div className="rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>Loading challenges…</div>
        ) : challenges.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
            <h2 className="font-bold" style={{ color: '#0A2342' }}>No challenges are open right now</h2>
            <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>New challenges will appear here when they are published by the DataKwest learning team.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {challenges.map((challenge) => (
              <article key={challenge.id} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>{typeLabels[challenge.challenge_type] || 'Learning challenge'}</p>
                    <h2 className="text-xl font-bold mt-2" style={{ color: '#0A2342' }}>{challenge.title}</h2>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: challenge.status === 'active' ? '#EAF7F0' : '#FFFBEF', color: challenge.status === 'active' ? '#2E7D32' : '#8A6500' }}>
                    {challenge.status === 'active' ? 'Open now' : 'Coming soon'}
                  </span>
                </div>
                <p className="text-sm mt-4" style={{ color: '#6B7A99' }}>{challenge.description || 'Build practical evidence through a focused learning challenge.'}</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
                  <div className="rounded-xl p-3" style={{ background: '#F5F7FA' }}>
                    <p className="text-xs" style={{ color: '#6B7A99' }}>Starts</p>
                    <p className="font-semibold mt-1" style={{ color: '#0A2342' }}>{formatDate(challenge.starts_at)}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: '#F5F7FA' }}>
                    <p className="text-xs" style={{ color: '#6B7A99' }}>Ends</p>
                    <p className="font-semibold mt-1" style={{ color: '#0A2342' }}>{formatDate(challenge.ends_at)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
