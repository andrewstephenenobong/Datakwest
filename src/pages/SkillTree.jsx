import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getLearnerSkillTree } from '../lib/skillTree'

export default function SkillTree() {
  const { user } = useAuth()
  const [tree, setTree] = useState({ career_paths: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTree() {
      const { tree: data, error: treeError } = await getLearnerSkillTree()
      setTree(data)
      setError(treeError?.message || '')
      setLoading(false)
    }

    if (user) loadTree()
  }, [user])

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Your learning map</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Skill Tree</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>Follow the published path from core concepts to applied practice and mastery.</p>
        </div>

        {error && <div className="rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>Loading your skill tree…</div>
        ) : tree.career_paths?.length === 0 ? (
          <section className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
            <h2 className="text-lg font-bold" style={{ color: '#0A2342' }}>Your learning map is being prepared</h2>
            <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Published career paths and concepts will appear here as curriculum is released.</p>
          </section>
        ) : (
          <div className="space-y-8">
            {tree.career_paths.map((careerPath) => (
              <section key={careerPath.slug} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
                <h2 className="text-2xl font-bold" style={{ color: '#0A2342' }}>{careerPath.title}</h2>
                <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>{careerPath.description}</p>
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  {careerPath.skills?.map((skill) => (
                    <article key={skill.slug} className="rounded-xl p-5" style={{ background: '#F5F7FA', border: '1px solid #E2E8F0' }}>
                      <h3 className="font-bold" style={{ color: '#0A2342' }}>{skill.title}</h3>
                      <p className="text-sm mt-1" style={{ color: '#6B7A99' }}>{skill.description}</p>
                      {skill.nodes?.length ? (
                        <ol className="mt-4 space-y-2">
                          {skill.nodes.map((node, index) => (
                            <li key={node.slug} className="flex items-center gap-3 text-sm">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: node.available ? '#D4AF37' : '#E2E8F0', color: '#0A2342' }}>{index + 1}</span>
                              <span style={{ color: '#0A2342' }}>{node.title}</span>
                              <span className="ml-auto text-xs" style={{ color: node.available ? '#2E7D32' : '#6B7A99' }}>{node.available ? 'Available' : 'Coming soon'}</span>
                            </li>
                          ))}
                        </ol>
                      ) : <p className="text-xs mt-4" style={{ color: '#6B7A99' }}>Concepts coming soon.</p>}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
