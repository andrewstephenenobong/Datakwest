import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getPublishedProject, submitProjectEvidence } from '../lib/projects'

export default function Project() {
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceSummary, setEvidenceSummary] = useState('')
  const [reflection, setReflection] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadProject() {
      const { project: publishedProject, error: projectError } = await getPublishedProject()
      setProject(publishedProject)
      setError(projectError?.message || '')
      setLoading(false)
    }

    if (user) loadProject()
  }, [user])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!project || !evidenceSummary.trim() || !reflection.trim()) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    const { submission, error: submissionError } = await submitProjectEvidence(
      project.id,
      { url: evidenceUrl.trim(), summary: evidenceSummary.trim() },
      reflection.trim(),
    )

    if (submissionError) {
      setError(submissionError.message)
    } else if (submission) {
      setSuccess('Your project evidence has been submitted for review.')
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F7FA' }}><div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} role="status" aria-label="Loading project" /></div>
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Portfolio evidence</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Submit a project</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>Turn your learning into evidence that can be reviewed and added to your portfolio.</p>
        </div>

        {error && <div className="rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {success && <div className="rounded-xl p-4 mb-6" style={{ background: '#E8F5E9', color: '#2E7D32' }} role="status">{success}</div>}

        {!project ? (
          <section className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
            <h2 className="text-lg font-bold" style={{ color: '#0A2342' }}>Your first project is being prepared</h2>
            <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Complete more lessons and practice activities. A published project brief will appear here when it is ready.</p>
          </section>
        ) : (
          <>
            <section className="bg-white rounded-2xl p-6 mb-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
              <h2 className="text-xl font-bold" style={{ color: '#0A2342' }}>{project.title}</h2>
              <p className="text-sm leading-relaxed mt-3 whitespace-pre-wrap" style={{ color: '#6B7A99' }}>{project.brief}</p>
              {project.rubric?.criteria && <p className="text-sm font-semibold mt-4" style={{ color: '#0A2342' }}>Review criteria: {project.rubric.criteria}</p>}
            </section>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
              <h2 className="text-lg font-bold mb-5" style={{ color: '#0A2342' }}>Your evidence</h2>
              <label className="block text-sm font-semibold mb-2" htmlFor="evidence-url">Project link (optional)</label>
              <input id="evidence-url" type="url" value={evidenceUrl} onChange={event => setEvidenceUrl(event.target.value)} placeholder="https://..." className="w-full rounded-xl border px-4 py-3 mb-5" style={{ borderColor: '#E2E8F0' }} />
              <label className="block text-sm font-semibold mb-2" htmlFor="evidence-summary">What did you build?</label>
              <textarea id="evidence-summary" required rows="5" value={evidenceSummary} onChange={event => setEvidenceSummary(event.target.value)} placeholder="Describe the problem, your approach, and the result." className="w-full rounded-xl border px-4 py-3 mb-5 resize-y" style={{ borderColor: '#E2E8F0' }} />
              <label className="block text-sm font-semibold mb-2" htmlFor="reflection">What did you learn?</label>
              <textarea id="reflection" required rows="4" value={reflection} onChange={event => setReflection(event.target.value)} placeholder="Reflect on your decisions, trade-offs, and next improvement." className="w-full rounded-xl border px-4 py-3 mb-6 resize-y" style={{ borderColor: '#E2E8F0' }} />
              <button type="submit" disabled={submitting || !evidenceSummary.trim() || !reflection.trim()} className="px-5 py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: '#0A2342', color: 'white' }}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
