import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { defaultNavigationSoundPreferences, getNavigationSoundPreferences, navigationActions, previewNavigationSound, saveNavigationSoundPreferences } from '../lib/navigationSounds'

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [navigationSounds, setNavigationSounds] = useState(() => getNavigationSoundPreferences())
  const metadata = user?.user_metadata || {}
  const name = metadata.full_name || metadata.name || user?.email?.split('@')[0] || 'Learner'
  const username = metadata.username ? `@${metadata.username}` : 'Learner profile'
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

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

  return (
    <div className="min-h-screen" style={{ background: '#F6F8FC', color: '#0A2342' }}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-12">
        <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-bold transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2456A6]" style={{ color: '#6B7A99' }}>← Back to Home</button>
        <header className="mt-6"><p className="text-[11px] font-black uppercase tracking-[.22em]" style={{ color: '#9A7610' }}>Account centre</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Settings</h1><p className="mt-3 max-w-xl text-sm leading-6" style={{ color: '#6B7A99' }}>Your profile and account controls, kept in one calm and easy-to-find place.</p></header>

        <section className="mt-8 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_12px_36px_rgba(10,35,66,.08)]" aria-labelledby="profile-heading">
          <div className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-7" style={{ borderColor: '#EDF1F6' }}><div><p className="text-[11px] font-black uppercase tracking-[.16em]" style={{ color: '#8A98AA' }}>Profile</p><h2 id="profile-heading" className="mt-1 text-lg font-black">Your learner identity</h2></div><span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: '#EAF7F0', color: '#2E7D32' }}>Active</span></div>
          <div className="p-5 sm:p-7"><div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black" style={{ background: 'linear-gradient(135deg, #E8F0FE, #DDF5E3)', color: '#2456A6' }}>{initials}</div><div className="min-w-0"><h3 className="truncate text-xl font-black">{name}</h3><p className="mt-1 truncate text-sm font-semibold" style={{ color: '#2456A6' }}>{username}</p></div></div><dl className="mt-7 divide-y rounded-2xl border" style={{ borderColor: '#E8EDF4' }}><div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center"><dt className="text-xs font-black uppercase tracking-wide" style={{ color: '#8A98AA' }}>Email</dt><dd className="truncate text-sm font-semibold" style={{ color: '#0A2342' }}>{user?.email || 'Not available'}</dd></div><div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center"><dt className="text-xs font-black uppercase tracking-wide" style={{ color: '#8A98AA' }}>Learning status</dt><dd className="text-sm font-semibold" style={{ color: '#2E7D32' }}>Active learner</dd></div><div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center"><dt className="text-xs font-black uppercase tracking-wide" style={{ color: '#8A98AA' }}>Account security</dt><dd className="text-sm font-semibold" style={{ color: '#0A2342' }}>Protected by DataKwest authentication</dd></div></dl></div>
        </section>

        <section className="mt-5 rounded-[1.75rem] border bg-white p-5 shadow-sm sm:p-7" style={{ borderColor: '#E4EAF2' }} aria-labelledby="navigation-sounds-heading"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.16em]" style={{ color: '#9A7610' }}>Personalise your workspace</p><h2 id="navigation-sounds-heading" className="mt-1 text-lg font-black">Navigation sounds</h2><p className="mt-2 max-w-xl text-sm leading-6" style={{ color: '#6B7A99' }}>Choose the sound language DataKwest uses when you move between learning areas. Sounds play only after a tap and are generated on your device.</p></div><button type="button" onClick={resetNavigationSounds} className="shrink-0 text-xs font-black" style={{ color: '#2456A6' }}>Reset</button></div><div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Navigation sound style"><span className="self-center pr-1 text-xs font-black" style={{ color: '#8A98AA' }}>Style</span>{[['soft', 'Soft'], ['chime', 'Chime'], ['pop', 'Pop'], ['off', 'Off']].map(([value, label]) => <button key={value} type="button" onClick={() => { updateNavigationSounds({ style: value, enabled: value !== 'off' }); previewNavigationSound(value) }} aria-pressed={navigationSounds.style === value} className="min-h-9 rounded-full border px-3 py-1.5 text-xs font-black" style={{ borderColor: navigationSounds.style === value ? '#2456A6' : '#DCE5F0', background: navigationSounds.style === value ? '#E8F0FE' : 'white', color: navigationSounds.style === value ? '#2456A6' : '#6B7A99' }}>{label}</button>)}</div><label className="mt-5 flex items-center justify-between gap-4 rounded-2xl p-4" style={{ background: '#F5F7FA' }}><span><span className="block text-sm font-black" style={{ color: '#0A2342' }}>Navigation feedback</span><span className="mt-1 block text-xs" style={{ color: '#6B7A99' }}>Play a short sound when a destination opens</span></span><input type="checkbox" checked={navigationSounds.enabled} onChange={(event) => updateNavigationSounds({ enabled: event.target.checked, style: event.target.checked && navigationSounds.style === 'off' ? 'soft' : navigationSounds.style })} className="h-5 w-5 accent-[#2456A6]" /></label><div className="mt-5 grid gap-2 sm:grid-cols-2">{navigationActions.map(([key, label, description]) => <label key={key} className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: '#E8EDF4' }}><input type="checkbox" checked={navigationSounds[key]} onChange={(event) => updateNavigationSounds({ [key]: event.target.checked })} className="h-4 w-4 accent-[#2456A6]" /><span className="min-w-0"><span className="block text-sm font-bold" style={{ color: '#0A2342' }}>{label}</span><span className="block truncate text-xs" style={{ color: '#8A98AA' }}>{description}</span></span></label>)}</div></section>

        <section className="mt-5 rounded-[1.75rem] border bg-white p-5 shadow-sm sm:p-7" style={{ borderColor: '#F1D8D8' }} aria-labelledby="account-actions-heading"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: '#FFF1F1', color: '#991B1B' }}>↪</div><div><h2 id="account-actions-heading" className="text-lg font-black">Account access</h2><p className="mt-2 max-w-xl text-sm leading-6" style={{ color: '#6B7A99' }}>Sign out when you are finished on this device. Your learning progress remains safely stored.</p></div></div>{!confirmingSignOut ? <button type="button" onClick={() => setConfirmingSignOut(true)} className="mt-6 min-h-11 rounded-xl px-5 py-3 text-sm font-black transition-colors hover:bg-[#FDE5E5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991B1B]" style={{ background: '#FFF1F1', color: '#991B1B' }}>Sign out of DataKwest</button> : <div className="mt-6 rounded-2xl p-4" style={{ background: '#FFF8F8' }}><p className="text-sm font-bold" style={{ color: '#991B1B' }}>Are you sure you want to sign out?</p><p className="mt-1 text-xs leading-5" style={{ color: '#6B7A99' }}>You can sign back in anytime to continue learning.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={handleSignOut} disabled={signingOut} className="min-h-10 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-60" style={{ background: '#991B1B', color: 'white' }}>{signingOut ? 'Signing out…' : 'Yes, sign out'}</button><button type="button" onClick={() => setConfirmingSignOut(false)} disabled={signingOut} className="min-h-10 rounded-xl border px-4 py-2 text-sm font-black disabled:opacity-60" style={{ borderColor: '#DCE5F0', color: '#0A2342', background: 'white' }}>Keep me signed in</button></div></div>}</section>
      </main>
    </div>
  )
}
