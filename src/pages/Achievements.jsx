import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getLearnerAchievements } from '../lib/achievements'

export default function Achievements() {
  const { user } = useAuth()
  const [achievements, setAchievements] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadAchievements() {
      const { achievements: data, error: achievementsError } = await getLearnerAchievements()
      setAchievements(data)
      setError(achievementsError?.message || '')
      setLoading(false)
    }

    if (user) loadAchievements()
  }, [user])

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Your momentum</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Achievements</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>Every badge is tied to real learning evidence, not a self-reported claim.</p>
        </div>

        {error && <div className="rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>Loading your achievements…</div>
        ) : achievements && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                ['XP', achievements.xp || 0],
                ['Missions', achievements.missions_completed || 0],
                ['Current streak', achievements.current_streak || 0],
                ['Longest streak', achievements.longest_streak || 0],
              ].map(([label, value]) => (
                <div key={label} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#6B7A99' }}>{label}</p>
                  <p className="text-2xl font-bold mt-2" style={{ color: '#0A2342' }}>{value}</p>
                </div>
              ))}
            </div>
            <section className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
              <h2 className="text-lg font-bold mb-5" style={{ color: '#0A2342' }}>Earned badges</h2>
              {achievements.badges?.length ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {achievements.badges.map((badge) => (
                    <article key={badge.slug} className="rounded-xl p-4" style={{ background: '#FFFBEF', border: '1px solid #F3E4AA' }}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl" aria-hidden="true">★</span>
                        <div>
                          <h3 className="font-bold" style={{ color: '#0A2342' }}>{badge.title}</h3>
                          <p className="text-sm mt-1" style={{ color: '#6B7A99' }}>{badge.description}</p>
                          {badge.awarded_at && <time className="block text-xs mt-3" style={{ color: '#8A6500' }} dateTime={badge.awarded_at}>Awarded {new Date(badge.awarded_at).toLocaleDateString()}</time>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="text-sm" style={{ color: '#6B7A99' }}>Complete a mission or submit a project to earn your first badge.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
