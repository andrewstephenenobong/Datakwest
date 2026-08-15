import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const metadata = user?.user_metadata || {}
  const name = metadata.full_name || metadata.name || user?.email?.split('@')[0] || 'Learner'
  const username = metadata.username ? `@${metadata.username}` : 'Your DataKwest learner profile'
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen" style={{ background: '#F6F8FC', color: '#0A2342' }}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-12">
        <button type="button" onClick={() => navigate('/dashboard')} className="text-sm font-bold" style={{ color: '#6B7A99' }}>← Back to Home</button>
        <div className="mt-6"><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: '#9A7610' }}>Account</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Settings</h1><p className="mt-3 text-sm leading-6" style={{ color: '#6B7A99' }}>Manage your learner identity and account access.</p></div>
        <section className="mt-8 rounded-[1.75rem] bg-white p-6 shadow-[0_10px_32px_rgba(10,35,66,.07)] sm:p-8" aria-labelledby="profile-heading">
          <div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black" style={{ background: '#E8F0FE', color: '#2456A6' }}>{initials}</div><div className="min-w-0"><h2 id="profile-heading" className="truncate text-xl font-black">{name}</h2><p className="mt-1 truncate text-sm" style={{ color: '#6B7A99' }}>{username}</p><p className="mt-1 truncate text-xs" style={{ color: '#8A98AA' }}>{user?.email}</p></div></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl p-4" style={{ background: '#F5F7FA' }}><p className="text-xs font-black uppercase tracking-wide" style={{ color: '#8A98AA' }}>Profile status</p><p className="mt-2 text-sm font-bold" style={{ color: '#2E7D32' }}>Active learner</p></div><div className="rounded-2xl p-4" style={{ background: '#F5F7FA' }}><p className="text-xs font-black uppercase tracking-wide" style={{ color: '#8A98AA' }}>Account access</p><p className="mt-2 text-sm font-bold" style={{ color: '#0A2342' }}>Secure and protected</p></div></div>
        </section>
        <section className="mt-5 rounded-[1.75rem] border bg-white p-6 shadow-sm sm:p-8" style={{ borderColor: '#F2D4D4' }} aria-labelledby="account-actions-heading"><h2 id="account-actions-heading" className="text-lg font-black">Account actions</h2><p className="mt-2 text-sm leading-6" style={{ color: '#6B7A99' }}>Sign out here when you are finished learning on this device.</p><button type="button" onClick={handleSignOut} className="mt-5 min-h-11 rounded-xl px-5 py-3 text-sm font-black" style={{ background: '#FFF1F1', color: '#991B1B' }}>Sign out of DataKwest</button></section>
      </main>
    </div>
  )
}
