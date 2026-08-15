import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const primaryItems = [
  { label: 'Home', shortLabel: 'Home', path: '/dashboard', icon: 'home' },
  { label: 'Learn', shortLabel: 'Learn', path: '/tracks', icon: 'learn' },
  { label: 'Practice', shortLabel: 'Practice', path: '/practice', icon: 'practice' },
  { label: 'Community', shortLabel: 'Community', path: '/community', icon: 'community' },
  { label: 'Career', shortLabel: 'Career', path: '/career-centre', icon: 'career' },
]

const moreItems = [
  { label: 'Assessment Center', path: '/assessments', icon: 'assessment', tone: '#6D4CB3' },
  { label: 'Projects', path: '/project', icon: 'project', tone: '#2456A6' },
  { label: 'Portfolio', path: '/portfolio', icon: 'portfolio', tone: '#2E7D32' },
  { label: 'Challenges', path: '/challenges', icon: 'challenge', tone: '#C05621' },
  { label: 'Skill Battles', path: '/skill-battles', icon: 'battle', tone: '#C05621' },
  { label: 'Marketplace', path: '/marketplace', icon: 'market', tone: '#2456A6' },
  { label: 'Interviews', path: '/interviews', icon: 'interview', tone: '#8A6500' },
  { label: 'Achievements', path: '/achievements', icon: 'achievement', tone: '#8A6500' },
  { label: 'Notifications', path: '/notifications', icon: 'notification', tone: '#1E5AA8' },
  { label: 'Skill tree', path: '/skill-tree', icon: 'tree', tone: '#2E7D32' },
  { label: 'Tutor AI', path: '/tutor', icon: 'tutor', tone: '#8A6500' },
  { label: 'Settings', path: '/settings', icon: 'settings', tone: '#6B7A99' },
]

function Icon({ name, active = false }) {
  const stroke = active ? '#2456A6' : '#6B7A99'
  const common = { fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const paths = {
    home: <><path d="m3 10 5-5 5 5" {...common} /><path d="M4.5 9.5v4h7v-4M7 13.5v-2h2v2" {...common} /></>,
    learn: <><circle cx="8" cy="8" r="5.2" {...common} /><path d="M8 5.4v2.9l2 1.2" {...common} /></>,
    practice: <><path d="M3 4.5h10M3 8h7M3 11.5h5" {...common} /><circle cx="11.5" cy="8" r="1.4" {...common} /></>,
    community: <><path d="M4 9.5a3.8 3.8 0 0 1 7.4 0" {...common} /><circle cx="7.7" cy="5.2" r="1.8" {...common} /><path d="M10.3 6.3a1.7 1.7 0 0 1 2.2 1.6" {...common} /></>,
    career: <><path d="M3.5 5.2h9v7h-9z" {...common} /><path d="M6 5.2V4h4v1.2M5.5 8.5h5" {...common} /></>,
    assessment: <><path d="M4 3.5h8v9H4z" {...common} /><path d="m6 7 1.2 1.2L10 5.5M6 10.5h4" {...common} /></>,
    project: <><path d="M3.5 5.5h9v7h-9z" {...common} /><path d="M5.5 5.5V4h5v1.5" {...common} /></>,
    portfolio: <><path d="M4 4.5h8v8H4z" {...common} /><path d="M6 7h4M6 9.5h3" {...common} /></>,
    challenge: <><path d="m8 3 1.5 3.2L13 6.6l-2.5 2.4.6 3.5L8 10.9l-3.1 1.6.6-3.5L3 6.6l3.5-.4z" {...common} /></>,
    battle: <><path d="m4 4 8 8M12 4 4 12" {...common} /><path d="M3 5h3M9 11h3" {...common} /></>,
    market: <><path d="M3.5 6h9l-1 7h-7z" {...common} /><path d="M5 6a3 3 0 0 1 6 0" {...common} /></>,
    interview: <><path d="M3.5 4.5h9v6h-5l-2.5 2v-2h-1.5z" {...common} /><path d="M6 7.5h4" {...common} /></>,
    achievement: <><path d="M5 3.5h6v4a3 3 0 0 1-6 0z" {...common} /><path d="M6.5 10.5v2h3v-2M4 4H3v2a2 2 0 0 0 2 2M12 4h1v2a2 2 0 0 1-2 2" {...common} /></>,
    notification: <><path d="M4.5 10.5h7l-1-1.5V6a2.5 2.5 0 0 0-5 0v3z" {...common} /><path d="M7 12h2" {...common} /></>,
    tree: <><path d="M8 12V7M8 7 5.5 5M8 7l2.5-2M5.5 5V3.5M10.5 5V3.5" {...common} /><circle cx="5.5" cy="3" r="1" {...common} /><circle cx="10.5" cy="3" r="1" {...common} /><circle cx="8" cy="6.8" r="1" {...common} /></>,
    tutor: <><path d="M3.5 4.5h9v6h-5l-2.5 2v-2h-1.5z" {...common} /><path d="M6 7.5h4" {...common} /></>,
    settings: <><circle cx="8" cy="8" r="2.2" {...common} /><path d="M8 3.2v1.1M8 11.7v1.1M3.2 8h1.1M11.7 8h1.1M4.6 4.6l.8.8M10.6 10.6l.8.8M11.4 4.6l-.8.8M5.4 10.6l-.8.8" {...common} /></>,
  }
  return <svg viewBox="0 0 16 16" aria-hidden="true" className="h-5 w-5 shrink-0">{paths[name]}</svg>
}

function isActive(pathname, path) {
  return pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`))
}

export default function LearnerNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const previousPadding = document.body.style.paddingBottom
    const applySafeArea = () => {
      document.body.style.paddingBottom = window.matchMedia('(max-width: 1023px)').matches
        ? 'calc(92px + env(safe-area-inset-bottom))'
        : previousPadding
    }
    applySafeArea()
    window.addEventListener('resize', applySafeArea)
    return () => {
      window.removeEventListener('resize', applySafeArea)
      document.body.style.paddingBottom = previousPadding
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
    return undefined
  }, [open])

  const moreActive = moreItems.some((item) => isActive(location.pathname, item.path))
  const go = (path) => navigate(path)

  return (
    <>
      <div className="relative hidden border-b bg-white/95 px-6 py-2 shadow-sm backdrop-blur lg:block" style={{ borderColor: '#E7EDF4' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {primaryItems.map((item) => {
              const active = isActive(location.pathname, item.path)
              return <button key={item.path} type="button" onClick={() => go(item.path)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors hover:bg-[#F5F7FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2456A6]" style={{ color: active ? '#2456A6' : '#6B7A99', background: active ? '#E8F0FE' : 'transparent' }}><Icon name={item.icon} active={active} />{item.label}</button>
            })}
          </div>
          <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="learner-more-menu" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2456A6]" style={{ color: moreActive ? '#2456A6' : '#6B7A99', background: moreActive ? '#E8F0FE' : 'transparent' }}><span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: moreActive ? '#2456A6' : '#DCE5F0', color: 'white' }}>+</span>More</button>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden">
        <nav aria-label="Learner navigation" className="mx-auto flex max-w-md items-center justify-between rounded-[1.6rem] border bg-white/95 px-2 py-2 shadow-[0_12px_40px_rgba(10,35,66,.18)] backdrop-blur" style={{ borderColor: '#DCE5F0' }}>
          {primaryItems.map((item) => {
            const active = isActive(location.pathname, item.path)
            return <button key={item.path} type="button" onClick={() => go(item.path)} aria-current={active ? 'page' : undefined} className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2456A6]" style={{ color: active ? '#2456A6' : '#77869B', background: active ? '#E8F0FE' : 'transparent' }}><Icon name={item.icon} active={active} /><span className="truncate">{item.shortLabel}</span></button>
          })}
          <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="learner-more-menu" className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2456A6]" style={{ color: moreActive ? '#2456A6' : '#77869B', background: moreActive ? '#E8F0FE' : 'transparent' }}><span className="flex h-5 w-5 items-center justify-center rounded-full text-base leading-none" style={{ background: moreActive ? '#2456A6' : '#DCE5F0', color: moreActive ? 'white' : '#6B7A99' }}>+</span><span>More</span></button>
        </nav>
      </div>
      {open && <>
        <button type="button" aria-label="Close navigation menu" className="fixed inset-0 z-40 bg-[#0A2342]/20 lg:absolute" onClick={() => setOpen(false)} />
        <div id="learner-more-menu" ref={panelRef} role="dialog" aria-label="More learner destinations" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+86px)] z-50 max-h-[70vh] overflow-y-auto rounded-[1.5rem] border bg-white p-4 shadow-[0_16px_50px_rgba(10,35,66,.2)] lg:absolute lg:inset-auto lg:right-6 lg:top-12 lg:w-[27rem]" style={{ borderColor: '#DCE5F0' }}>
          <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em]" style={{ color: '#9A7610' }}>Your toolkit</p><h2 className="mt-1 text-lg font-black" style={{ color: '#0A2342' }}>Explore more of DataKwest</h2></div><button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1 text-lg leading-none" style={{ color: '#6B7A99', background: '#F5F7FA' }} aria-label="Close more destinations">×</button></div>
          <div className="grid grid-cols-2 gap-2">{moreItems.map((item) => <button key={item.path} type="button" onClick={() => go(item.path)} className="flex min-h-14 items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[#F5F7FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2456A6]" style={{ background: isActive(location.pathname, item.path) ? '#F5F7FA' : 'white' }}><span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${item.tone}18` }}><Icon name={item.icon} /></span><span className="min-w-0"><span className="block truncate text-xs font-bold" style={{ color: '#0A2342' }}>{item.label}</span><span className="mt-0.5 block text-[10px]" style={{ color: '#8A98AA' }}>{isActive(location.pathname, item.path) ? 'You are here' : 'Open area'}</span></span></button>)}</div>
        </div>
      </>}
    </>
  )
}
