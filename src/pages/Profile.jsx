import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import OwlLoading from '../components/OwlLoading'
import { supabase } from '../lib/supabase'
import { getReadinessScore } from '../lib/readiness'

const badgeLabels = ['First mission', 'Steady learner', 'Project proof', 'AI explorer']

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [progress, setProgress] = useState([])
  const [readiness, setReadiness] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!user) return
      const [{ data: profileRow }, { data: progressRows }, readinessResult] = await Promise.all([
        supabase.from('profiles').select('full_name, username, email, roadmap, streak, xp, last_active_date, onboarding_completed').eq('id', user.id).maybeSingle(),
        supabase.from('phase_progress').select('phase_number, passed').eq('user_id', user.id),
        getReadinessScore(),
      ])
      if (!active) return
      setProfile(profileRow)
      setProgress(progressRows || [])
      setReadiness(readinessResult?.readiness || null)
      setLoading(false)
    }
    loadProfile()
    return () => { active = false }
  }, [user])

  const metadata = user?.user_metadata || {}
  const name = profile?.full_name || metadata.full_name || metadata.name || user?.email?.split('@')[0] || 'Learner'
  const username = profile?.username ? `@${profile.username}` : '@datakwest_learner'
  const initials = useMemo(() => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), [name])
  const completedPhases = progress.filter((item) => item.passed).length
  const totalPhases = profile?.roadmap?.phases?.length || 0
  const streak = profile?.streak || 0
  const xp = profile?.xp || 0
  const readinessScore = readiness?.score ?? null
  const isFirstWeekState = completedPhases === 0 && streak === 0 && xp === 0

  if (loading) return <OwlLoading message="Opening your learner profile…" />

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0E1B1F', color: '#F7FBFA' }}>
      <Navbar />
      <main className="mx-auto max-w-5xl overflow-hidden sm:mt-8 sm:rounded-[2rem]" style={{ background: '#0E1B1F' }}>
        <section className="relative overflow-hidden px-5 pb-7 pt-7 sm:px-10 sm:pt-10" style={{ background: 'linear-gradient(145deg, #2469AD 0%, #15548F 55%, #0E3B69 100%)' }}>
          <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full" style={{ background: 'rgba(139,198,181,.18)' }} />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-[.22em]" style={{ color: '#DCEEFF' }}>Your Datakwest profile</p><h1 className="mt-3 truncate text-3xl font-black tracking-tight sm:text-5xl">{name}</h1><p className="mt-2 text-sm font-semibold" style={{ color: 'rgba(255,255,255,.72)' }}>{username}</p></div>
            <div className="flex shrink-0 gap-2"><button type="button" onClick={() => navigate('/settings')} aria-label="Open settings" className="flex h-12 w-12 items-center justify-center rounded-2xl border text-xl" style={{ borderColor: 'rgba(255,255,255,.28)', background: 'rgba(255,255,255,.12)' }}>⚙</button></div>
          </div>
          <div className="relative mt-5 flex justify-center sm:absolute sm:bottom-[-48px] sm:right-10 sm:mt-0"><div className="flex h-36 w-36 items-center justify-center rounded-full border-4" style={{ borderColor: '#D4AF37', background: 'radial-gradient(circle, #EAF7F1 0%, #8BC6B5 65%, #3C8E93 100%)' }}><img src="/datakwest-owl-3d.webp" alt="Datakwest owl profile mascot" width="768" height="768" className="h-28 w-28 object-contain drop-shadow-xl" /></div></div>
        </section>

        <section className="px-5 py-6 sm:px-10 sm:pt-16"><div className="grid grid-cols-3 gap-2 border-b pb-6" style={{ borderColor: '#26383D' }}><Stat value={totalPhases || '—'} label="Path phases" /><Stat value={completedPhases} label="Completed" /><Stat value={readinessScore === null ? '—' : readinessScore} label="Readiness" /></div><button type="button" onClick={() => navigate('/settings')} className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 px-4 text-sm font-black" style={{ borderColor: '#40565D', color: '#F7FBFA', background: '#14252A' }}>Edit profile and preferences <span aria-hidden="true">→</span></button></section>

        {isFirstWeekState && <section className="mx-5 mb-7 rounded-2xl border p-5 sm:mx-10" style={{ borderColor: '#F0D58A', background: '#FFF9E8' }} aria-labelledby="first-week-profile"><div className="flex items-center gap-4"><img src="/datakwest-owl-3d.webp" alt="Datakwest owl" width="96" height="96" className="h-16 w-16 shrink-0 object-contain" /><div><p className="text-xs font-black uppercase tracking-[.16em]" style={{ color: '#967414' }}>Your first week starts here</p><h2 id="first-week-profile" className="mt-1 text-lg font-black" style={{ color: '#0A2342' }}>One useful mission is enough for today.</h2><p className="mt-1 text-xs leading-5" style={{ color: '#6B7A99' }}>Complete your first verified activity and this profile will begin to reflect the evidence you are building.</p></div></div><button type="button" onClick={() => navigate('/dashboard')} className="mt-4 min-h-11 w-full rounded-xl px-4 py-3 text-sm font-black" style={{ background: '#0A2342', color: 'white' }}>Open my first mission</button></section>}

        <section className="px-5 pb-7 sm:px-10"><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: '#91A7AD' }}>Your momentum</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric icon="🔥" value={`${streak} days`} label="Current learning streak" tone="#FFB11B" /><Metric icon="⚡" value={`${xp} XP`} label="Practice points earned" tone="#F2D34E" /><Metric icon="🦉" value={`${completedPhases}/${totalPhases || '—'}`} label="Roadmap phases complete" tone="#8BC6B5" /></div></section>

        <section className="px-5 pb-7 sm:px-10"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: '#91A7AD' }}>Learning proof</p><h2 className="mt-2 text-xl font-black">Your milestones</h2></div><button type="button" onClick={() => navigate('/achievements')} className="text-sm font-black" style={{ color: '#8BC6B5' }}>See all →</button></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{badgeLabels.map((label, index) => <div key={label} className="min-h-28 rounded-2xl border p-4" style={{ borderColor: '#2B4046', background: index < completedPhases ? '#183B3A' : '#14252A', opacity: index < completedPhases ? 1 : .65 }}><div className="text-2xl">{index < completedPhases ? ['✦', '🔥', '◆', '✺'][index] : '○'}</div><p className="mt-4 text-xs font-black leading-4">{label}</p><p className="mt-1 text-[10px]" style={{ color: '#91A7AD' }}>{index < completedPhases ? 'Earned' : 'Keep learning'}</p></div>)}</div></section>

        <section className="px-5 pb-10 sm:px-10"><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: '#91A7AD' }}>Quick links</p><div className="mt-4 divide-y overflow-hidden rounded-2xl border" style={{ borderColor: '#2B4046' }}><ProfileLink label="My learning path" detail="Continue your current roadmap" onClick={() => navigate('/tracks')} /><ProfileLink label="Projects and portfolio" detail="Show the proof you are building" onClick={() => navigate('/portfolio')} /><ProfileLink label="Career Centre" detail="Turn progress into next actions" onClick={() => navigate('/career-centre')} /><ProfileLink label="Settings" detail="Account, sounds, privacy, and sign out" onClick={() => navigate('/settings')} /></div></section>
      </main>
    </div>
  )
}

function Stat({ value, label }) { return <div className="text-center"><p className="text-2xl font-black sm:text-3xl">{value}</p><p className="mt-1 text-[11px] font-bold" style={{ color: '#91A7AD' }}>{label}</p></div> }
function Metric({ icon, value, label, tone }) { return <div className="rounded-2xl border p-4" style={{ borderColor: '#2B4046', background: '#14252A' }}><span className="text-2xl">{icon}</span><p className="mt-3 text-lg font-black" style={{ color: tone }}>{value}</p><p className="mt-1 text-xs leading-5" style={{ color: '#91A7AD' }}>{label}</p></div> }
function ProfileLink({ label, detail, onClick }) { return <button type="button" onClick={onClick} className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-4 text-left" style={{ borderColor: '#2B4046' }}><span><span className="block text-sm font-black">{label}</span><span className="mt-1 block text-xs" style={{ color: '#91A7AD' }}>{detail}</span></span><span className="text-xl" style={{ color: '#91A7AD' }}>›</span></button> }
