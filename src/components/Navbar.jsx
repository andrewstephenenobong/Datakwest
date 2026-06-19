import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ streak = 0, xp = 0 }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between bg-white" style={{ borderBottom: '1px solid #E2E8F0' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0A2342' }}>
          <span className="text-sm font-bold" style={{ color: '#D4AF37' }}>D</span>
        </div>
        <span className="font-bold text-lg" style={{ color: '#0A2342' }}>DataKwest</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden sm:flex items-center gap-4 text-sm font-semibold" style={{ color: '#6B7A99' }}>
          <span>🔥 {streak} day streak</span>
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
