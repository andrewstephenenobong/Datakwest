import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getCommunityHub, joinCommunity, leaveCommunity } from '../lib/community'

export default function Community() {
  const { user } = useAuth()
  const [communities, setCommunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadHub() {
      const { hub, error: hubError } = await getCommunityHub()
      setCommunities(hub.communities || [])
      setError(hubError?.message || '')
      setLoading(false)
    }
    if (user) loadHub()
  }, [user])

  async function toggleMembership(community) {
    setBusyId(community.id)
    setError('')
    const action = community.membership_status === 'active' ? leaveCommunity : joinCommunity
    const { membership, error: actionError } = await action(community.id)
    if (actionError) setError(actionError.message)
    else {
      setCommunities((current) => current.map((item) => item.id === community.id
        ? { ...item, membership_status: membership?.membership_status || 'active', membership_role: membership?.membership_role || item.membership_role }
        : item))
    }
    setBusyId(null)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>Community and accountability</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Community Hub</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>Find focused learning communities and build consistent progress with peers.</p>
        </div>
        {error && <div className="rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {loading ? <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>Loading communities…</div> : communities.length === 0 ? <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><h2 className="font-bold" style={{ color: '#0A2342' }}>Communities are being prepared</h2><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Published learning communities will appear here as the Phase 3 programme expands.</p></div> : <div className="grid gap-5">{communities.map((community) => <article key={community.id} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>{community.visibility} community</p><h2 className="text-xl font-bold mt-2" style={{ color: '#0A2342' }}>{community.name}</h2></div><span className="text-sm" style={{ color: '#6B7A99' }}>{community.group_count || 0} groups</span></div><p className="text-sm mt-4" style={{ color: '#6B7A99' }}>{community.description || 'A focused space for accountable learning and peer connection.'}</p><button type="button" onClick={() => toggleMembership(community)} disabled={busyId === community.id} className="mt-5 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: community.membership_status === 'active' ? '#F5F7FA' : '#0A2342', color: community.membership_status === 'active' ? '#0A2342' : 'white' }}>{busyId === community.id ? 'Updating…' : community.membership_status === 'active' ? 'Leave community' : 'Join community'}</button></article>)}</div>}
      </main>
    </div>
  )
}
