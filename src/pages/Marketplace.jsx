import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { applyToOpportunity, getMarketplace, getMyApplications, withdrawApplication } from '../lib/marketplace'

const types = { job: 'Job', internship: 'Internship', freelance: 'Freelance', project: 'Project' }

export default function Marketplace() {
  const { user } = useAuth()
  const [opportunities, setOpportunities] = useState([])
  const [applications, setApplications] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [evidence, setEvidence] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      const [{ marketplace, error: marketplaceError }, { applications: applicationData, error: applicationsError }] = await Promise.all([getMarketplace(), getMyApplications()])
      if (cancelled) return
      setOpportunities(marketplace.opportunities || [])
      setApplications(applicationData.applications || [])
      setSelectedId((current) => current || marketplace.opportunities?.[0]?.id || null)
      setError(marketplaceError?.message || applicationsError?.message || '')
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  async function submitApplication() {
    if (!selectedId) return
    setBusyId(selectedId)
    setError('')
    setNotice('')
    let payload = {}
    if (evidence.trim()) payload = { statement: evidence.trim() }
    const { application, error: applicationError } = await applyToOpportunity(selectedId, payload)
    if (applicationError) setError(applicationError.message)
    else {
      const opportunity = opportunities.find((item) => item.id === selectedId)
      setOpportunities((current) => current.map((item) => item.id === selectedId ? { ...item, application_status: application?.status || 'submitted' } : item))
      setApplications((current) => [{ id: application.application_id, opportunity_id: selectedId, title: opportunity?.title, organisation_name: opportunity?.organisation_name, opportunity_type: opportunity?.opportunity_type, status: application.status, evidence: payload, created_at: application.created_at, updated_at: application.updated_at }, ...current.filter((item) => item.opportunity_id !== selectedId)])
      setNotice('Your application has been submitted.')
      setEvidence('')
    }
    setBusyId(null)
  }

  async function withdraw(application) {
    setBusyId(application.id)
    setError('')
    setNotice('')
    const { application: result, error: withdrawalError } = await withdrawApplication(application.id)
    if (withdrawalError) setError(withdrawalError.message)
    else {
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, status: result.status } : item))
      setOpportunities((current) => current.map((item) => item.id === application.opportunity_id ? { ...item, application_status: result.status } : item))
      setNotice('Your application was withdrawn.')
    }
    setBusyId(null)
  }

  const selected = opportunities.find((item) => item.id === selectedId)
  const alreadyApplied = selected?.application_status && selected.application_status !== 'withdrawn'

  return <div className="min-h-screen" style={{ background: '#F5F7FA' }}><Navbar /><main className="max-w-5xl mx-auto px-6 py-10"><Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link><div className="mt-6 mb-8"><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#2456A6' }}>Career marketplace</p><h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Marketplace</h1><p className="mt-2" style={{ color: '#6B7A99' }}>Explore permissioned opportunities and submit evidence without exposing private learner data to employers.</p></div>{error && <div className="rounded-xl p-4 mb-4" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}{notice && <div className="rounded-xl p-4 mb-4" style={{ background: '#EAF7F0', color: '#2E7D32' }} role="status">{notice}</div>}{loading ? <div className="bg-white rounded-2xl p-8 text-center">Loading opportunities…</div> : <div className="grid lg:grid-cols-[310px_1fr] gap-6"><aside className="bg-white rounded-2xl p-4 h-fit" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><h2 className="font-bold px-2" style={{ color: '#0A2342' }}>Open opportunities</h2>{opportunities.length === 0 ? <p className="text-sm p-2 mt-3" style={{ color: '#6B7A99' }}>No published opportunities are available yet.</p> : <div className="grid gap-2 mt-3">{opportunities.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="text-left rounded-xl p-3" style={{ background: item.id === selectedId ? '#E8F0FE' : '#F5F7FA' }}><p className="font-semibold text-sm" style={{ color: '#0A2342' }}>{item.title}</p><p className="text-xs mt-1" style={{ color: '#6B7A99' }}>{types[item.opportunity_type] || 'Opportunity'} · {item.application_status || 'Not applied'}</p></button>)}</div>}</aside><section>{selected ? <div className="bg-white rounded-2xl p-6 mb-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#2456A6' }}>{types[selected.opportunity_type] || 'Opportunity'}</p><h2 className="text-2xl font-bold mt-2" style={{ color: '#0A2342' }}>{selected.title}</h2><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>{selected.organisation_name || 'DataKwest opportunity partner'}</p><p className="text-sm leading-relaxed mt-5 whitespace-pre-wrap" style={{ color: '#0A2342' }}>{selected.description}</p>{selected.requirements && <pre className="text-xs mt-5 p-4 rounded-xl overflow-auto" style={{ background: '#F5F7FA', color: '#6B7A99' }}>{JSON.stringify(selected.requirements, null, 2)}</pre>}{alreadyApplied ? <div className="mt-6 rounded-xl p-4" style={{ background: '#EAF7F0', color: '#2E7D32' }}>Application status: <strong>{selected.application_status}</strong></div> : <div className="mt-6"><label htmlFor="application-evidence" className="text-sm font-semibold" style={{ color: '#0A2342' }}>Optional application statement<textarea id="application-evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} maxLength={4000} rows={5} placeholder="Share relevant evidence, project links, or context for this opportunity." className="block w-full rounded-xl border p-3 mt-2" /></label><button type="button" onClick={submitApplication} disabled={busyId === selected.id} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: '#0A2342', color: 'white' }}>{busyId === selected.id ? 'Applying…' : 'Submit application'}</button></div>}</div> : <div className="bg-white rounded-2xl p-8 text-center mb-6"><p className="text-sm" style={{ color: '#6B7A99' }}>Select a published opportunity to review it.</p></div>}<div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><h2 className="text-lg font-bold" style={{ color: '#0A2342' }}>Your applications</h2>{applications.length === 0 ? <p className="text-sm mt-3" style={{ color: '#6B7A99' }}>Your submitted applications will appear here.</p> : <div className="grid gap-3 mt-4">{applications.map((application) => <div key={application.id} className="flex items-center justify-between gap-4 rounded-xl p-3" style={{ background: '#F5F7FA' }}><div><p className="font-semibold text-sm" style={{ color: '#0A2342' }}>{application.title || 'Opportunity application'}</p><p className="text-xs mt-1" style={{ color: '#6B7A99' }}>{application.organisation_name || 'Partner'} · {application.status}</p></div>{['submitted', 'reviewing', 'shortlisted'].includes(application.status) && <button type="button" onClick={() => withdraw(application)} disabled={busyId === application.id} className="text-xs font-bold" style={{ color: '#991B1B' }}>{busyId === application.id ? 'Updating…' : 'Withdraw'}</button>}</div>)}</div>}</div></section></div>}</main></div>
}
