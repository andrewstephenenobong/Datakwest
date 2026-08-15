import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { defaultNavigationSoundPreferences, getNavigationSoundPreferences, navigationActions, previewNavigationSound, saveNavigationSoundPreferences } from '../lib/navigationSounds'
import { logEvent } from '../lib/analytics'
import { getPrivacyPreferences, updatePrivacyPreferences, requestPrivacyAction } from '../lib/privacy'

const settingGroups = [
  { title: 'Account', items: [['profile', 'Profile', 'Your learner identity'], ['preferences', 'Learning preferences', 'Pace, language, and explanation style'], ['notifications', 'Notifications', 'Choose what deserves your attention'], ['courses', 'Learning paths', 'Manage your active directions'], ['privacy', 'Privacy and AI memory', 'Control your data and consent']] },
  { title: 'Support', items: [['help', 'Help centre', 'Find answers and contact support'], ['feedback', 'Feedback', 'Tell us what would make Datakwest better']] },
]

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [showSounds, setShowSounds] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacyStatus, setPrivacyStatus] = useState('')
  const [privacyPreferences, setPrivacyPreferences] = useState({ personalization_consent: true, ai_memory_consent: false, analytics_consent: false })
  const [navigationSounds, setNavigationSounds] = useState(() => getNavigationSoundPreferences())
  const metadata = user?.user_metadata || {}
  const name = metadata.full_name || metadata.name || user?.email?.split('@')[0] || 'Learner'

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  function updateNavigationSounds(next) {
    const updated = { ...navigationSounds, ...next }
    setNavigationSounds(updated)
    saveNavigationSoundPreferences(updated)
  }

  function resetNavigationSounds() {
    setNavigationSounds(defaultNavigationSoundPreferences)
    saveNavigationSoundPreferences(defaultNavigationSoundPreferences)
    previewNavigationSound(defaultNavigationSoundPreferences.style)
  }

  async function submitFeedback(event) {
    event.preventDefault()
    if (!feedbackRating && !feedbackText.trim()) return
    const reference = (globalThis.crypto?.randomUUID?.() || `feedback-${Date.now()}`).slice(-8).toUpperCase()
    await logEvent(user?.id, 'pilot_feedback_submitted', { reference, rating: feedbackRating || null, message: feedbackText.trim().slice(0, 1200), source: 'settings' })
    setFeedbackText('')
    setFeedbackRating('')
    setFeedbackStatus(`Thanks—your feedback was recorded. Reference ${reference}. We will use it in the pilot review queue.`)
  }

  async function openPrivacyCentre() {
    setPrivacyOpen(true)
    setPrivacyLoading(true)
    setPrivacyStatus('')
    const { preferences, error } = await getPrivacyPreferences()
    if (preferences) setPrivacyPreferences(preferences)
    if (error) setPrivacyStatus('Privacy preferences are temporarily unavailable. Your current settings were not changed.')
    setPrivacyLoading(false)
  }

  async function savePrivacy(nextPreferences) {
    setPrivacySaving(true)
    setPrivacyStatus('')
    const { preferences, error } = await updatePrivacyPreferences({
      personalizationConsent: nextPreferences.personalization_consent,
      aiMemoryConsent: nextPreferences.ai_memory_consent,
      analyticsConsent: nextPreferences.analytics_consent,
    })
    if (error) setPrivacyStatus('We could not save that preference. Try again.')
    else {
      setPrivacyPreferences(preferences || nextPreferences)
      setPrivacyStatus('Privacy preferences saved. This does not delete past data.')
    }
    setPrivacySaving(false)
  }

  async function submitPrivacyRequest(requestType) {
    setPrivacyStatus('')
    const { error } = await requestPrivacyAction(requestType)
    setPrivacyStatus(error ? 'We could not submit that request. Try again.' : `Your ${requestType} request was recorded for secure processing. It is not complete yet.`)
  }

  function handleItem(key) {
    if (key === 'profile') navigate('/profile')
    else if (key === 'courses') navigate('/tracks')
    else if (key === 'feedback') { setFeedbackOpen(true); setFeedbackStatus('') }
    else if (key === 'help') navigate('/tutor')
    else if (key === 'privacy') openPrivacyCentre()
    else setShowSounds(false)
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0E1B1F', color: '#F7FBFA' }}>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-10 pt-5 sm:px-6 sm:pt-10">
        <header className="flex items-center justify-between border-b pb-5" style={{ borderColor: '#2B4046' }}><button type="button" onClick={() => navigate('/profile')} className="text-sm font-black" style={{ color: '#8BC6B5' }}>‹ Profile</button><div className="text-center"><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: '#91A7AD' }}>DataKwest</p><h1 className="mt-1 text-2xl font-black">Settings</h1></div><button type="button" onClick={() => navigate('/profile')} className="text-sm font-black" style={{ color: '#8BC6B5' }}>Done</button></header>

        <section className="mt-7 flex items-center gap-4 rounded-2xl border p-4" style={{ borderColor: '#2B4046', background: '#14252A' }}><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'radial-gradient(circle, #EAF7F1 0%, #8BC6B5 66%, #3C8E93 100%)' }}><img src="/datakwest-owl-3d.webp" alt="Datakwest owl" width="768" height="768" className="h-11 w-11 object-contain" /></div><div className="min-w-0"><p className="truncate text-lg font-black">{name}</p><p className="mt-1 truncate text-xs" style={{ color: '#91A7AD' }}>{user?.email || 'Learner account'}</p></div><button type="button" onClick={() => navigate('/profile')} className="ml-auto text-sm font-black" style={{ color: '#8BC6B5' }}>View</button></section>

        {settingGroups.map((group) => <section key={group.title} className="mt-8" aria-labelledby={`${group.title}-heading`}><h2 id={`${group.title}-heading`} className="px-1 text-sm font-black uppercase tracking-[.18em]" style={{ color: '#91A7AD' }}>{group.title}</h2><div className="mt-3 divide-y overflow-hidden rounded-2xl border" style={{ borderColor: '#40565D', background: '#14252A' }}>{group.items.map(([key, label, detail]) => <button type="button" key={key} onClick={() => handleItem(key)} className="flex min-h-20 w-full items-center justify-between gap-4 px-5 py-4 text-left active:bg-[#1D343A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8BC6B5]" style={{ borderColor: '#2B4046' }}><span className="min-w-0"><span className="block text-base font-black">{label}</span><span className="mt-1 block truncate text-xs" style={{ color: '#91A7AD' }}>{detail}</span></span><span className="text-3xl font-light" style={{ color: '#70858C' }}>›</span></button>)}</div></section>)}

        <section className="mt-8" aria-labelledby="sound-heading"><div className="flex items-center justify-between px-1"><div><h2 id="sound-heading" className="text-sm font-black uppercase tracking-[.18em]" style={{ color: '#91A7AD' }}>Personalise</h2><p className="mt-2 text-xs" style={{ color: '#6F858B' }}>Make the app feel like yours.</p></div><button type="button" onClick={() => setShowSounds((value) => !value)} className="text-sm font-black" style={{ color: '#8BC6B5' }}>{showSounds ? 'Hide' : 'Open'}</button></div>{showSounds && <div className="mt-3 rounded-2xl border p-5" style={{ borderColor: '#40565D', background: '#14252A' }}><div className="flex items-start justify-between gap-4"><div><h3 className="text-base font-black">Navigation sounds</h3><p className="mt-2 text-xs leading-5" style={{ color: '#91A7AD' }}>Choose a gentle sound style for navigation. Sounds play only after a tap.</p></div><button type="button" onClick={resetNavigationSounds} className="text-xs font-black" style={{ color: '#8BC6B5' }}>Reset</button></div><div className="mt-5 flex flex-wrap gap-2">{[['soft', 'Soft'], ['chime', 'Chime'], ['pop', 'Pop'], ['off', 'Off']].map(([value, label]) => <button key={value} type="button" onClick={() => { updateNavigationSounds({ style: value, enabled: value !== 'off' }); previewNavigationSound(value) }} aria-pressed={navigationSounds.style === value} className="min-h-10 rounded-xl border px-4 text-xs font-black" style={{ borderColor: navigationSounds.style === value ? '#8BC6B5' : '#40565D', background: navigationSounds.style === value ? '#1D4945' : '#0E1B1F', color: navigationSounds.style === value ? '#DDF5E3' : '#91A7AD' }}>{label}</button>)}</div><label className="mt-4 flex min-h-14 items-center justify-between gap-4 rounded-xl px-4" style={{ background: '#0E1B1F' }}><span><span className="block text-sm font-black">Navigation feedback</span><span className="mt-1 block text-xs" style={{ color: '#91A7AD' }}>Play a sound after a destination opens</span></span><input type="checkbox" checked={navigationSounds.enabled} onChange={(event) => updateNavigationSounds({ enabled: event.target.checked, style: event.target.checked && navigationSounds.style === 'off' ? 'soft' : navigationSounds.style })} className="h-5 w-5 accent-[#8BC6B5]" /></label><div className="mt-4 grid gap-2 sm:grid-cols-2">{navigationActions.map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: '#2B4046' }}><input type="checkbox" checked={navigationSounds[key]} onChange={(event) => updateNavigationSounds({ [key]: event.target.checked })} className="h-4 w-4 accent-[#8BC6B5]" /><span className="text-xs font-bold">{label}</span></label>)}</div></div>}</section>

        {privacyOpen && <section className="mt-8 rounded-2xl border p-5" style={{ borderColor: '#40565D', background: '#14252A' }} aria-labelledby="privacy-heading"><div className="flex items-start justify-between gap-3"><div><h2 id="privacy-heading" className="text-base font-black">Privacy centre</h2><p className="mt-2 text-xs leading-5" style={{ color: '#91A7AD' }}>You control how future Datakwest processing uses your learning information. Turning a preference off does not delete past data.</p></div><button type="button" onClick={() => setPrivacyOpen(false)} className="text-xl" style={{ color: '#91A7AD' }} aria-label="Close privacy centre">×</button></div>{privacyLoading ? <p className="mt-5 text-sm" style={{ color: '#91A7AD' }}>Loading your privacy preferences…</p> : <div className="mt-5 space-y-3">{[['personalization_consent', 'Personalised learning', 'Use verified learning evidence to tailor the next action.'], ['ai_memory_consent', 'Tutor memory', 'Allow the Tutor to use permitted conversation context for continuity.'], ['analytics_consent', 'Product analytics', 'Allow privacy-scoped usage events to improve reliability and learner experience.']].map(([key, label, detail]) => <label key={key} className="flex min-h-16 items-center justify-between gap-4 rounded-xl p-4" style={{ background: '#0E1B1F' }}><span><span className="block text-sm font-black">{label}</span><span className="mt-1 block text-xs leading-5" style={{ color: '#91A7AD' }}>{detail}</span></span><input type="checkbox" checked={Boolean(privacyPreferences[key])} disabled={privacySaving} onChange={(event) => { const next = { ...privacyPreferences, [key]: event.target.checked }; setPrivacyPreferences(next); savePrivacy(next) }} className="h-5 w-5 accent-[#8BC6B5]" /></label>)}<div className="grid gap-2 pt-2 sm:grid-cols-2"><button type="button" onClick={() => submitPrivacyRequest('export')} className="min-h-11 rounded-xl border px-4 text-xs font-black" style={{ borderColor: '#40565D', color: '#DDF5E3' }}>Request my data export</button><button type="button" onClick={() => { if (window.confirm('Request account deletion? This records a request for secure processing; it does not delete your account immediately.')) submitPrivacyRequest('deletion') }} className="min-h-11 rounded-xl border px-4 text-xs font-black" style={{ borderColor: '#69444A', color: '#FFB5B5' }}>Request account deletion</button></div>{privacyStatus && <p className="pt-2 text-xs font-bold" style={{ color: privacyStatus.includes('could not') ? '#FFB5B5' : '#DDF5E3' }} role="status">{privacyStatus}</p>}</div>}</section>}

        {feedbackOpen && <section className="mt-8 rounded-2xl border p-5" style={{ borderColor: '#40565D', background: '#14252A' }} aria-labelledby="feedback-heading"><div className="flex items-start justify-between gap-3"><div><h2 id="feedback-heading" className="text-base font-black">Tell us what happened</h2><p className="mt-2 text-xs leading-5" style={{ color: '#91A7AD' }}>Share product feedback, not passwords or private learner information. This helps us improve the pilot experience.</p></div><button type="button" onClick={() => setFeedbackOpen(false)} className="text-xl" style={{ color: '#91A7AD' }} aria-label="Close feedback">×</button></div><form onSubmit={submitFeedback} className="mt-5"><fieldset><legend className="text-xs font-black uppercase tracking-wide" style={{ color: '#91A7AD' }}>How was this experience?</legend><div className="mt-3 flex flex-wrap gap-2">{['hard', 'okay', 'good', 'excellent'].map((rating) => <button key={rating} type="button" onClick={() => setFeedbackRating(rating)} aria-pressed={feedbackRating === rating} className="min-h-10 rounded-xl border px-3 text-xs font-black" style={{ borderColor: feedbackRating === rating ? '#8BC6B5' : '#40565D', background: feedbackRating === rating ? '#1D4945' : '#0E1B1F', color: feedbackRating === rating ? '#DDF5E3' : '#91A7AD' }}>{rating}</button>)}</div></fieldset><label htmlFor="pilot-feedback" className="mt-5 block text-xs font-black uppercase tracking-wide" style={{ color: '#91A7AD' }}>What should we improve?</label><textarea id="pilot-feedback" value={feedbackText} onChange={(event) => setFeedbackText(event.target.value.slice(0, 1200))} rows="4" className="mt-2 w-full rounded-xl border bg-[#0E1B1F] px-3 py-3 text-sm outline-none" style={{ borderColor: '#40565D', color: '#F7FBFA' }} placeholder="Tell us what worked, what was confusing, or what blocked you…" /><div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" disabled={!feedbackRating && !feedbackText.trim()} className="min-h-11 rounded-xl px-4 text-sm font-black disabled:opacity-50" style={{ background: '#8BC6B5', color: '#0E1B1F' }}>Send feedback</button>{feedbackStatus && <p className="text-xs font-bold" style={{ color: '#DDF5E3' }} role="status">{feedbackStatus}</p>}</div></form></section>}

        <section className="mt-8" aria-labelledby="access-heading"><h2 id="access-heading" className="px-1 text-sm font-black uppercase tracking-[.18em]" style={{ color: '#91A7AD' }}>Account access</h2><div className="mt-3 rounded-2xl border p-5" style={{ borderColor: '#69444A', background: '#251A1D' }}><p className="text-base font-black">Sign out of DataKwest</p><p className="mt-2 text-xs leading-5" style={{ color: '#C3A6AA' }}>Your progress remains safely stored. You can sign back in whenever you are ready.</p>{!confirmingSignOut ? <button type="button" onClick={() => setConfirmingSignOut(true)} className="mt-5 min-h-12 rounded-xl px-5 text-sm font-black" style={{ background: '#FDE5E5', color: '#991B1B' }}>Sign out</button> : <div className="mt-5"><p className="text-sm font-bold" style={{ color: '#FFB5B5' }}>Are you sure you want to sign out?</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={handleSignOut} disabled={signingOut} className="min-h-11 rounded-xl px-5 text-sm font-black" style={{ background: '#991B1B', color: 'white' }}>{signingOut ? 'Signing out…' : 'Yes, sign out'}</button><button type="button" onClick={() => setConfirmingSignOut(false)} disabled={signingOut} className="min-h-11 rounded-xl border px-5 text-sm font-black" style={{ borderColor: '#69444A', color: '#F7FBFA', background: '#0E1B1F' }}>Keep me signed in</button></div></div>}</div></section>
      </main>
    </div>
  )
}
