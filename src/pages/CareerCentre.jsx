import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getCareerCentre } from '../lib/careerCentre'

const statusStyles = {
  reviewed: { background: '#EEF6F1', color: '#2D8A5A' },
  published: { background: '#EEF6F1', color: '#2D8A5A' },
  completed: { background: '#EEF3FA', color: '#2456A6' },
  submitted: { background: '#FFF9E8', color: '#967414' },
  in_review: { background: '#FFF9E8', color: '#967414' },
}

function formatDate(value) {
  if (!value) return 'Not yet'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function Metric({ label, value, note }) {
  return <div className="rounded-2xl border p-5" style={{ borderColor: '#E2EAF3', background: 'white' }}><p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: '#8290A5' }}>{label}</p><p className="mt-3 text-3xl font-black" style={{ color: '#0A2342' }}>{value}</p><p className="mt-2 text-xs leading-5" style={{ color: '#8290A5' }}>{note}</p></div>
}

export default function CareerCentre() {
  const [centre, setCentre] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadCentre() {
    setLoading(true)
    setError('')
    const { centre: nextCentre, error: nextError } = await getCareerCentre()
    if (nextError) setError(nextError.message || 'We could not load your Career Centre yet.')
    else setCentre(nextCentre)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    getCareerCentre().then(({ centre: nextCentre, error: nextError }) => {
      if (!active) return
      if (nextError) setError(nextError.message || 'We could not load your Career Centre yet.')
      else setCentre(nextCentre)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  if (loading) return <div className="min-h-screen" style={{ background: '#F6F8FC' }}><Navbar /><main className="mx-auto max-w-7xl px-6 py-16 lg:px-10"><div className="animate-pulse space-y-5"><div className="h-10 w-64 rounded-xl bg-white" /><div className="grid gap-4 md:grid-cols-4"><div className="h-36 rounded-2xl bg-white" /><div className="h-36 rounded-2xl bg-white" /><div className="h-36 rounded-2xl bg-white" /><div className="h-36 rounded-2xl bg-white" /></div><div className="h-72 rounded-[2rem] bg-white" /></div></main></div>

  if (error) return <div className="min-h-screen" style={{ background: '#F6F8FC' }}><Navbar /><main className="mx-auto max-w-xl px-6 py-20 text-center"><div className="rounded-[2rem] bg-white p-8 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#9A7610' }}>Career Centre</p><h1 className="mt-3 text-3xl font-black" style={{ color: '#0A2342' }}>Your career workspace needs a refresh.</h1><p className="mt-4 text-sm leading-7" style={{ color: '#6B7A99' }}>{error}</p><button type="button" onClick={loadCentre} className="mt-6 rounded-xl px-5 py-3 text-sm font-bold" style={{ background: '#0A2342', color: 'white' }}>Try again</button></div></main></div>

  const readiness = centre?.readiness || {}
  const evidence = readiness.evidence || {}
  const factors = readiness.factors || {}
  const projects = centre?.projects || []
  const interviews = centre?.interviews || []
  const applications = centre?.applications || []
  const opportunities = centre?.opportunities || []
  const actions = centre?.next_actions || []
  const score = Number(readiness.score || 0)

  return <div className="min-h-screen" style={{ background: '#F6F8FC', color: '#0A2342' }}><Navbar /><main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#9A7610' }}>Career operating system</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Your Career Centre.</h1><p className="mt-4 max-w-2xl text-base leading-7" style={{ color: '#6B7A99' }}>Turn learning evidence into your next credible career move. Your plan updates as you practise, build, explain, and apply.</p></div><button type="button" onClick={loadCentre} className="rounded-xl border-2 bg-white px-4 py-3 text-sm font-bold" style={{ borderColor: '#DCE5F0', color: '#2456A6' }}>Refresh evidence</button></div>

<section className="mt-8 grid gap-4 md:grid-cols-4"><Metric label="Readiness score" value={`${score}/100`} note={`${readiness.band || 'starting'} · rubric v${readiness.rubric_version || 2}`} /><Metric label="Reviewed projects" value={evidence.reviewed_projects || 0} note="Evidence reviewed or published" /><Metric label="Interview evidence" value={evidence.completed_interviews || 0} note="Fresh completed evaluations" /><Metric label="Applications" value={applications.length} note="Your opportunity activity" /></section>

<section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-[2rem] p-7" style={{ background: '#0A2342', boxShadow: '0 24px 70px rgba(10,35,66,0.14)' }}><div className="flex items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#D4AF37' }}>Readiness evidence</p><p className="mt-3 text-6xl font-black text-white">{score}<span className="text-2xl" style={{ color: 'rgba(255,255,255,0.5)' }}>/100</span></p></div><span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: '#D4AF37' }}>{readiness.band || 'starting'}</span></div><div className="mt-7 space-y-4">{[['Practice average', factors.practice_average], ['Mission completion', factors.mission_completion], ['Reviewed projects', factors.reviewed_projects], ['Interview average', factors.interview_average]].map(([label, value]) => <div key={label}><div className="flex justify-between text-xs font-bold text-white"><span>{label}</span><span style={{ color: '#D4AF37' }}>{Math.round(Number(value || 0))}</span></div><div className="mt-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.13)' }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, Number(value || 0)))}%`, background: '#D4AF37' }} /></div></div>)}</div><p className="mt-6 text-xs leading-5" style={{ color: 'rgba(255,255,255,0.55)' }}>This score reflects demonstrated work, not lesson consumption. Fresh evidence matters more than old activity.</p></div><div className="rounded-[2rem] border p-7" style={{ borderColor: '#E2EAF3', background: 'white' }}><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#9A7610' }}>Your next moves</p><h2 className="mt-3 text-2xl font-black">Build the evidence that matters next.</h2><div className="mt-6 space-y-3">{actions.slice(0, 3).map((action) => <Link key={action.key} to={action.route} className="block rounded-2xl border p-4 transition hover:-translate-y-0.5" style={{ borderColor: '#E2EAF3' }}><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">{action.title}</p><span style={{ color: '#B18A16' }}>→</span></div><p className="mt-2 text-xs leading-5" style={{ color: '#6B7A99' }}>{action.reason}</p></Link>)}</div></div></section>

<section className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-[2rem] border p-7" style={{ borderColor: '#E2EAF3', background: 'white' }}><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#9A7610' }}>Project evidence</p><h2 className="mt-2 text-2xl font-black">Proof you can explain.</h2></div><Link to="/project" className="text-sm font-bold" style={{ color: '#2456A6' }}>Build project →</Link></div><div className="mt-6 space-y-3">{projects.length ? projects.slice(0, 4).map((project) => <div key={project.submission_id} className="flex items-center justify-between gap-4 rounded-2xl p-4" style={{ background: '#F4F7FB' }}><div><p className="text-sm font-bold">{project.title}</p><p className="mt-1 text-xs" style={{ color: '#8290A5' }}>Updated {formatDate(project.updated_at)}</p></div><div className="text-right"><span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={statusStyles[project.status] || statusStyles.submitted}>{project.status}</span><p className="mt-2 text-xs font-bold" style={{ color: '#2456A6' }}>{project.ai_score ? `${project.ai_score}/100` : 'Awaiting review'}</p></div></div>) : <p className="rounded-2xl p-5 text-sm" style={{ background: '#F4F7FB', color: '#6B7A99' }}>Your first project will appear here once you submit it.</p>}</div></div><div className="rounded-[2rem] border p-7" style={{ borderColor: '#E2EAF3', background: 'white' }}><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#9A7610' }}>Interview evidence</p><h2 className="mt-2 text-2xl font-black">Practise, then improve.</h2></div><Link to="/interviews" className="text-sm font-bold" style={{ color: '#2456A6' }}>Practise →</Link></div><div className="mt-6 space-y-3">{interviews.length ? interviews.slice(0, 4).map((interview) => <div key={interview.session_id} className="flex items-center justify-between gap-4 rounded-2xl p-4" style={{ background: '#F4F7FB' }}><div><p className="text-sm font-bold">{interview.title}</p><p className="mt-1 text-xs" style={{ color: '#8290A5' }}>{interview.interview_type} · {interview.locale} · {formatDate(interview.evaluated_at)}</p></div><div className="text-right"><span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={statusStyles[interview.status] || statusStyles.submitted}>{interview.status}</span><p className="mt-2 text-xs font-bold" style={{ color: '#2456A6' }}>{interview.total_score != null ? `${interview.total_score}/100` : 'Pending evaluation'}</p></div></div>) : <p className="rounded-2xl p-5 text-sm" style={{ background: '#F4F7FB', color: '#6B7A99' }}>Complete an interview practice session to create career evidence.</p>}</div></div></section>

<section className="mt-8 rounded-[2rem] border p-7" style={{ borderColor: '#E2EAF3', background: 'white' }}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#9A7610' }}>Opportunity board</p><h2 className="mt-2 text-2xl font-black">Turn readiness into action.</h2><p className="mt-2 text-sm" style={{ color: '#6B7A99' }}>Explore opportunities and see your applications in one place.</p></div><Link to="/marketplace" className="text-sm font-bold" style={{ color: '#2456A6' }}>Open marketplace →</Link></div><div className="mt-6 grid gap-4 lg:grid-cols-3">{opportunities.slice(0, 3).map((opportunity) => <article key={opportunity.id} className="rounded-2xl border p-5" style={{ borderColor: '#E2EAF3' }}><p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: '#8290A5' }}>{opportunity.opportunity_type}</p><h3 className="mt-3 text-base font-bold">{opportunity.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5" style={{ color: '#6B7A99' }}>{opportunity.description}</p><Link to="/marketplace" className="mt-4 inline-block text-xs font-bold" style={{ color: '#2456A6' }}>Review match →</Link></article>)}{!opportunities.length && <p className="rounded-2xl p-5 text-sm" style={{ background: '#F4F7FB', color: '#6B7A99' }}>Published opportunities will appear here when they are available.</p>}</div>{applications.length > 0 && <p className="mt-5 text-xs font-semibold" style={{ color: '#8290A5' }}>You have {applications.length} active application{applications.length === 1 ? '' : 's'} in progress.</p>}</section></main></div>
}
