import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logEvent } from '../lib/analytics'
import AuthShell from '../components/AuthShell'
import PasswordField from '../components/PasswordField'
import CaptchaField from '../components/CaptchaField'
import { updatePrivacyPreferences } from '../lib/privacy'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [deliveryAcknowledgement, setDeliveryAcknowledgement] = useState(false)
  const [personalizationConsent, setPersonalizationConsent] = useState(true)
  const [aiMemoryConsent, setAiMemoryConsent] = useState(false)
  const [analyticsConsent, setAnalyticsConsent] = useState(false)

  async function handleSignup(event) {
    event.preventDefault()
    const passwordIsValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)
    if (!passwordIsValid) {
      setError('Please meet all password requirements before creating your account.')
      return
    }
    setLoading(true)
    setError('')
    if (!deliveryAcknowledgement) {
      setError('Please confirm that you understand how Datakwest uses your learning activity to deliver the service.')
      setLoading(false)
      return
    }
    if (!captchaToken) {
      setError('Complete the security check before creating your account.')
      setLoading(false)
      return
    }
    const normalizedUsername = username.trim().replace(/\s+/g, '').toLowerCase()
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), username: normalizedUsername || null, privacy_preferences: { personalization_consent: personalizationConsent, ai_memory_consent: aiMemoryConsent, analytics_consent: analyticsConsent } }, captchaToken },
    })
    if (signupError) {
      setError(signupError.message)
      setLoading(false)
    } else {
      if (data?.session) {
        const { error: privacyError } = await updatePrivacyPreferences({ personalizationConsent, aiMemoryConsent, analyticsConsent })
        if (privacyError) {
          setError('Your account was created, but your privacy choices need one more confirmation in Settings.')
          setLoading(false)
          return
        }
      }
      if (data?.user?.id) logEvent(data.user.id, 'signup_completed')
      navigate('/onboarding')
    }
  }

  return <AuthShell eyebrow="Start for free" title="Build skills that travel with you." subtitle="Create your account and get a personalised first path across the digital skills you want to master." alternateLabel="Already have an account?" alternateLink="/login" alternateText="Sign in">
    {error && <div role="alert" className="auth-error mb-5 rounded-xl p-4 text-sm">{error}</div>}
    <form onSubmit={handleSignup} className="auth-form min-w-0 space-y-5">
      <div><label htmlFor="signup-full-name" className="auth-label mb-2 block text-sm font-bold">Your name</label><input id="signup-full-name" type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="How should we address you?" autoComplete="name" required className="auth-input w-full rounded-xl border-2 px-4 py-3 text-sm outline-none transition focus:ring-4" /></div>
      <div><label htmlFor="signup-username" className="auth-label mb-2 block text-sm font-bold">Username <span className="auth-label-muted font-normal">optional</span></label><input id="signup-username" type="text" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))} placeholder="e.g. andrew.builds" autoComplete="username" maxLength={30} className="auth-input w-full rounded-xl border-2 px-4 py-3 text-sm outline-none transition focus:ring-4" /></div>
      <div><label htmlFor="signup-email" className="auth-label mb-2 block text-sm font-bold">Email address</label><input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" autoComplete="email" required className="auth-input w-full rounded-xl border-2 px-4 py-3 text-sm outline-none transition focus:ring-4" /></div>
      <PasswordField id="signup-password" value={password} onChange={(event) => setPassword(event.target.value)} label="Create a password" autoComplete="new-password" hint="Required for account safety" showRequirements />
      <CaptchaField onToken={setCaptchaToken} />
      <p className="auth-helper text-xs leading-5">Your name personalises your workspace. Your username helps you recognise your portfolio and community presence. We never use either detail as your password or expose them publicly without your control.</p>
      <fieldset className="auth-fieldset min-w-0 rounded-xl border p-4">
        <legend className="auth-legend px-1 text-sm font-bold">Choose your privacy defaults</legend>
        <label className="auth-consent mt-3 flex items-start gap-3 text-xs leading-5"><input type="checkbox" checked={deliveryAcknowledgement} onChange={(event) => setDeliveryAcknowledgement(event.target.checked)} className="auth-checkbox mt-1 h-4 w-4 shrink-0" /> <span><strong>Required:</strong> I understand that Datakwest uses my account and learning activity to deliver my personalised learning service.</span></label>
        <label className="auth-consent mt-3 flex items-start gap-3 text-xs leading-5"><input type="checkbox" checked={personalizationConsent} onChange={(event) => setPersonalizationConsent(event.target.checked)} className="auth-checkbox mt-1 h-4 w-4 shrink-0" /> <span><strong>Personalisation:</strong> allow Datakwest to use verified learning evidence to improve recommendations.</span></label>
        <label className="auth-consent mt-3 flex items-start gap-3 text-xs leading-5"><input type="checkbox" checked={aiMemoryConsent} onChange={(event) => setAiMemoryConsent(event.target.checked)} className="auth-checkbox mt-1 h-4 w-4 shrink-0" /> <span><strong>Tutor memory:</strong> allow relevant learning context to be remembered for future Tutor sessions.</span></label>
        <label className="auth-consent mt-3 flex items-start gap-3 text-xs leading-5"><input type="checkbox" checked={analyticsConsent} onChange={(event) => setAnalyticsConsent(event.target.checked)} className="auth-checkbox mt-1 h-4 w-4 shrink-0" /> <span><strong>Product analytics:</strong> allow anonymous usage signals to help us improve Datakwest.</span></label>
        <p className="auth-helper mt-3 text-[11px] leading-5">You can change these choices, request an export, or request deletion from Settings. Optional choices are never required to start learning.</p>
      </fieldset>
      <button type="submit" disabled={loading} className="w-full rounded-xl px-4 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: '#D4AF37', color: '#0A2342' }}>{loading ? 'Creating your account…' : 'Create my free account'}</button>
    </form>
    <p className="auth-footer-copy mt-6 text-center text-xs leading-5">By continuing, you agree to use Datakwest responsibly and keep your account secure.</p>
  </AuthShell>
}
