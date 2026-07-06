import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { getDisplayStreak } from '../lib/gamification'

const skillLabels = {
  excel: 'Excel', sql: 'SQL', python: 'Python',
  statistics: 'Statistics', powerBI: 'Power BI', dataViz: 'Data Viz'
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [progress, setProgress] = useState([])
  const [skillProgress, setSkillProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (!data.onboarding_completed) {
        navigate('/onboarding')
        return
      }

      const { displayStreak, isActiveToday } = getDisplayStreak(data.streak, data.last_active_date)

      const { data: progressRows } = await supabase
        .from('phase_progress')
        .select('*')
        .eq('user_id', user.id)

      setProfile({ ...data, streak: displayStreak, streakActiveToday: isActiveToday })
      setSkillProgress(data.skill_progress || {})
      setProgress(progressRows || [])
      setLoading(false)
    }

    if (user) loadProfile()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F7FA' }}>
        <div className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error || !profile?.roadmap) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F7FA' }}>
        <p style={{ color: '#991B1B' }}>{error || 'No roadmap found.'}</p>
      </div>
    )
  }

  const { roadmap, streak, xp } = profile
  const skillValues = Object.values(roadmap.skillLevels || {})
  const masteryScore = skillValues.length
    ? Math.round(skillValues.reduce((a, b) => a + b, 0) / skillValues.length)
    : 0

  const totalPhases = roadmap.phases?.length || 0
  const passedPhaseNumbers = new Set(progress.filter(p => p.passed).map(p => p.phase_number))
  const sortedPhaseNumbers = (roadmap.phases || []).map(p => p.number).sort((a, b) => a - b)
  const currentPhase = sortedPhaseNumbers.find(n => !passedPhaseNumbers.has(n)) || sortedPhaseNumbers[sortedPhaseNumbers.length - 1] || 1
  const allPhasesPassed = totalPhases > 0 && passedPhaseNumbers.size === totalPhases

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar streak={streak} xp={xp} streakActive={profile.streakActiveToday} />

      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0A2342' }}>Your Personalized Roadmap</h1>
            <p className="text-sm mt-1" style={{ color: '#6B7A99' }}>Complete Beginner → Professional Data Analyst</p>
          </div>
          <span className="text-xs font-bold px-4 py-2 rounded-full"
            style={{ background: allPhasesPassed ? '#E8F5E9' : '#FFFBEF', color: allPhasesPassed ? '#2E7D32' : '#D4AF37', border: `1px solid ${allPhasesPassed ? '#2E7D32' : '#D4AF37'}` }}>
            {allPhasesPassed ? 'All Phases Complete 🎉' : 'In Progress'}
          </span>
        </div>

        <Link to="/tracks"
          className="block rounded-2xl p-5 mb-8 transition-all"
          style={{ background: '#0A2342', boxShadow: '0 2px 12px rgba(10,35,66,0.15)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-bold text-white">🐍 Want to go deeper on one skill?</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Explore standalone Skill Tracks — beginner to advanced, at your own pace
              </p>
            </div>
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#D4AF37' }}>Explore →</span>
          </div>
        </Link>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Mastery Score', value: `${masteryScore}%` },
            { label: 'Phases', value: totalPhases },
            { label: 'Current Phase', value: `${Math.min(currentPhase, totalPhases)} / ${totalPhases}` },
            { label: 'Phases Passed', value: `${passedPhaseNumbers.size} / ${totalPhases}`, highlight: true }
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-5 text-center" style={{ background: 'white', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
              <p className="text-xs mb-1" style={{ color: '#6B7A99' }}>{stat.label}</p>
              <p className="text-xl font-bold" style={{ color: stat.highlight ? '#D4AF37' : '#0A2342' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 mb-8" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <h3 className="text-sm font-bold mb-5" style={{ color: '#0A2342' }}>Your skill levels</h3>
          <div className="space-y-4">
            {Object.entries(roadmap.skillLevels || {}).map(([key, startingValue]) => {
              const grown = Math.min(100, Math.round((startingValue || 0) + (skillProgress[key] || 0)))
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: '#0A2342' }}>{skillLabels[key] || key}</span>
                    <span style={{ color: '#6B7A99' }}>{grown}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: '#E2E8F0' }}>
                    <div className="h-2 rounded-full transition-all duration-500" style={{ background: '#0A2342', width: `${grown}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <h3 className="text-sm font-bold mb-4" style={{ color: '#0A2342' }}>Your learning journey</h3>
        <div className="space-y-4 mb-8">
          {roadmap.phases?.map((phase) => {
            const isPassed = passedPhaseNumbers.has(phase.number)
            const isActive = phase.number <= currentPhase

            return (
              <button
                key={phase.number}
                onClick={() => isActive && navigate(`/lesson/${phase.number}`)}
                disabled={!isActive}
                className="w-full text-left bg-white rounded-2xl p-6 transition-all"
                style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)', opacity: isActive ? 1 : 0.5, cursor: isActive ? 'pointer' : 'default' }}
              >
                <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold" style={{ color: isPassed ? '#2E7D32' : '#D4AF37' }}>
                      {isPassed ? '✓' : String(phase.number).padStart(2, '0')}
                    </span>
                    <h4 className="font-bold" style={{ color: '#0A2342' }}>{phase.title}</h4>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap" style={{ background: '#F5F7FA', color: '#6B7A99' }}>
                    {phase.weeks}
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#6B7A99' }}>{phase.topics}</p>
                {isPassed && (
                  <p className="text-xs font-semibold mt-2" style={{ color: '#2E7D32' }}>Passed ✓ — click to review</p>
                )}
                {!isActive && (
                  <p className="text-xs font-semibold mt-2" style={{ color: '#6B7A99' }}>🔒 Complete the previous phase to unlock</p>
                )}
              </button>
            )
          })}
        </div>

        {roadmap.estimatedTimeline && (
          <div className="rounded-2xl p-5 text-sm" style={{ background: '#E8F0FE', color: '#1E3A5F' }}>
            <strong>Estimated timeline:</strong> {roadmap.estimatedTimeline}
          </div>
        )}
      </div>
    </div>
  )
}