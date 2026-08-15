import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    {error && <div role="alert" className="mb-5 rounded-xl p-4 text-sm" style={{ background: '#FFF4F2', color: '#9C3F31' }}>{error}</div>}
    <form onSubmit={handleLogin} className="space-y-5">
      <div><label htmlFor="login-email" className="mb-2 block text-sm font-bold" style={{ color: '#0A2342' }}>Email address</label><input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" autoComplete="email" required className="w-full rounded-xl border-2 bg-white px-4 py-3 text-sm outline-none transition focus:ring-4" style={{ borderColor: '#DCE5F0', color: '#0A2342', '--tw-ring-color': 'rgba(212,175,55,0.16)' }} /></div>
      <PasswordField id="login-password" value={password} onChange={(event) => setPassword(event.target.value)} hint="Keep it private" />
      <CaptchaField onToken={setCaptchaToken} />
      <button type="submit" disabled={loading} className="w-full rounded-xl px-4 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: '#D4AF37', color: '#0A2342' }}>{loading ? 'Signing you in…' : 'Sign in to Datakwest'}</button>
      <div className="flex items-center gap-3"><div className="h-px flex-1" style={{ background: '#E6ECF4' }} /><span className="text-xs font-semibold" style={{ color: '#8A98AA' }}>OR</span><div className="h-px flex-1" style={{ background: '#E6ECF4' }} /></div>
      <button type="button" onClick={handleGoogle} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-sm font-bold transition hover:border-[#0A2342]" style={{ borderColor: '#E6ECF4', color: '#0A2342', background: 'white' }}><span className="text-base font-black" style={{ color: '#4285F4' }}>G</span> Continue with Google</button>
    </form>
  </AuthShell>
}
