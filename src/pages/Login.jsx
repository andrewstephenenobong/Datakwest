import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F7FA' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.12)' }}>

        {/* Navy Header */}
        <div className="px-8 pt-10 pb-8 text-center" style={{ background: '#0A2342' }}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <img src="src/assets/datakwest_icon_1.png" alt="DataKwest logo" className="w-full h-full object-cover rounded-lg" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">DataKwest</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>From beginner to professional analyst</p>
        </div>

        {/* Form */}
        <div className="bg-white px-8 py-8">
          <p className="text-xs font-semibold tracking-widest mb-5" style={{ color: '#6B7A99' }}>SIGN IN TO CONTINUE</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: '#0A2342' }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#E2E8F0', color: '#0A2342', background: '#FAFAFA' }}
                onFocus={e => e.target.style.borderColor = '#0A2342'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: '#0A2342' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#E2E8F0', color: '#0A2342', background: '#FAFAFA' }}
                onFocus={e => e.target.style.borderColor = '#0A2342'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold border-2 transition-all"
              style={{ borderColor: '#0A2342', color: '#0A2342', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0A2342'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#0A2342' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <button type="button" onClick={handleGoogle}
              className="w-full py-3 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2"
              style={{ borderColor: '#E2E8F0', color: '#0A2342', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#0A2342'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#6B7A99' }}>
              No account?{' '}
              <Link to="/signup" className="font-semibold" style={{ color: '#0A2342' }}>Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}