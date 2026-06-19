import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F7FA' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.12)' }}>
        <div className="px-8 pt-10 pb-8 text-center" style={{ background: '#0A2342' }}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <span className="text-2xl font-bold" style={{ color: '#D4AF37' }}>D</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">DataKwest</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>From beginner to professional analyst</p>
        </div>
        <div className="bg-white px-8 py-8">
          <p className="text-xs font-semibold tracking-widest mb-5" style={{ color: '#6B7A99' }}>CREATE YOUR FREE ACCOUNT</p>
          {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>}
          <form onSubmit={handleSignup} className="space-y-4">
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
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#D4AF37', color: '#0A2342' }}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#6B7A99' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold" style={{ color: '#0A2342' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}