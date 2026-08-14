import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getMyPortfolio } from '../lib/portfolio'

const statusLabels = {
  draft: 'Draft',
  submitted: 'Submitted for review',
  in_review: 'In review',
  reviewed: 'Reviewed',
  published: 'Published',
}

export default function Portfolio() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPortfolio() {
      const { submissions: portfolioItems, error: portfolioError } = await getMyPortfolio(user.id)
      setSubmissions(portfolioItems)
      setError(portfolioError?.message || '')
      setLoading(false)
    }

    if (user) loadPortfolio()
  }, [user])

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Your evidence</p>
            <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Portfolio</h1>
            <p className="mt-2" style={{ color: '#6B7A99' }}>A record of the work, reflection, and feedback that show your progress.</p>
          </div>
          <Link to="/project" className="px-4 py-3 rounded-xl text-sm font-bold" style={{ background: '#0A2342', color: 'white' }}>Add project</Link>
        </div>

        {error && <div className="rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>Loading your portfolio…</div>
        ) : submissions.length === 0 ? (
          <section className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
            <h2 className="text-lg font-bold" style={{ color: '#0A2342' }}>Your portfolio is ready for its first project</h2>
            <p className="text-sm mt-2 max-w-lg mx-auto" style={{ color: '#6B7A99' }}>Submit a project with a clear explanation and reflection. Each submission becomes evidence of your growing capability.</p>
            <Link to="/project" className="inline-block mt-5 px-4 py-3 rounded-xl text-sm font-bold" style={{ background: '#D4AF37', color: '#0A2342' }}>Start a project</Link>
          </section>
        ) : (
          <div className="space-y-5">
            {submissions.map((submission) => (
              <article key={submission.id} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7A99' }}>{submission.project?.title || 'Project submission'}</p>
                    <h2 className="text-xl font-bold mt-1" style={{ color: '#0A2342' }}>{submission.status ? statusLabels[submission.status] || submission.status : 'Saved evidence'}</h2>
                  </div>
                  {submission.submitted_at && <time className="text-xs" style={{ color: '#6B7A99' }} dateTime={submission.submitted_at}>{new Date(submission.submitted_at).toLocaleDateString()}</time>}
                </div>
                <p className="text-sm leading-relaxed mt-4 whitespace-pre-wrap" style={{ color: '#6B7A99' }}>{submission.evidence?.summary || 'Evidence summary not provided.'}</p>
                {submission.evidence?.url && <a href={submission.evidence.url} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold mt-3" style={{ color: '#1E5AA8' }}>View project evidence ↗</a>}
                {submission.reflection && (
                  <div className="rounded-xl p-4 mt-5" style={{ background: '#F5F7FA' }}>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7A99' }}>Reflection</p>
                    <p className="text-sm mt-2 leading-relaxed" style={{ color: '#0A2342' }}>{submission.reflection}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
