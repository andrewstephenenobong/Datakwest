import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logEvent } from '../lib/analytics'
import AuthShell from '../components/AuthShell'
import PasswordField from '../components/PasswordField'
import CaptchaField from '../components/CaptchaField'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  async function handleSignup(event) {
    event.preventDefault()
    const passwordIsValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)
    if (!passwordIsValid) {
      setError('Please meet all password requirements before creating your account.')
      return
    }
    setLoading(true)
    setError('')
    if (!captchaToken) {
      setError('Complete the security check before creating your account.')
      setLoading(false)
      return
    }
    const normalizedUsername = username.trim().replace(/\s+/g, '').toLowerCase()
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), username: normalizedUsername || null }, captchaToken },
    })
    if (signupError) {
      setError(signupError.message)
      setLoading(false)
    } else {
      if (data?.user?.id) logEvent(data.user.id, 'signup_completed')
      navigate('/onboarding')
    }
  }

  return <AuthShell eyebrow="Start for free" title="Build skills that travel with you." subtitle="Create your account and get a personalised first path across the digital skills you want to master." alternateLabel="Already have an account?" alternateLink="/login" alternateText="Sign in">
    {error && <div role="alert" className="mb-5 rounded-xl p-4 text-sm" style={{ background: '#FFF4F2', color: '#9C3F31' }}>{error}</div>}
    <form onSubmit={handleSignup} className="space-y-5">
      <div><label htmlFor="signup-full-name" className="mb-2 block text-sm font-bold" style={{ color: '#0A2342' }}>Your name</label><input id="signup-full-name" type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="How should we address you?" autoComplete="name" required className="w-full rounded-xl border-2 bg-white px-4 py-3 text-sm outline-none transition focus:ring-4" style={{ borderColor: '#DCE5F0', color: '#0A2342', '--tw-ring-color': 'rgba(212,175,55,0.16)' }} /></div>
      <div><label htmlFor="signup-username" className="mb-2 block text-sm font-bold" style={{ color: '#0A2342' }}>Username <span className="font-normal" style={{ color: '#8290A5' }}>optional</span></label><input id="signup-username" type="text" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))} placeholder="e.g. andrew.builds" autoComplete="username" maxLength={30} className="w-full rounded-xl border-2 bg-white px-4 py-3 text-sm outline-none transition focus:ring-4" style={{ borderColor: '#DCE5F0', color: '#0A2342', '--tw-ring-color': 'rgba(212,175,55,0.16)' }} /></div>
      <div><label htmlFor="signup-email" className="mb-2 block text-sm font-bold" style={{ color: '#0A2342' }}>Email address</label><input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" autoComplete="email" required className="w-full rounded-xl border-2 bg-white px-4 py-3 text-sm outline-none transition focus:ring-4" style={{ borderColor: '#DCE5F0', color: '#0A2342', '--tw-ring-color': 'rgba(212,175,55,0.16)' }} /></div>
      <PasswordField id="signup-password" value={password} onChange={(event) => setPassword(event.target.value)} label="Create a password" autoComplete="new-password" hint="Required for account safety" showRequirements />
      <CaptchaField onToken={setCaptchaToken} />
      <p className="text-xs leading-5" style={{ color: '#8290A5' }}>Your name personalises your workspace. Your username helps you recognise your portfolio and community presence. We never use either detail as your password or expose them publicly without your control.</p>
      <p className="rounded-xl border px-4 py-3 text-xs leading-5" style={{ borderColor: '#DCE5F0', background: '#F8FBFF', color: '#6B7A99' }}>Your learning activity stays tied to your account controls. You can manage personalisation, Tutor memory, analytics, export, and deletion requests from Settings.</p>
      <button type="submit" disabled={loading} className="w-full rounded-xl px-4 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: '#D4AF37', color: '#0A2342' }}>{loading ? 'Creating your account…' : 'Create my free account'}</button>
    </form>
    <p className="mt-6 text-center text-xs leading-5" style={{ color: '#8A98AA' }}>By continuing, you agree to use Datakwest responsibly and keep your account secure.</p>
  </AuthShell>
}
