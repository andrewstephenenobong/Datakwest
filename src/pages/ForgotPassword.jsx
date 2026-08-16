import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleReset(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (resetError) {
      setError(resetError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return <AuthShell eyebrow="Account Recovery" title="Forgot your password?" subtitle="Enter your email address and we will send you a link to reset your password." alternateLabel="Remembered your password?" alternateLink="/login" alternateText="Sign in">
    {error && <div role="alert" className="mb-5 rounded-xl p-4 text-sm" style={{ background: 'var(--auth-error-bg)', color: 'var(--auth-error)' }}>{error}</div>}
    {success ? (
      <div className="rounded-xl p-6 text-center" style={{ background: 'var(--auth-input)', border: '2px solid var(--auth-border)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--auth-ink)' }}>Check your email</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--auth-subtle)' }}>We have sent a password reset link to <strong style={{ color: 'var(--auth-ink)' }}>{email}</strong>. Please check your inbox and spam folder.</p>
        <Link to="/login" className="mt-6 inline-block rounded-xl px-4 py-3 text-sm font-bold transition hover:-translate-y-0.5" style={{ background: '#D4AF37', color: 'var(--auth-button-ink)' }}>Return to Sign In</Link>
      </div>
    ) : (
      <form onSubmit={handleReset} className="space-y-5">
        <div><label htmlFor="reset-email" className="mb-2 block text-sm font-bold" style={{ color: 'var(--auth-ink)' }}>Email address</label><input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" autoComplete="email" required className="w-full rounded-xl border-2 bg-white px-4 py-3 text-sm outline-none transition focus:ring-4" style={{ borderColor: 'var(--auth-border)', color: 'var(--auth-ink)', background: 'var(--auth-input)', '--tw-ring-color': 'rgba(212,175,55,0.2)' }} /></div>
        <button type="submit" disabled={loading} className="w-full rounded-xl px-4 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: '#D4AF37', color: 'var(--auth-button-ink)' }}>{loading ? 'Sending link…' : 'Send reset link'}</button>
      </form>
    )}
  </AuthShell>
}
