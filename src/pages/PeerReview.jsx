import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { acceptPeerReview, getPeerReviewWorkspace, submitPeerReview } from '../lib/peerReview'

export default function PeerReview() {
  const { user } = useAuth()
  const [inbox, setInbox] = useState([])
  const [outbox, setOutbox] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')


  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      const { workspace, error: workspaceError } = await getPeerReviewWorkspace()
      if (cancelled) return
      setInbox(workspace.inbox || [])
      setOutbox(workspace.outbox || [])
      if (workspaceError) setError(workspaceError.message)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  async function accept(requestId) {
    setBusyId(requestId)
    setError('')
    const { error: acceptError } = await acceptPeerReview(requestId)
    if (acceptError) setError(acceptError.message)
    else {
      setInbox((current) => current.map((item) => item.request_id === requestId ? { ...item, status: 'accepted' } : item))
      setNotice('Review accepted. Complete the rubric below when ready.')
    }
    setBusyId(null)
  }

  async function submit(request) {
    const draft = drafts[request.request_id] || {}
    const score = Number(draft.score)
    if (!Number.isFinite(score) || score < 0 || score > 100 || !draft.feedback?.trim()) return
    setBusyId(request.request_id)
    setError('')
    const { result, error: submitError } = await submitPeerReview(request.request_id, score, { summary: draft.feedback.trim() })
    if (submitError) setError(submitError.message)
    else {
      setInbox((current) => current.filter((item) => item.request_id !== request.request_id))
      setOutbox((current) => current)
      setNotice(`Review submitted with a server-recorded score of ${result.score}/100.`)
    }
    setBusyId(null)
  }

  function updateDraft(requestId, field, value) {
    setDrafts((current) => ({ ...current, [requestId]: { ...current[requestId], [field]: value } }))
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8"><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>Peer learning</p><h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Peer Review</h1><p className="mt-2" style={{ color: '#6B7A99' }}>Review learner evidence with a focused rubric and contribute useful, respectful feedback.</p></div>
        {error && <div className="rounded-xl p-4 mb-4" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {notice && <div className="rounded-xl p-4 mb-4" style={{ background: '#EAF7F0', color: '#2E7D32' }} role="status">{notice}</div>}
        {loading ? <div className="bg-white rounded-2xl p-8 text-center">Loading peer reviews…</div> : <div className="grid gap-6"><section><h2 className="text-xl font-bold mb-3" style={{ color: '#0A2342' }}>Assigned to you</h2>{inbox.length === 0 ? <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><p className="text-sm" style={{ color: '#6B7A99' }}>No peer-review assignments are waiting for you.</p></div> : <div className="grid gap-4">{inbox.map((request) => { const draft = drafts[request.request_id] || {}; return <article key={request.request_id} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>Submission review</p><h3 className="text-lg font-bold mt-2" style={{ color: '#0A2342' }}>Project evidence</h3></div><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: request.status === 'accepted' ? '#EAF7F0' : '#FFFBEF', color: request.status === 'accepted' ? '#2E7D32' : '#8A6500' }}>{request.status}</span></div><p className="text-sm mt-4 whitespace-pre-wrap" style={{ color: '#6B7A99' }}>{request.reflection || 'The learner submitted evidence for peer review.'}</p>{request.status === 'pending' ? <button type="button" onClick={() => accept(request.request_id)} disabled={busyId === request.request_id} className="mt-5 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: '#0A2342', color: 'white' }}>{busyId === request.request_id ? 'Accepting…' : 'Accept review'}</button> : <div className="mt-5 grid gap-3"><label className="text-sm font-semibold" style={{ color: '#0A2342' }}>Score from 0 to 100<input type="number" min="0" max="100" value={draft.score || ''} onChange={(event) => updateDraft(request.request_id, 'score', event.target.value)} className="block w-full rounded-xl border p-3 mt-1" /></label><label className="text-sm font-semibold" style={{ color: '#0A2342' }}>Feedback<textarea rows="4" maxLength="4000" value={draft.feedback || ''} onChange={(event) => updateDraft(request.request_id, 'feedback', event.target.value)} placeholder="Describe strengths and one actionable improvement." className="block w-full rounded-xl border p-3 mt-1" /></label><button type="button" onClick={() => submit(request)} disabled={busyId === request.request_id || !draft.score || !draft.feedback?.trim()} className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: '#0A2342', color: 'white' }}>{busyId === request.request_id ? 'Submitting…' : 'Submit peer review'}</button></div>}</article> })}</div>}</section><section><h2 className="text-xl font-bold mb-3" style={{ color: '#0A2342' }}>Your review requests</h2>{outbox.length === 0 ? <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><p className="text-sm" style={{ color: '#6B7A99' }}>Your outgoing peer-review requests will appear here.</p></div> : <div className="grid gap-3">{outbox.map((request) => <div key={request.request_id} className="bg-white rounded-2xl p-5 flex items-center justify-between gap-4" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><div><p className="text-sm font-semibold" style={{ color: '#0A2342' }}>Review request</p><p className="text-xs mt-1" style={{ color: '#6B7A99' }}>Status: {request.status}</p></div>{request.review && <span className="font-bold" style={{ color: '#2E7D32' }}>{request.review.score}/100</span>}</div>)}</div>}</section></div>}
      </main>
    </div>
  )
}
