import { useNavigate } from 'react-router-dom'
import LearnerNavigation from './LearnerNavigation'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ streak = 0, xp = 0, streakActive = true }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <>
    <nav className="w-full h-20 px-4 sm:px-6 flex items-center justify-between bg-white" style={{ borderBottom: '1px solid #E2E8F0' }}>
    <div className="flex items-center gap-3 h-full overflow-visible">
      <div className="h-12 w-44 flex items-center overflow-visible">
        <img
          src="/datakwest_logo_lockup.png"
          alt="DataKwest logo"
          className="h-12 w-52 object-contain object-left"
        />
      </div>
    </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden sm:flex items-center gap-4 text-sm font-semibold" style={{ color: '#6B7A99' }}>
          <span style={{ opacity: streakActive ? 1 : 0.4 }} title={streakActive ? 'Active today' : 'Complete a lesson today to keep your streak!'}>🔥 {streak} day streak</span>
          <span>⭐ {xp} XP</span>
        </div>
        <button type="button" onClick={() => navigate('/profile')} className="flex min-h-11 items-center gap-2 rounded-2xl border-2 px-2.5 py-1.5 text-left transition-colors hover:border-[#2456A6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2456A6] sm:px-3" style={{ borderColor: '#E2E8F0', color: '#0A2342' }} aria-label="Open learner profile">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black" style={{ background: '#E8F0FE', color: '#2456A6' }}>{((user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'L').split(/\s+/).map((part) => part[0]).join('').slice(0, 2)).toUpperCase()}</span>
          <span className="hidden max-w-28 truncate text-sm font-bold sm:block">{user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Learner'}</span>
          <span aria-hidden="true" className="text-xs" style={{ color: '#6B7A99' }}>↗</span>
        </button>
      </div>
    </nav>
    <LearnerNavigation />
    </>
  )
}
