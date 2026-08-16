import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import {
  createSkillEnrolment,
  discoverUniversalSkill,
  findPublishedSkillForTarget,
  getPublishedSkillCatalogue,
} from '../lib/learningIntelligence'
import { supabase } from '../lib/supabase'

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
  ['20+ hrs/week', 1800],
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
  const [loading, setLoading] = useState(true)
  const [loadingSkill, setLoadingSkill] = useState(null)
  const [error, setError] = useState('')
  const [requestedSkill, setRequestedSkill] = useState('')
  const [weeklyLabel, setWeeklyLabel] = useState(weeklyOptions[0][0])
  const [goal, setGoal] = useState('Build a practical foundation and create useful projects.')
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let active = true
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

  async function enrolInSkill(targetSkill) {
    const cleanSkill = String(targetSkill || '').trim()
    if (!cleanSkill) return
    setLoadingSkill(cleanSkill)
    setError('')
    setStatus(null)
    try {
      const weeklyMinutes = weeklyOptions.find(([label]) => label === weeklyLabel)?.[1] || 450
      const published = await findPublishedSkillForTarget(cleanSkill)
      if (published?.skills?.id && published.id) {
        await createSkillEnrolment({
          skillId: published.skills.id,
          skillGraphVersionId: published.id,
          locale: 'en',
          weeklyMinutes,
          targetOutcome: goal,
        })
        setStatus({ type: 'success', text: `${published.skills.title} was added to your learning space.` })
        setTimeout(() => navigate('/dashboard?skill-added=1'), 500)
        return
      }

      const ageScope = await getLearnerAgeScope()
      const discovered = await discoverUniversalSkill({
        requestedSkill: cleanSkill,
        goal,
        currentLevel: 'beginner',
        weeklyMinutes,
        locale: 'en',
        ...ageScope,
      })
      if ((discovered.status === 'published' || discovered.resolution === 'existing') && discovered.skill?.id && discovered.skillGraphVersionId) {
        await createSkillEnrolment({
          skillId: discovered.skill.id,
          skillGraphVersionId: discovered.skillGraphVersionId,
          locale: 'en',
          weeklyMinutes,
          targetOutcome: goal,
        })
        setStatus({ type: 'success', text: `${discovered.skill.title || cleanSkill} was added to your learning space.` })
        setTimeout(() => navigate('/dashboard?skill-added=1'), 500)
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

        <section className="mb-8" aria-labelledby="published-tracks-title">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 id="published-tracks-title" className="text-xl font-black" style={{ color: '#0A2342' }}>Explore learning paths</h2><span className="text-xs font-bold" style={{ color: '#6B7A99' }}>{loading ? 'Loading paths…' : `${visibleTracks.length} paths`}</span></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTracks.map((track) => (
              <article key={track.title} className="tracks-skill-card rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#DCE5F0', boxShadow: '0 8px 24px rgba(10,35,66,.06)' }}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black" style={{ background: '#0A2342', color: '#E6C85C' }}>{track.emoji}</div>
                <h3 className="text-base font-black" style={{ color: '#0A2342' }}>{track.title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-5" style={{ color: '#6B7A99' }}>{track.description}</p>
                <button type="button" onClick={() => enrolInSkill(track.title)} disabled={Boolean(loadingSkill)} className="mt-5 min-h-11 w-full rounded-xl border px-4 py-3 text-sm font-black" style={{ borderColor: '#D4AF37', color: '#856404', background: '#FFF9E8', opacity: loadingSkill && loadingSkill !== track.title ? .55 : 1 }}>{loadingSkill === track.title ? 'Adding…' : 'Add this skill'}</button>
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
            <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); enrolInSkill(requestedSkill) }}>
              <label className="grid gap-2 text-sm font-bold text-white">Skill or subject<input value={requestedSkill} onChange={(event) => setRequestedSkill(event.target.value)} maxLength={160} required placeholder="e.g. Digital Photography" className="min-h-12 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,.22)', background: 'rgba(255,255,255,.1)', color: '#fff' }} /></label>
              <label className="grid gap-2 text-sm font-bold text-white">How much time can you give it?<select value={weeklyLabel} onChange={(event) => setWeeklyLabel(event.target.value)} className="min-h-12 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,.22)', background: '#14252A', color: '#fff' }}>{weeklyOptions.map(([label]) => <option key={label}>{label}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-bold text-white">What would success look like?<textarea value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={1000} rows={3} className="rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,.22)', background: 'rgba(255,255,255,.1)', color: '#fff' }} /></label>
              <button type="submit" disabled={Boolean(loadingSkill)} className="min-h-12 rounded-xl px-4 py-3 text-sm font-black" style={{ background: '#E6C85C', color: '#0E1B1F', opacity: loadingSkill ? .7 : 1 }}>{loadingSkill ? 'Building your skill path…' : 'Build my skill path'}</button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
