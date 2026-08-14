import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { createCommunityPost, getCommunityFeed, getCommunityHub, joinCommunity, leaveCommunity, reportCommunityPost } from '../lib/community'

const reportReasons = [['harassment', 'Harassment'], ['spam', 'Spam'], ['unsafe', 'Unsafe content'], ['privacy', 'Privacy concern'], ['other', 'Other']]

export default function Community() {
  const { user } = useAuth()
  const [communities, setCommunities] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [posts, setPosts] = useState([])
  const [body, setBody] = useState('')
  const [reportingId, setReportingId] = useState(null)
  const [reportReason, setReportReason] = useState('other')
  const [reportDetails, setReportDetails] = useState('')
  const [loading, setLoading] = useState(true)
  const [feedLoading, setFeedLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    async function loadHub() {
      const { hub, error: hubError } = await getCommunityHub()
      const nextCommunities = hub.communities || []
      setCommunities(nextCommunities)
      setSelectedId((current) => current || nextCommunities.find((item) => item.membership_status === 'active')?.id || nextCommunities[0]?.id || null)
      setError(hubError?.message || '')
      setLoading(false)
    }
    if (user) loadHub()
  }, [user])

  useEffect(() => {
    async function loadFeed() {
      if (!selectedId) return
      setFeedLoading(true)
      const { feed, error: feedError } = await getCommunityFeed(selectedId)
      setPosts(feed.posts || [])
      if (feedError) setError(feedError.message)
      setFeedLoading(false)
    }
    loadFeed()
  }, [selectedId])

  async function toggleMembership(community) {
    setBusyId(community.id)
    setError('')
    setNotice('')
    const action = community.membership_status === 'active' ? leaveCommunity : joinCommunity
    const { membership, error: actionError } = await action(community.id)
    if (actionError) setError(actionError.message)
    else {
      setCommunities((current) => current.map((item) => item.id === community.id ? { ...item, membership_status: membership?.membership_status || 'active', membership_role: membership?.membership_role || item.membership_role } : item))
      setNotice(membership?.membership_status === 'left' ? 'You left the community.' : 'You joined the community. You can now participate in discussions.')
    }
    setBusyId(null)
  }

  async function publishPost(event) {
    event.preventDefault()
    if (!selectedId || !body.trim()) return
    setError('')
    setNotice('')
    const { post, error: postError } = await createCommunityPost(selectedId, body.trim())
    if (postError) setError(postError.message)
    else {
      setPosts((current) => [post, ...current])
      setBody('')
      setNotice('Your post has been published.')
    }
  }

  async function submitReport(postId) {
    setError('')
    setNotice('')
    const { error: reportError } = await reportCommunityPost(postId, reportReason, reportDetails)
    if (reportError) setError(reportError.message)
    else {
      setReportingId(null)
      setReportDetails('')
      setNotice('Thank you. The post has been reported for moderation review.')
    }
  }

  const selectedCommunity = communities.find((community) => community.id === selectedId)
  const isMember = selectedCommunity?.membership_status === 'active'

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>Community and accountability</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Community Hub</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>Join a focused learning space, exchange useful context, and report content that breaks community standards.</p>
        </div>
        {error && <div className="rounded-xl p-4 mb-4" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {notice && <div className="rounded-xl p-4 mb-4" style={{ background: '#EAF7F0', color: '#2E7D32' }} role="status">{notice}</div>}
        {loading ? <div className="bg-white rounded-2xl p-8 text-center">Loading communities…</div> : communities.length === 0 ? <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><h2 className="font-bold" style={{ color: '#0A2342' }}>Communities are being prepared</h2><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Published learning communities will appear here as the Phase 3 programme expands.</p></div> : <div className="grid lg:grid-cols-[280px_1fr] gap-6"><aside className="bg-white rounded-2xl p-4 h-fit" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><h2 className="font-bold px-2" style={{ color: '#0A2342' }}>Communities</h2><div className="grid gap-2 mt-3">{communities.map((community) => <button key={community.id} type="button" onClick={() => setSelectedId(community.id)} className="text-left rounded-xl p-3" style={{ background: community.id === selectedId ? '#F2ECFF' : '#F5F7FA' }}><p className="font-semibold text-sm" style={{ color: '#0A2342' }}>{community.name}</p><p className="text-xs mt-1" style={{ color: '#6B7A99' }}>{community.group_count || 0} groups · {community.membership_status === 'active' ? 'Member' : 'Not joined'}</p></button>)}</div></aside><section><div className="bg-white rounded-2xl p-6 mb-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>{selectedCommunity?.visibility} community</p><h2 className="text-xl font-bold mt-2" style={{ color: '#0A2342' }}>{selectedCommunity?.name}</h2><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>{selectedCommunity?.description}</p></div><button type="button" onClick={() => toggleMembership(selectedCommunity)} disabled={busyId === selectedCommunity?.id} className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: isMember ? '#F5F7FA' : '#0A2342', color: isMember ? '#0A2342' : 'white' }}>{busyId === selectedCommunity?.id ? 'Updating…' : isMember ? 'Leave community' : 'Join community'}</button></div></div>{isMember && <form onSubmit={publishPost} className="bg-white rounded-2xl p-6 mb-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><label htmlFor="community-post" className="font-bold" style={{ color: '#0A2342' }}>Start a discussion</label><textarea id="community-post" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} rows={4} placeholder="Share a useful question, insight, or learning update…" className="w-full rounded-xl border p-3 mt-3 text-sm" /><div className="flex justify-between items-center mt-3"><span className="text-xs" style={{ color: '#6B7A99' }}>{body.length}/4000</span><button type="submit" disabled={!body.trim()} className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: '#0A2342', color: 'white' }}>Publish post</button></div></form>}{!isMember && <div className="rounded-xl p-4 mb-5" style={{ background: '#FFFBEF', color: '#8A6500' }}>Join this community to participate in discussions.</div>}{feedLoading ? <div className="bg-white rounded-2xl p-8 text-center">Loading discussion feed…</div> : posts.length === 0 ? <div className="bg-white rounded-2xl p-8 text-center"><h2 className="font-bold" style={{ color: '#0A2342' }}>No discussions yet</h2><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Be the first member to start a useful conversation.</p></div> : <div className="grid gap-4">{posts.map((post) => <article key={post.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><p className="text-sm whitespace-pre-wrap" style={{ color: '#0A2342' }}>{post.body}</p><div className="flex items-center justify-between gap-3 mt-4"><span className="text-xs" style={{ color: '#6B7A99' }}>{new Date(post.created_at).toLocaleString()}</span><button type="button" onClick={() => setReportingId(reportingId === post.id ? null : post.id)} className="text-xs font-semibold" style={{ color: '#991B1B' }}>Report</button></div>{reportingId === post.id && <div className="mt-4 rounded-xl p-4" style={{ background: '#F5F7FA' }}><label className="text-xs font-bold" style={{ color: '#0A2342' }}>Report reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="block w-full rounded-lg border p-2 mt-1 text-sm bg-white">{reportReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={2000} rows={2} placeholder="Optional details" className="w-full rounded-lg border p-2 mt-3 text-sm" /><button type="button" onClick={() => submitReport(post.id)} className="mt-3 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: '#991B1B', color: 'white' }}>Submit report</button></div>}</article>)}</div>}</section></div>}
      </main>
    </div>
  )
}
