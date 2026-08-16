import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'
import PasswordField from '../components/PasswordField'
import CaptchaField from '../components/CaptchaField'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    if (!captchaToken) {
      setError('Complete the security check before signing in.')
      setLoading(false)
      return
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
    if (loginError) {
      setError(loginError.message)
      setLoading(false)
    } else navigate('/dashboard')
  }

  async function handleGoogle() {
    setError('')
    const { error: googleError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } })
    if (googleError) setError(googleError.message)
  }

  return <AuthShell eyebrow="Welcome back" title="Pick up where you left off." subtitle="Sign in to continue your daily digital-skills practice and keep your progress moving." alternateLabel="New to Datakwest?" alternateLink="/signup" alternateText="Create a free account">
    {error && <div role="alert" className="mb-5 rounded-xl p-4 text-sm" style={{ background: 'var(--auth-error-bg)', color: 'var(--auth-error)' }}>{error}</div>}
    <form onSubmit={handleLogin} className="space-y-5">
      <div><label htmlFor="login-email" className="mb-2 block text-sm font-bold" style={{ color: 'var(--auth-ink)' }}>Email address</label><input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" autoComplete="email" required className="w-full rounded-xl border-2 bg-white px-4 py-3 text-sm outline-none transition focus:ring-4" style={{ borderColor: 'var(--auth-border)', color: 'var(--auth-ink)', background: 'var(--auth-input)', '--tw-ring-color': 'rgba(212,175,55,0.2)' }} /></div>
      <div>
        <PasswordField id="login-password" value={password} onChange={(event) => setPassword(event.target.value)} hint="Keep it private" />
        <div className="mt-2 text-right">
          <Link to="/forgot-password" className="text-sm font-bold transition hover:opacity-80" style={{ color: '#D4AF37' }}>Forgot Password?</Link>
        </div>
      </div>
      <CaptchaField onToken={setCaptchaToken} />
      <button type="submit" disabled={loading} className="w-full rounded-xl px-4 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: '#D4AF37', color: 'var(--auth-button-ink)' }}>{loading ? 'Signing you in…' : 'Sign in to Datakwest'}</button>
      <div className="flex items-center gap-3"><div className="h-px flex-1" style={{ background: 'var(--auth-divider)' }} /><span className="text-xs font-semibold" style={{ color: 'var(--auth-subtle)' }}>OR</span><div className="h-px flex-1" style={{ background: 'var(--auth-divider)' }} /></div>
      <button type="button" onClick={handleGoogle} className="auth-google-action flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-sm font-bold transition" style={{ borderColor: 'var(--auth-border)', color: 'var(--auth-ink)', background: 'var(--auth-input)' }}><span className="text-base font-black" style={{ color: '#4285F4' }}>G</span> Continue with Google</button>
    </form>
  </AuthShell>
}
