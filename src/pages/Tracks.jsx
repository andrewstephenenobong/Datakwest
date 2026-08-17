import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import {
  createSkillEnrolment,
  discoverUniversalSkill,
  findPublishedSkillForTarget,
  getPublishedSkillCatalogue,
  getLearnerSkillEnrolments,
  setActiveSkillEnrolment,
} from '../lib/learningIntelligence'
import { supabase } from '../lib/supabase'
import { createActiveSkillSwitchGuard, getSkillSwitchErrorMessage, markActiveSkill, upsertActiveSkill } from '../lib/skillLibrary'

const FALLBACK_TRACKS = [
  { title: 'Frontend Development', description: 'Build websites and interfaces people enjoy using.', emoji: '◈' },
  { title: 'Backend Development', description: 'Create APIs, databases, and reliable services.', emoji: '◉' },
  { title: 'Cybersecurity', description: 'Understand threats, systems, and practical digital defence.', emoji: '⌁' },
  { title: 'Data Analytics', description: 'Turn data into decisions with practical analysis.', emoji: '◌' },
  { title: 'UI/UX Design', description: 'Research needs and shape clearer digital experiences.', emoji: '✦' },
  { title: 'AI & Automation', description: 'Use AI and workflows to multiply your impact.', emoji: '✺' },
]

const weeklyOptions = [
  ['5–10 hrs/week', 450],
  ['10–20 hrs/week', 900],
  ['20+ hrs/week (full-time)', 1800],
]

const LEVEL_OPTIONS = [
  ['beginner', 'I’m completely new', 'Start with foundations and gentle explanations.'],
  ['familiar', 'I know the basics', 'Skip obvious definitions and build confidence with guided practice.'],
  ['intermediate', 'I can use it already', 'Start with applied problems, gaps, and stronger project work.'],
  ['advanced', 'I’m quite experienced', 'Focus on deeper trade-offs, advanced practice, and portfolio proof.'],
]

function formatSkill(entry) {
  const skill = entry.skills || entry
  return {
    id: skill.id,
    title: skill.title,
    description: skill.description || 'A guided digital-skills path shaped around practical outcomes.',
    emoji: '✦',
    versionId: entry.id || null,
  }
}

export default function Tracks() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [catalogue, setCatalogue] = useState([])
  const [enrolments, setEnrolments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingSkill, setLoadingSkill] = useState(null)
  const [levelDialog, setLevelDialog] = useState(null)
  const [startingLevel, setStartingLevel] = useState('beginner')
  const [activeSkillLoading, setActiveSkillLoading] = useState(null)
  const activeSkillSwitchGuard = useMemo(() => createActiveSkillSwitchGuard(), [])
  const [error, setError] = useState('')
  const [requestedSkill, setRequestedSkill] = useState('')
  const [weeklyLabel, setWeeklyLabel] = useState(weeklyOptions[0][0])
  const [goal, setGoal] = useState('Build a practical foundation and create useful projects.')
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let active = true
    async function loadEnrolments() {
      try {
        const rows = await getLearnerSkillEnrolments()
        if (active) setEnrolments(rows)
      } catch (enrolmentError) {
        console.warn('Skill library unavailable:', enrolmentError)
      }
    }
    async function loadCatalogue() {
      try {
        const entries = await getPublishedSkillCatalogue({ locale: 'en', limit: 24 })
        if (active) setCatalogue(entries.map(formatSkill))
      } catch (catalogueError) {
        console.warn('Skill catalogue unavailable:', catalogueError)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadCatalogue()
    loadEnrolments()
    return () => { active = false }
  }, [])

  const visibleTracks = useMemo(() => {
    const merged = [...catalogue]
    FALLBACK_TRACKS.forEach((fallback) => {
      if (!merged.some((track) => track.title.toLowerCase() === fallback.title.toLowerCase())) merged.push(fallback)
    })
    return merged
  }, [catalogue])

  async function getLearnerAgeScope() {
    if (!user?.id) return { targetAgeMin: null, targetAgeMax: null }
    const { data } = await supabase.from('learner_preferences').select('age_band').eq('learner_id', user.id).maybeSingle()
    const ranges = { under_6: [5, 7], '6_12': [8, 12], '13_plus': [13, 99], adult: [18, 99] }
    const range = ranges[data?.age_band]
    return { targetAgeMin: range?.[0] || null, targetAgeMax: range?.[1] || null }
  }

  function beginEnrolment(targetSkill) {
    const cleanSkill = String(targetSkill || '').trim()
    if (!cleanSkill) return
    setStartingLevel('beginner')
    setLevelDialog(cleanSkill)
    setError('')
    setStatus(null)
  }

  async function enrolInSkill(targetSkill, selectedLevel = startingLevel) {
    const cleanSkill = String(targetSkill || '').trim()
    if (!cleanSkill) return
    setLoadingSkill(cleanSkill)
    setError('')
    setStatus(null)
    try {
      const weeklyMinutes = weeklyOptions.find(([label]) => label === weeklyLabel)?.[1] || 450
      const published = await findPublishedSkillForTarget(cleanSkill)
      if (published?.skills?.id && published.id) {
        const enrolment = await createSkillEnrolment({
          skillId: published.skills.id,
          skillGraphVersionId: published.id,
          locale: 'en',
          weeklyMinutes,
          targetOutcome: goal,
          startingLevel: selectedLevel,
        })
        setEnrolments((current) => upsertActiveSkill(current, enrolment))
        setLevelDialog(null)
        navigate(`/dashboard?skill-added=1&skill=${encodeURIComponent(published.skills.title)}`)
        return
      }

      const ageScope = await getLearnerAgeScope()
      const discovered = await discoverUniversalSkill({
        requestedSkill: cleanSkill,
        goal,
        currentLevel: selectedLevel,
        weeklyMinutes,
        locale: 'en',
        ...ageScope,
      })
      if ((discovered.status === 'published' || discovered.resolution === 'existing') && discovered.skill?.id && discovered.skillGraphVersionId) {
        const enrolment = await createSkillEnrolment({
          skillId: discovered.skill.id,
          skillGraphVersionId: discovered.skillGraphVersionId,
          locale: 'en',
          weeklyMinutes,
          targetOutcome: goal,
          startingLevel: selectedLevel,
        })
        setEnrolments((current) => upsertActiveSkill(current, enrolment))
        setLevelDialog(null)
        navigate(`/dashboard?skill-added=1&skill=${encodeURIComponent(discovered.skill.title || cleanSkill)}`)
      } else {
        setStatus({ type: 'review', text: `${cleanSkill} was received. DataKwest is preparing a safe provisional path for review before it becomes an active learning track.` })
      }
    } catch (err) {
      console.error('Add skill error:', err)
      setError(err?.message || 'We could not add that skill right now. Please try again.')
    } finally {
      setLoadingSkill(null)
    }
  }

  async function chooseActiveSkill(enrolment) {
    const intent = activeSkillSwitchGuard.begin()
    setActiveSkillLoading(enrolment.id)
    setError('')
    try {
      await setActiveSkillEnrolment(enrolment.id)
      if (!activeSkillSwitchGuard.isLatest(intent)) return
      setEnrolments((current) => markActiveSkill(current, enrolment.id))
      setStatus({ type: 'success', text: `${enrolment.skills?.title || 'Skill'} is now your active skill for today.` })
    } catch (err) {
      if (activeSkillSwitchGuard.isLatest(intent)) setError(getSkillSwitchErrorMessage(err, typeof navigator === 'undefined' ? true : navigator.onLine))
    } finally {
      if (activeSkillSwitchGuard.isLatest(intent)) setActiveSkillLoading(null)
    }
  }

  return (
    <div className="tracks-page min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10" aria-labelledby="tracks-title">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-black uppercase tracking-[.18em]" style={{ color: '#D4AF37' }}>Your skill library</p>
            <h1 id="tracks-title" className="text-3xl font-black tracking-tight sm:text-4xl" style={{ color: '#0A2342' }}>Choose what you want to learn next.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: '#6B7A99' }}>Add another skill without losing your current path. Published paths start immediately; new subjects go through DataKwest’s universal skill discovery flow.</p>
          </div>
          <button type="button" onClick={() => document.getElementById('add-skill-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="min-h-11 shrink-0 rounded-xl px-4 py-3 text-sm font-black" style={{ background: '#0A2342', color: '#fff' }}>＋ Add a skill</button>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl p-4 text-sm font-semibold" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>}
        {status && <div role="status" className="mb-5 rounded-xl border p-4 text-sm font-semibold" style={{ background: status.type === 'success' ? '#E8F5E9' : '#FFF9E8', borderColor: status.type === 'success' ? '#9DD7B2' : '#E5D394', color: status.type === 'success' ? '#216E46' : '#856404' }}>{status.text}</div>}

        <section className="mb-8 rounded-3xl border p-5 sm:p-7" style={{ background: '#fff', borderColor: '#DCE5F0', boxShadow: '0 8px 24px rgba(10,35,66,.05)' }} aria-labelledby="my-skills-title">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em]" style={{ color: '#D4AF37' }}>Your learning skills</p><h2 id="my-skills-title" className="mt-2 text-xl font-black" style={{ color: '#0A2342' }}>Choose what you want to learn today.</h2><p className="mt-2 text-sm" style={{ color: '#6B7A99' }}>Your library keeps every path. Switching the active skill changes the next lessons and missions without deleting your progress.</p></div><span className="text-xs font-bold" style={{ color: '#6B7A99' }}>{enrolments.length} saved</span></div>
          {enrolments.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{enrolments.map((enrolment) => { const isActive = Boolean(enrolment.is_active); return <article key={enrolment.id} className={`tracks-learning-skill-card ${isActive ? 'is-active' : 'is-inactive'} rounded-2xl border p-4`} style={{ borderColor: isActive ? '#D4AF37' : '#DCE5F0', background: isActive ? '#FFF9E8' : '#F8FAFD', color: '#0A2342' }}><div className="flex items-start justify-between gap-3"><div><h3 className="font-black" style={{ color: '#0A2342' }}>{enrolment.skills?.title || 'Learning skill'}</h3><p className="mt-1 text-xs" style={{ color: '#52657F' }}>{LEVEL_OPTIONS.find(([value]) => value === enrolment.starting_level)?.[1] || 'Starting level recorded'}</p></div>{isActive && <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: '#0A2342', color: '#fff' }}>Active today</span>}</div><button type="button" onClick={() => chooseActiveSkill(enrolment)} disabled={Boolean(activeSkillLoading)} className="mt-4 min-h-10 w-full rounded-xl border px-3 py-2 text-xs font-black" style={{ borderColor: isActive ? '#0A2342' : '#D4AF37', color: '#0A2342', background: isActive ? '#E6C85C' : '#fff', opacity: activeSkillLoading && activeSkillLoading !== enrolment.id ? .55 : 1 }}>{activeSkillLoading === enrolment.id ? 'Switching…' : (isActive ? 'Learning today' : 'Learn this today')}</button></article> })}</div> : <p className="mt-5 rounded-2xl p-4 text-sm" style={{ background: '#F8FAFD', color: '#6B7A99' }}>Add your first skill below. You will be asked how much you already understand before it is saved.</p>}
        </section>

        <section className="mb-8" aria-labelledby="published-tracks-title">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 id="published-tracks-title" className="text-xl font-black" style={{ color: '#0A2342' }}>Explore learning paths</h2><span className="text-xs font-bold" style={{ color: '#6B7A99' }}>{loading ? 'Loading paths…' : `${visibleTracks.length} paths`}</span></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTracks.map((track) => (
              <article key={track.title} className="tracks-skill-card rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#DCE5F0', boxShadow: '0 8px 24px rgba(10,35,66,.06)' }}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black" style={{ background: '#0A2342', color: '#E6C85C' }}>{track.emoji}</div>
                <h3 className="text-base font-black" style={{ color: '#0A2342' }}>{track.title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-5" style={{ color: '#6B7A99' }}>{track.description}</p>
                <button type="button" onClick={() => beginEnrolment(track.title)} disabled={Boolean(loadingSkill)} className="mt-5 min-h-11 w-full rounded-xl border px-4 py-3 text-sm font-black" style={{ borderColor: '#D4AF37', color: '#856404', background: '#FFF9E8', opacity: loadingSkill && loadingSkill !== track.title ? .55 : 1 }}>{loadingSkill === track.title ? 'Adding…' : 'Add this skill'}</button>
              </article>
            ))}
          </div>
        </section>

        <section id="add-skill" className="rounded-3xl border p-5 sm:p-7" style={{ background: '#0A2342', borderColor: 'rgba(212,175,55,.42)', boxShadow: '0 18px 45px rgba(10,35,66,.16)' }} aria-labelledby="add-skill-title">
          <div className="grid gap-7 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em]" style={{ color: '#E6C85C' }}>Universal skill engine</p>
              <h2 id="add-skill-title" className="mt-3 text-2xl font-black text-white sm:text-3xl">Can’t see your skill? Add it.</h2>
              <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(255,255,255,.74)' }}>Tell DataKwest what you want to learn. The Owl will map the foundations, explain the beginner direction, and prepare a provisional path without pretending that an unreviewed AI graph is an authoritative course.</p>
              <p className="mt-4 text-xs font-semibold" style={{ color: 'rgba(255,255,255,.58)' }}>Your age band and learning pace are used to adjust language, lesson length, examples, and practice expectations.</p>
            </div>
              <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); beginEnrolment(requestedSkill) }}>
              <label className="grid gap-2 text-sm font-bold text-white">Skill or subject<input value={requestedSkill} onChange={(event) => setRequestedSkill(event.target.value)} maxLength={160} required placeholder="e.g. Digital Photography" className="min-h-12 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,.22)', background: 'rgba(255,255,255,.1)', color: '#fff' }} /></label>
              <label className="grid gap-2 text-sm font-bold text-white">How much time can you give it?<select value={weeklyLabel} onChange={(event) => setWeeklyLabel(event.target.value)} className="min-h-12 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,.22)', background: '#14252A', color: '#fff' }}>{weeklyOptions.map(([label]) => <option key={label}>{label}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-bold text-white">What would success look like?<textarea value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={1000} rows={3} className="rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,.22)', background: 'rgba(255,255,255,.1)', color: '#fff' }} /></label>
              <button type="submit" disabled={Boolean(loadingSkill)} className="min-h-12 rounded-xl px-4 py-3 text-sm font-black" style={{ background: '#E6C85C', color: '#0E1B1F', opacity: loadingSkill ? .7 : 1 }}>{loadingSkill ? 'Building your skill path…' : 'Build my skill path'}</button>
            </form>
          </div>
        </section>
        {levelDialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06151bcc] p-4" role="dialog" aria-modal="true" aria-labelledby="skill-level-title"><div className="w-full max-w-lg rounded-3xl border p-6 sm:p-8" style={{ background: '#10252B', borderColor: 'rgba(230,200,92,.5)', boxShadow: '0 24px 80px rgba(0,0,0,.35)' }}><p className="text-xs font-black uppercase tracking-[.18em]" style={{ color: '#E6C85C' }}>Before we add it</p><h2 id="skill-level-title" className="mt-3 text-2xl font-black text-white">How well do you understand {levelDialog} already?</h2><p className="mt-2 text-sm leading-6" style={{ color: 'rgba(255,255,255,.72)' }}>This helps the Owl choose the right starting point. You can change your active skill later without losing progress.</p><div className="mt-5 grid gap-3">{LEVEL_OPTIONS.map(([value, label, description]) => <label key={value} className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4" style={{ borderColor: startingLevel === value ? '#E6C85C' : 'rgba(255,255,255,.16)', background: startingLevel === value ? 'rgba(230,200,92,.14)' : 'rgba(255,255,255,.05)' }}><input type="radio" name="starting-level" value={value} checked={startingLevel === value} onChange={() => setStartingLevel(value)} className="mt-1" /><span><strong className="block text-sm text-white">{label}</strong><span className="mt-1 block text-xs" style={{ color: 'rgba(255,255,255,.68)' }}>{description}</span></span></label>)}</div><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setLevelDialog(null)} className="min-h-11 rounded-xl border px-4 py-3 text-sm font-black text-white" style={{ borderColor: 'rgba(255,255,255,.2)', background: 'transparent' }}>Cancel</button><button type="button" onClick={() => enrolInSkill(levelDialog)} disabled={Boolean(loadingSkill)} className="min-h-11 rounded-xl px-4 py-3 text-sm font-black" style={{ background: '#E6C85C', color: '#10252B' }}>{loadingSkill ? 'Saving skill…' : 'Add and start learning'}</button></div></div></div>}
      </main>
    </div>
  )
}
