import { useCallback, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import {
  applyModerationAction,
  claimModerationCase,
  errorMessage,
  getAdminAuditEvents,
  getModerationQueue,
} from '../lib/adminGovernance'

const colors = { navy: '#0A2342', muted: '#6B7A99', gold: '#D4AF37', bg: '#F5F7FA', red: '#991B1B', green: '#2E7D32' }

export default function AdminGovernance() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [auditEvents, setAuditEvents] = useState([])
  const [selectedCase, setSelectedCase] = useState(null)
  const [actionType, setActionType] = useState('warn')
  const [reasonCode, setReasonCode] = useState('policy_review')
  const [rationale, setRationale] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [{ data: queue, error: queueError }, { data: audit, error: auditError }] = await Promise.all([
      getModerationQueue(null, 'open', 50),
      getAdminAuditEvents(25),
    ])
    if (queueError || auditError) setError(errorMessage(queueError || auditError))
    setCases(queue?.cases || [])
    setAuditEvents(audit?.events || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return undefined
    const timer = window.setTimeout(() => { load() }, 0)
    return () => window.clearTimeout(timer)
  }, [user, load])

  async function handleClaim(caseId) {
    setActionLoading(true)
    setError('')
    setNotice('')
    const { data, error: claimError } = await claimModerationCase(caseId)
    if (claimError) setError(errorMessage(claimError))
    else {
      setCases((current) => current.map((item) => item.id === caseId ? { ...item, ...data } : item))
      setSelectedCase((current) => current ? { ...current, ...data } : current)
      setNotice('Case claimed for review.')
    }
    setActionLoading(false)
  }

  async function handleAction(event) {
    event.preventDefault()
    if (!selectedCase) return
    setActionLoading(true)
    setError('')
    setNotice('')
    const { data, error: actionError } = await applyModerationAction(selectedCase.id, actionType, reasonCode, rationale)
    if (actionError) setError(errorMessage(actionError))
    else {
      setNotice(`Case ${data?.status || 'updated'} through the server-authoritative moderation workflow.`)
      setSelectedCase(null)
      setRationale('')
      await load()
    }
    setActionLoading(false)
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.gold }}>Platform governance</p>
            <h1 className="text-3xl font-bold mt-1" style={{ color: colors.navy }}>Moderation control room</h1>
            <p className="text-sm mt-2 max-w-2xl" style={{ color: colors.muted }}>
              Review reported activity through permissioned, audited RPC workflows. Learner scores, XP, and outcomes are never edited from this console.
            </p>
          </div>
          <button type="button" onClick={load} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'white', color: colors.navy }} disabled={loading}>Refresh queue</button>
        </div>

        {error && <p className="mb-5 p-4 rounded-xl text-sm" style={{ background: '#FEE2E2', color: colors.red }}>{error}</p>}
        {notice && <p className="mb-5 p-4 rounded-xl text-sm" style={{ background: '#E8F5E9', color: colors.green }}>{notice}</p>}

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <section className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: colors.navy }}>Open moderation cases</h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#FFFBEF', color: '#8A6D1D' }}>{cases.length} visible</span>
            </div>
            {loading ? <p className="text-sm" style={{ color: colors.muted }}>Loading permissioned queue…</p> : cases.length === 0 ? <p className="text-sm" style={{ color: colors.muted }}>No cases are currently visible to this administrator.</p> : (
              <div className="space-y-3">
                {cases.map((item) => (
                  <button type="button" key={item.id} onClick={() => setSelectedCase(item)} className="w-full text-left rounded-xl p-4" style={{ background: '#F5F7FA' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-bold" style={{ color: colors.navy }}>Case #{item.case_number}</p><p className="text-sm mt-1" style={{ color: colors.muted }}>{item.subject_type} · {item.queue}</p></div>
                      <span className="text-xs font-bold uppercase" style={{ color: item.priority === 'critical' ? colors.red : colors.gold }}>{item.priority}</span>
                    </div>
                    <p className="text-xs mt-3" style={{ color: colors.muted }}>{item.assigned_to ? `Assigned to ${item.assigned_to}` : 'Unassigned'} · {new Date(item.created_at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
            <h2 className="text-xl font-bold" style={{ color: colors.navy }}>Case action</h2>
            {!selectedCase ? <p className="text-sm mt-3" style={{ color: colors.muted }}>Select a case to inspect its server-authorized controls.</p> : (
              <form className="mt-4 space-y-4" onSubmit={handleAction}>
                <p className="text-sm" style={{ color: colors.muted }}>Case #{selectedCase.case_number} · {selectedCase.status}</p>
                <button type="button" onClick={() => handleClaim(selectedCase.id)} className="w-full px-4 py-3 rounded-lg text-sm font-bold" style={{ background: '#E8F0FE', color: colors.navy }} disabled={actionLoading}>Claim case</button>
                <label className="block text-sm font-semibold" style={{ color: colors.navy }}>Action<select value={actionType} onChange={(event) => setActionType(event.target.value)} className="w-full mt-1 p-3 rounded-lg border"><option value="warn">Warn</option><option value="hide_content">Hide content</option><option value="limit_posting">Limit posting</option><option value="freeze_listing">Freeze listing</option><option value="pause_submission">Pause submission</option><option value="suspend_account">Suspend account</option><option value="restore_content">Restore content</option><option value="dismiss">Dismiss</option></select></label>
                <label className="block text-sm font-semibold" style={{ color: colors.navy }}>Reason code<input value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className="w-full mt-1 p-3 rounded-lg border" required /></label>
                <label className="block text-sm font-semibold" style={{ color: colors.navy }}>Rationale<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} className="w-full mt-1 p-3 rounded-lg border" rows="5" required /></label>
                <button type="submit" className="w-full px-4 py-3 rounded-lg text-sm font-bold text-white" style={{ background: colors.navy }} disabled={actionLoading}>{actionLoading ? 'Submitting…' : 'Apply audited action'}</button>
              </form>
            )}
          </section>
        </div>

        <section className="rounded-2xl p-6 mt-6" style={{ background: 'white', boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <h2 className="text-xl font-bold" style={{ color: colors.navy }}>Recent admin audit events</h2>
          {auditEvents.length === 0 ? <p className="text-sm mt-3" style={{ color: colors.muted }}>No audit events are available to this administrator.</p> : <div className="mt-4 space-y-2">{auditEvents.map((event) => <div key={event.id} className="flex justify-between gap-4 p-3 rounded-lg" style={{ background: '#F5F7FA' }}><span className="text-sm font-semibold" style={{ color: colors.navy }}>{event.action}</span><span className="text-xs" style={{ color: colors.muted }}>{new Date(event.created_at).toLocaleString()}</span></div>)}</div>}
        </section>
      </main>
    </div>
  )
}
