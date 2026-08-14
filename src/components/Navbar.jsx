import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ streak = 0, xp = 0, streakActive = true }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
  <nav className="w-full h-20 px-6 flex items-center justify-between bg-white" style={{ borderBottom: '1px solid #E2E8F0' }}>
    <div className="flex items-center gap-3 h-full overflow-visible">
      <div className="h-12 w-44 flex items-center overflow-visible">
        <img
          src="/datakwest_logo_lockup.png"
          alt="DataKwest logo"
          className="h-12 w-52 object-contain object-left"
        />
      </div>
    </div>

      <div className="flex items-center gap-5">
        <button type="button" onClick={() => navigate('/career-centre')} className="hidden sm:inline-flex text-sm font-bold px-3 py-2 rounded-xl" style={{ background: '#EEF3FA', color: '#2456A6' }}>Career Centre</button>
        <button type="button" onClick={() => navigate('/interviews')} className="hidden sm:inline-flex text-sm font-bold px-3 py-2 rounded-xl" style={{ background: '#FFF8DE', color: '#8A6C0B' }}>Interview practice</button>
        <div className="hidden sm:flex items-center gap-4 text-sm font-semibold" style={{ color: '#6B7A99' }}>
        <span style={{ opacity: streakActive ? 1 : 0.4 }} title={streakActive ? 'Active today' : 'Complete a lesson today to keep your streak!'}>
         🔥 {streak} day streak
        </span>
          <span>⭐ {xp} XP</span>
        </div>
        <span className="text-sm hidden md:inline" style={{ color: '#6B7A99' }}>{user?.email}</span>
        <button onClick={handleSignOut}
          className="text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-all"
          style={{ borderColor: '#E2E8F0', color: '#0A2342' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#0A2342'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
          Sign out
        </button>
      </div>
    </nav>
  )
}
