import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { getDisplayStreak } from '../lib/gamification'
import { completeDailyMission, getTodaysMission } from '../lib/missions'
import { getReadinessScore } from '../lib/readiness'

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
  const [mission, setMission] = useState(null)
  const [missionLoading, setMissionLoading] = useState(false)
  const [missionError, setMissionError] = useState('')
  const [readiness, setReadiness] = useState(null)
  const [readinessError, setReadinessError] = useState('')

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

      const { mission: todaysMission, error: missionLoadError } = await getTodaysMission(user.id)
      const { readiness: readinessScore, error: readinessLoadError } = await getReadinessScore()

      setProfile({ ...data, streak: displayStreak, streakActiveToday: isActiveToday })
      setSkillProgress(data.skill_progress || {})
      setProgress(progressRows || [])
      setMission(todaysMission)
      setMissionError(missionLoadError?.message || '')
      setReadiness(readinessScore)
      setReadinessError(readinessLoadError?.message || '')
      setLoading(false)
    }

    if (user) loadProfile()
  }, [user, navigate])

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
  const missionPayload = mission?.payload || {}

  async function handleMissionComplete() {
    if (!mission || mission.status === 'completed') return
    setMissionLoading(true)
    setMissionError('')

    const { result, error: completionError } = await completeDailyMission(mission.id)
    if (completionError) {
      setMissionError(completionError.message)
      setMissionLoading(false)
      return
    }

    setMission((current) => ({
      ...current,
      status: result?.status || 'completed',
      completed_at: new Date().toISOString(),
    }))
    setProfile((current) => current ? {
      ...current,
      xp: (current.xp || 0) + (result?.xp_awarded || 0),
      streak: result?.streak ?? current.streak,
      streakActiveToday: true,
    } : current)
    setMissionLoading(false)
  }

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
            { label: 'Readiness', value: readiness ? `${readiness.score}%` : '—' },
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

        <section className="rounded-2xl p-6 mb-8" style={{ background: 'white', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }} aria-labelledby="readiness-title">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7A99' }}>Career readiness</p>
              <h2 id="readiness-title" className="text-xl font-bold mt-1" style={{ color: '#0A2342' }}>
                {readiness ? `${readiness.score}% — ${readiness.band === 'ready' ? 'Ready to apply' : readiness.band === 'building' ? 'Building confidence' : 'Start building evidence'}` : 'Readiness is being calculated'}
              </h2>
              <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>
                This score is calculated from verified practice, completed missions, and reviewed project evidence.
              </p>
            </div>
            {readiness && <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#E8F0FE', color: '#1E3A5F' }}>Rubric v{readiness.rubric_version}</span>}
          </div>
          {readiness && (
            <div className="grid grid-cols-3 gap-3 mt-5 text-center">
              {[
                ['Practice', readiness.factors?.practice_average],
                ['Missions', readiness.factors?.mission_completion],
                ['Projects', readiness.factors?.reviewed_projects],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl p-3" style={{ background: '#F5F7FA' }}>
                  <p className="text-xs" style={{ color: '#6B7A99' }}>{label}</p>
                  <p className="font-bold mt-1" style={{ color: '#0A2342' }}>{value ?? 0}%</p>
                </div>
              ))}
            </div>
          )}
          {readinessError && <p className="text-xs mt-4" style={{ color: '#991B1B' }}>{readinessError}</p>}
        </section>

        <section className="rounded-2xl p-6 mb-8" style={{ background: '#0A2342', boxShadow: '0 2px 12px rgba(10,35,66,0.12)' }} aria-labelledby="daily-mission-title">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Today’s mission</p>
              <h2 id="daily-mission-title" className="text-xl font-bold text-white mt-1">
                {mission ? (missionPayload.title || 'Complete your next learning action') : 'Your next learning action is being prepared'}
              </h2>
              <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {mission ? (missionPayload.description || 'Make measurable progress with one focused task today.') : 'Return soon for a personalised mission aligned to your roadmap.'}
              </p>
            </div>
            {mission && (
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: mission.status === 'completed' ? '#DDF5E3' : '#FFFBEF', color: mission.status === 'completed' ? '#2E7D32' : '#8A6500' }}>
                {mission.status === 'completed' ? 'Completed' : 'Ready'}
              </span>
            )}
          </div>
          {missionError && <p className="text-xs mt-4" style={{ color: '#FECACA' }}>{missionError}</p>}
          {mission && mission.status !== 'completed' && (
            <button
              type="button"
              onClick={handleMissionComplete}
              disabled={missionLoading}
              className="mt-5 px-5 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
              style={{ background: '#D4AF37', color: '#0A2342' }}
            >
              {missionLoading ? 'Saving progress…' : 'Mark mission complete'}
            </button>
          )}
          {mission?.status === 'completed' && (
            <p className="text-sm font-semibold mt-5" style={{ color: '#CDEFD5' }}>Progress recorded. Your XP and streak have been updated.</p>
          )}
        </section>

        <Link to="/project" className="block rounded-2xl p-6 mb-8 transition-opacity hover:opacity-90" style={{ background: '#E8F0FE', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#1E3A5F' }}>Build your portfolio</p>
              <h2 className="text-lg font-bold mt-1" style={{ color: '#0A2342' }}>Submit a project when you are ready</h2>
              <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Capture what you built, what you learned, and the evidence behind your progress.</p>
            </div>
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#0A2342' }}>Open project →</span>
          </div>
        </Link>

        <Link to="/tutor" className="block rounded-2xl p-6 mb-8 transition-opacity hover:opacity-90" style={{ background: '#FFFBEF', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#8A6500' }}>Tutor AI</p>
              <h2 className="text-lg font-bold mt-1" style={{ color: '#0A2342' }}>Get unstuck without skipping the work</h2>
              <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Ask questions, explore examples, and build independent confidence.</p>
            </div>
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#0A2342' }}>Ask Tutor →</span>
          </div>
        </Link>

        <Link to="/portfolio" className="block rounded-2xl p-6 mb-8 transition-opacity hover:opacity-90" style={{ background: '#EAF7F0', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#2E7D32' }}>Portfolio</p>
              <h2 className="text-lg font-bold mt-1" style={{ color: '#0A2342' }}>See the evidence behind your progress</h2>
              <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Review project submissions, reflections, and feedback in one place.</p>
            </div>
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#0A2342' }}>Open portfolio →</span>
          </div>
        </Link>

        <Link to="/achievements" className="block rounded-2xl p-6 mb-8 transition-opacity hover:opacity-90" style={{ background: '#F2ECFF', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>Achievements</p>
              <h2 className="text-lg font-bold mt-1" style={{ color: '#0A2342' }}>Turn momentum into milestones</h2>
              <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>See verified XP, streak progress, and badges earned from your work.</p>
            </div>
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#0A2342' }}>View achievements →</span>
          </div>
        </Link>

        <Link to="/notifications" className="block rounded-2xl p-6 mb-8 transition-opacity hover:opacity-90" style={{ background: '#F0F6FF', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#1E5AA8' }}>Notifications</p>
              <h2 className="text-lg font-bold mt-1" style={{ color: '#0A2342' }}>Keep up with your learning updates</h2>
              <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>See mission, project review, and Tutor follow-up notifications.</p>
            </div>
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#0A2342' }}>Open inbox →</span>
          </div>
        </Link>

        <Link to="/skill-tree" className="block rounded-2xl p-6 mb-8 transition-opacity hover:opacity-90" style={{ background: '#FFF8E6', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#8A6500' }}>Skill tree</p>
              <h2 className="text-lg font-bold mt-1" style={{ color: '#0A2342' }}>See how your skills connect</h2>
              <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Explore published concepts, practice nodes, and what comes next.</p>
            </div>
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#0A2342' }}>Open skill tree →</span>
          </div>
        </Link>

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