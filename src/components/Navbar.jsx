import { useNavigate } from 'react-router-dom'
import LearnerNavigation from './LearnerNavigation'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ streak = 0, xp = 0, streakActive = true, compact = false }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <>
    <nav className={`app-navbar ${compact ? 'app-navbar-compact' : ''} w-full h-20 px-4 sm:px-6 flex items-center justify-between`}>
    <div className="flex items-center gap-2 h-full overflow-visible">
      {compact && <button type="button" onClick={() => navigate('/tracks')} className="app-navbar-menu-trigger flex h-10 w-10 items-center justify-center rounded-xl" aria-label="Open learning paths">☰</button>}
      <div className="app-navbar-brand h-12 w-44 flex items-center overflow-visible">
        <img
          src="/datakwest_logo_lockup.png"
          alt="DataKwest logo"
          className="app-navbar-logo h-12 w-52 object-contain object-left"
        />
      </div>
    </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="app-navbar-metrics hidden sm:flex items-center gap-4 text-sm font-semibold">
          <span style={{ opacity: streakActive ? 1 : 0.4 }} title={streakActive ? 'Active today' : 'Complete a lesson today to keep your streak!'}>🔥 {streak} day streak</span>
          <span>⭐ {xp} XP</span>
        </div>
        <button type="button" onClick={() => navigate('/profile')} className="app-navbar-profile flex min-h-11 items-center gap-2 rounded-2xl border-2 px-2.5 py-1.5 text-left transition-colors sm:px-3" aria-label="Open learner profile">
          <span className="app-navbar-avatar flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black">{((user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'L').split(/\s+/).map((part) => part[0]).join('').slice(0, 2)).toUpperCase()}</span>
          <span className="hidden max-w-28 truncate text-sm font-bold sm:block">{user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Learner'}</span>
          <span aria-hidden="true" className="app-navbar-profile-arrow text-xs">↗</span>
        </button>
      </div>
    </nav>
    <LearnerNavigation />
    </>
  )
}
