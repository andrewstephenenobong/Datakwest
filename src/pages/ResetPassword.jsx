import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'
import PasswordField from '../components/PasswordField'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Wait briefly to see if an onAuthStateChange grabs the hash
        const timer = setTimeout(() => {
          setError('Invalid or expired reset link. Please request a new one.')
          setSessionChecked(true)
        }, 2000)
        return () => clearTimeout(timer)
      } else {
        setSessionChecked(true)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionChecked(true)
      } else if (session) {
        setSessionChecked(true)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function handleUpdate(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      // Clear URL hash
      window.history.replaceState(null, '', window.location.pathname)
      navigate('/dashboard', { replace: true })
    }
  }

  if (!sessionChecked) {
    return <AuthShell eyebrow="Account Recovery" title="Verifying link" subtitle="Please wait while we securely verify your reset link.">
      <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: 'rgba(212,175,55,0.2)', borderTopColor: '#D4AF37' }} /></div>
    </AuthShell>
  }

  return <AuthShell eyebrow="Account Recovery" title="Set new password" subtitle="Please enter a strong new password for your account." alternateLabel="Changed your mind?" alternateLink="/login" alternateText="Sign in">
    {error && <div role="alert" className="mb-5 rounded-xl p-4 text-sm" style={{ background: 'var(--auth-error-bg)', color: 'var(--auth-error)' }}>{error}</div>}
    
    {error?.includes('expired') || error?.includes('Invalid') ? (
      <div className="mt-4"><button onClick={() => navigate('/forgot-password')} className="w-full rounded-xl px-4 py-3.5 text-sm font-bold transition hover:-translate-y-0.5" style={{ background: '#D4AF37', color: 'var(--auth-button-ink)' }}>Request New Link</button></div>
    ) : (
      <form onSubmit={handleUpdate} className="space-y-5">
        <PasswordField id="new-password" value={password} onChange={(event) => setPassword(event.target.value)} hint="Make it at least 8 characters long" />
        <button type="submit" disabled={loading} className="w-full rounded-xl px-4 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: '#D4AF37', color: 'var(--auth-button-ink)' }}>{loading ? 'Updating password…' : 'Update password'}</button>
      </form>
    )}
  </AuthShell>
}
