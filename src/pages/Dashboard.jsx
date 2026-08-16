import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { getDisplayStreak } from '../lib/gamification'
import { completeDailyMission, getTodaysMission } from '../lib/missions'
import OwlLoading from '../components/OwlLoading'
import { getReadinessScore } from '../lib/readiness'
import { getNextLearningAction } from '../lib/learningIntelligence'

const skillLabels = {
  excel: 'Excel', sql: 'SQL', python: 'Python',
  statistics: 'Statistics', powerBI: 'Power BI', dataViz: 'Data Viz'
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [nextAction, setNextAction] = useState(null)
  const [nextActionError, setNextActionError] = useState('')
  const [missionResult, setMissionResult] = useState(null)
  const [todayMs] = useState(() => Date.now())
  const firstMissionWelcome = searchParams.get('welcome') === 'first-mission'

  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        setError('We could not load your learner profile. Please refresh and try again.')
        setLoading(false)
        return
      }

      if (!data) {
        setLoading(false)
        navigate('/onboarding', { replace: true })
        return
      }

      if (!data.onboarding_completed) {
        setLoading(false)
        navigate('/onboarding', { replace: true })
        return
      }

      const { displayStreak, isActiveToday } = getDisplayStreak(data.streak, data.last_active_date)

      const { data: progressRows } = await supabase
        .from('phase_progress')
        .select('*')
        .eq('user_id', user.id)

      const { mission: todaysMission, error: missionLoadError } = await getTodaysMission(user.id)
      const { readiness: readinessScore, error: readinessLoadError } = await getReadinessScore()
      const { data: activeEnrolment } = await supabase
        .from('learner_skill_enrolments')
        .select('id')
        .eq('learner_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      let nextLearningAction = null
      let nextLearningActionError = ''
      if (activeEnrolment?.id) {
        try {
          nextLearningAction = await getNextLearningAction(activeEnrolment.id)
        } catch (actionError) {
          nextLearningActionError = actionError?.message || 'The next learning action is temporarily unavailable.'
        }
      }

      setProfile({ ...data, streak: displayStreak, streakActiveToday: isActiveToday })
      setSkillProgress(data.skill_progress || {})
      setProgress(progressRows || [])
      setMission(todaysMission)
      setMissionError(missionLoadError?.message || '')
      setReadiness(readinessScore)
      setReadinessError(readinessLoadError?.message || '')
      setNextAction(nextLearningAction)
      setNextActionError(nextLearningActionError)
      setLoading(false)
    }

    if (user) loadProfile()
  }, [user, navigate])

  if (loading) return <OwlLoading message="Building your personalised workspace…" />

  if (error || !profile?.roadmap) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12" style={{ background: 'linear-gradient(145deg, #F7FAFF 0%, #EEF4FB 58%, #E6F3F0 100%)', color: '#0A2342' }}>
        <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full" style={{ background: 'rgba(212,175,55,.14)' }} />
        <div className="pointer-events-none absolute -right-24 bottom-20 h-72 w-72 rounded-full" style={{ background: 'rgba(139,198,181,.2)' }} />
        <section className="relative w-full max-w-md rounded-[2rem] border bg-white/90 p-6 text-center shadow-[0_18px_60px_rgba(10,35,66,.12)] backdrop-blur sm:p-9" aria-labelledby="dashboard-recovery-title">
          <div className="mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,198,181,.42), rgba(232,240,254,.25) 64%, transparent 65%)' }}>
            <img src="/datakwest-owl-3d.webp" alt="Datakwest owl helping restore your learning space" width="768" height="768" className="h-28 w-28 object-contain drop-shadow-xl" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[.2em]" style={{ color: '#9A7610' }}>A quick reset</p>
          <h1 id="dashboard-recovery-title" className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Your learning space needs one more step.</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6" style={{ color: '#6B7A99' }}>{error || 'Complete onboarding so DataKwest can build your roadmap, daily mission, and next best action.'}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => window.location.reload()} className="min-h-12 rounded-xl px-4 py-3 text-sm font-black transition-transform active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2456A6]" style={{ background: '#0A2342', color: 'white' }}>Refresh workspace</button><button type="button" onClick={() => navigate('/onboarding')} className="min-h-12 rounded-xl border-2 px-4 py-3 text-sm font-black transition-transform active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2456A6]" style={{ borderColor: '#DCE5F0', background: '#F5F7FA', color: '#0A2342' }}>Open onboarding</button></div>
          <p className="mt-5 text-xs" style={{ color: '#8A98AA' }}>Your account is safe. We only need to finish connecting your learner profile.</p>
        </section>
      </main>
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
  const daysSinceActive = profile.last_active_date ? Math.max(0, Math.floor((todayMs - new Date(profile.last_active_date).getTime()) / 86400000)) : 0
  const isReturningAfterBreak = daysSinceActive >= 14

  function openNextAction() {
    if (!nextAction) return
    if (nextAction.action_type === 'submit_project') return navigate('/project')
    if (nextAction.action_type === 'practice' || nextAction.action_type === 'review_misconception' || nextAction.action_type === 'review_prerequisite') return navigate('/practice')
    if (nextAction.action_type === 'reflect' || nextAction.action_type === 'complete_path_reflection') return navigate('/portfolio')
    if (nextAction.action_type === 'continue_learning' && nextAction.node_id) return navigate(`/lesson/${nextAction.node_id}`)
    return navigate('/tracks')
  }

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
    setMissionResult(result || { status: 'completed' })
    setProfile((current) => current ? {
      ...current,
      xp: (current.xp || 0) + (result?.xp_awarded || 0),
      streak: result?.streak ?? current.streak,
      streakActiveToday: true,
    } : current)
    setMissionLoading(false)
  }

  return (
    <div className="dashboard-page min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar streak={streak} xp={xp} streakActive={profile.streakActiveToday} />

      <div className="max-w-4xl mx-auto px-6 py-10">

        {firstMissionWelcome && <section className="mb-6 flex items-center gap-4 rounded-2xl border p-5" style={{ borderColor: '#F0D58A', background: '#FFF9E8' }} aria-labelledby="first-mission-welcome"><img src="/datakwest-owl-3d.webp" alt="Datakwest owl" width="96" height="96" className="h-16 w-16 shrink-0 object-contain" /><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.16em]" style={{ color: '#967414' }}>Your path is ready</p><h2 id="first-mission-welcome" className="mt-1 text-lg font-black" style={{ color: '#0A2342' }}>Start with one useful mission.</h2><p className="mt-1 text-sm leading-6" style={{ color: '#6B7A99' }}>Your first action is based on your chosen skill, pace, and the evidence you need to build next.</p></div><button type="button" onClick={() => document.getElementById('daily-mission-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="ml-auto shrink-0 rounded-xl px-4 py-3 text-xs font-black" style={{ background: '#0A2342', color: 'white' }}>See mission</button></section>}
        {isReturningAfterBreak && !firstMissionWelcome && <section className="dashboard-welcome mb-6 rounded-3xl border p-5 sm:p-6" aria-labelledby="welcome-back-title"><div className="dashboard-welcome-grid"><div className="dashboard-welcome-owl-wrap"><img src="/datakwest-owl-3d.webp" alt="Datakwest owl welcoming you back" width="96" height="96" className="dashboard-welcome-owl h-20 w-20 object-contain sm:h-24 sm:w-24" /></div><div className="dashboard-welcome-copy min-w-0"><p className="dashboard-welcome-eyebrow text-xs font-black uppercase tracking-[.16em]">Welcome back</p><h2 id="welcome-back-title" className="dashboard-welcome-title mt-1 text-2xl font-black tracking-tight sm:text-3xl">Restart gently. One useful step is enough.</h2><p className="dashboard-welcome-description mt-2 text-sm leading-6 sm:text-base">You have been away for {daysSinceActive} days. Your verified progress is safe; begin with {nextAction?.title || missionPayload.title || 'today’s mission'}.</p></div><button type="button" onClick={openNextAction} className="dashboard-welcome-cta min-h-12 w-full rounded-xl px-4 py-3 text-sm font-black sm:w-auto">Resume path</button></div></section>}

        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="dashboard-primary-heading text-2xl font-bold" style={{ color: '#0A2342' }}>Your Personalized Learning Workspace</h1>
            <p className="text-sm mt-1" style={{ color: '#6B7A99' }}>One focused action at a time, backed by verified progress.</p>
          </div>
          <span className="text-xs font-bold px-4 py-2 rounded-full"
            style={{ background: allPhasesPassed ? '#E8F5E9' : '#FFFBEF', color: allPhasesPassed ? '#2E7D32' : '#D4AF37', border: `1px solid ${allPhasesPassed ? '#2E7D32' : '#D4AF37'}` }}>
            {allPhasesPassed ? 'All Phases Complete 🎉' : 'In Progress'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Readiness', value: readiness ? `${readiness.score}%` : '—' },
            { label: 'Mastery Score', value: `${masteryScore}%` },
            { label: 'Phases', value: totalPhases },
            { label: 'Current Phase', value: `${Math.min(currentPhase, totalPhases)} / ${totalPhases}` },
            { label: 'Phases Passed', value: `${passedPhaseNumbers.size} / ${totalPhases}`, highlight: true }
          ].map((stat) => (
            <div key={stat.label} className="dashboard-light-surface rounded-2xl p-5 text-center" style={{ background: 'white', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
              <p className="text-xs mb-1" style={{ color: '#6B7A99' }}>{stat.label}</p>
              <p className="text-xl font-bold" style={{ color: stat.highlight ? '#D4AF37' : '#0A2342' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="dashboard-light-surface rounded-2xl p-6 mb-8" style={{ background: 'white', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }} aria-labelledby="readiness-title">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7A99' }}>Career readiness</p>
              <h2 id="readiness-title" className="dashboard-section-heading text-xl font-bold mt-1" style={{ color: '#0A2342' }}>
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
                  <p className="dashboard-metric-value font-bold mt-1" style={{ color: '#0A2342' }}>{value ?? 0}%</p>
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
            <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Mission completion explanation">
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.09)' }}><p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#D4AF37' }}>What changed</p><p className="mt-2 text-sm font-semibold text-white">The server recorded this mission as complete{missionResult?.xp_awarded ? ` and awarded ${missionResult.xp_awarded} XP` : ''}.</p></div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.09)' }}><p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#D4AF37' }}>Why it matters</p><p className="mt-2 text-sm font-semibold text-white">A completed mission adds verified momentum to your learning path and daily consistency.</p></div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.09)' }}><p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#D4AF37' }}>What next</p><p className="mt-2 text-sm font-semibold text-white">{nextAction?.title || 'Return to your next learning action when you are ready.'}</p>{nextAction && <button type="button" onClick={openNextAction} className="mt-3 text-xs font-black underline underline-offset-2" style={{ color: '#D4AF37' }}>Continue →</button>}</div>
            </div>
          )}
        </section>

        <section className="dashboard-next-action rounded-2xl p-6 mb-8" style={{ background: '#E8F0FE', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }} aria-labelledby="next-action-title">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#2456A6' }}>Next best action</p>
              <h2 id="next-action-title" className="dashboard-section-heading text-xl font-bold mt-1" style={{ color: '#0A2342' }}>{nextAction?.title || 'Your next action is being prepared'}</h2>
              <p className="text-sm mt-2" style={{ color: '#4B6385' }}>{nextAction?.instruction || 'Complete a focused step and submit evidence. Your mastery is updated by the server after verification.'}</p>
            </div>
            {nextAction?.evidence_kind && <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#FFFFFF', color: '#2456A6' }}>{nextAction.evidence_kind}</span>}
          </div>
          <div className="dashboard-next-action-content mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="rounded-xl p-4" style={{ background: '#FFFFFF' }}>
              <p className="text-xs font-bold" style={{ color: '#2456A6' }}>Why this is recommended</p>
              <p className="mt-1 text-sm leading-6" style={{ color: '#4B6385' }}>{nextAction?.instruction || 'The server will choose the next step after it verifies your learning evidence.'}</p>
              {nextAction && <p className="mt-2 text-xs" style={{ color: '#8290A5' }}>{nextAction.evidence_count || 0} verified evidence item{nextAction.evidence_count === 1 ? '' : 's'} · {nextAction.confidence_score != null ? `${Math.round(Number(nextAction.confidence_score) * 100)}% confidence` : 'confidence pending'}</p>}
            </div>
            {nextAction && <button type="button" onClick={openNextAction} className="min-h-12 rounded-xl px-5 py-3 text-sm font-bold" style={{ background: '#2456A6', color: 'white' }}>Start next action →</button>}
          </div>
          {nextAction?.node_key && <p className="mt-4 text-xs font-semibold" style={{ color: '#2456A6' }}>Recommended node: {nextAction.node_key}</p>}
          {nextActionError && <p className="mt-4 text-xs" style={{ color: '#991B1B' }}>{nextActionError}</p>}
        </section>

        <div className="dashboard-surface dashboard-skill-levels bg-white rounded-2xl p-6 mb-8" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <h3 className="dashboard-heading text-sm font-bold mb-5">Your skill levels</h3>
          <div className="space-y-4">
            {Object.entries(roadmap.skillLevels || {}).map(([key, startingValue]) => {
              const grown = Math.min(100, Math.round((startingValue || 0) + (skillProgress[key] || 0)))
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="dashboard-skill-name">{skillLabels[key] || key}</span>
                    <span className="dashboard-skill-value">{grown}%</span>
                  </div>
                  <div className="dashboard-progress-track w-full h-2 rounded-full" style={{ background: '#E2E8F0' }}>
                    <div className="dashboard-progress-fill h-2 rounded-full transition-all duration-500" style={{ background: '#0A2342', width: `${grown}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <h3 className="dashboard-heading text-sm font-bold mb-4">Your learning journey</h3>
        <div className="space-y-4 mb-8">
          {roadmap.phases?.map((phase) => {
            const isPassed = passedPhaseNumbers.has(phase.number)
            const isActive = phase.number <= currentPhase

            return (
              <button
                key={phase.number}
                onClick={() => isActive && navigate(`/lesson/${phase.number}`)}
                disabled={!isActive}
                className={`dashboard-phase-card w-full text-left bg-white rounded-2xl p-6 transition-all ${isActive ? 'dashboard-phase-active' : 'dashboard-phase-locked'}`}
                style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)', opacity: isActive ? 1 : 0.5, cursor: isActive ? 'pointer' : 'default' }}
              >
                <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold" style={{ color: isPassed ? '#2E7D32' : '#D4AF37' }}>
                      {isPassed ? '✓' : String(phase.number).padStart(2, '0')}
                    </span>
                    <h4 className="dashboard-phase-title font-bold">{phase.title}</h4>
                  </div>
                  <span className="dashboard-phase-weeks text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    {phase.weeks}
                  </span>
                </div>
                <p className="dashboard-phase-topics text-sm">{phase.topics}</p>
                {isPassed && (
                  <p className="dashboard-phase-status dashboard-phase-passed text-xs font-semibold mt-2">Passed ✓ — click to review</p>
                )}
                {!isActive && (
                  <p className="dashboard-phase-status dashboard-phase-locked-copy text-xs font-semibold mt-2">🔒 Complete the previous phase to unlock</p>
                )}
              </button>
            )
          })}
        </div>

        {roadmap.estimatedTimeline && (
          <div className="dashboard-timeline rounded-2xl p-5 text-sm" style={{ background: '#E8F0FE', color: '#1E3A5F' }}>
            <strong>Estimated timeline:</strong> {roadmap.estimatedTimeline}
          </div>
        )}
      </div>
    </div>
  )
}