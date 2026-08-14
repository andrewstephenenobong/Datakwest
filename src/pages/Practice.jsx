import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getPracticeHistory, startPracticeSession, submitPracticeAnswer } from '../lib/practice'

const modes = [
  ['adaptive', 'Adaptive practice'],
  ['spaced', 'Spaced repetition'],
  ['timed', 'Timed challenge'],
  ['mock_exam', 'Mock exam'],
  ['weak_topic', 'Weak-topic review'],
]

function promptText(prompt) {
  if (!prompt) return 'Practice item'
  if (typeof prompt === 'string') return prompt
  return prompt.question || prompt.text || prompt.title || 'Practice item'
}

function answerOptions(prompt) {
  return Array.isArray(prompt?.options) ? prompt.options : []
}

export default function Practice() {
  const { user } = useAuth()
  const [mode, setMode] = useState('adaptive')
  const [session, setSession] = useState(null)
  const [history, setHistory] = useState([])
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadHistory() {
      const { history: items, error: historyError } = await getPracticeHistory(10)
      setHistory(items)
      if (historyError) setError(historyError.message)
      setHistoryLoading(false)
    }
    if (user) loadHistory()
  }, [user])

  async function beginSession() {
    setLoading(true)
    setError('')
    setResults({})
    setAnswers({})
    const { session: nextSession, error: sessionError } = await startPracticeSession({ mode, itemLimit: mode === 'mock_exam' ? 10 : 5 })
    if (sessionError) setError(sessionError.message)
    else setSession(nextSession)
    setLoading(false)
  }

  async function submit(item) {
    const answer = answers[item.id]
    if (answer === undefined || answer === '') return
    const { result, error: submitError } = await submitPracticeAnswer({
      sessionId: session.session_id,
      practiceItemId: item.id,
      answer: typeof answer === 'string' ? { value: answer } : answer,
    })
    if (submitError) setError(submitError.message)
    else {
      setResults((current) => ({ ...current, [item.id]: result }))
      setHistory((current) => [{ attempt_id: result.attempt_id, score: result.score, created_at: new Date().toISOString() }, ...current].slice(0, 10))
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Deliberate practice</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Practice Engine</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>Practise what you know, review weak topics, and let the server track your evidence of mastery.</p>
        </div>

        {error && <div className="rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}

        <section className="bg-white rounded-2xl p-6 mb-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#0A2342' }}>Choose a practice mode</h2>
              <p className="text-sm mt-1" style={{ color: '#6B7A99' }}>Scoring and progression are calculated by the secure backend.</p>
            </div>
            <button type="button" onClick={beginSession} disabled={loading} className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: '#0A2342', color: 'white' }}>{loading ? 'Starting…' : 'Start practice'}</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
            {modes.map(([value, label]) => (
              <label key={value} className="rounded-xl p-4 border cursor-pointer" style={{ borderColor: mode === value ? '#0A2342' : '#E5EAF0', background: mode === value ? '#F0F6FF' : 'white' }}>
                <input type="radio" name="practice-mode" value={value} checked={mode === value} onChange={(event) => setMode(event.target.value)} className="mr-2" />
                <span className="text-sm font-semibold" style={{ color: '#0A2342' }}>{label}</span>
              </label>
            ))}
          </div>
        </section>

        {session && (
          <section className="grid gap-5 mb-8">
            {session.items?.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><h2 className="font-bold" style={{ color: '#0A2342' }}>No published practice items yet</h2><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Choose another mode or return when the curriculum team publishes practice content.</p></div>
            ) : session.items.map((item) => {
              const prompt = item.prompt || {}
              const options = answerOptions(prompt)
              const result = results[item.id]
              return (
                <article key={item.id} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
                  <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>Item {item.position}</span><span className="text-xs font-semibold" style={{ color: '#6B7A99' }}>Difficulty {item.difficulty}</span></div>
                  <h2 className="text-lg font-bold mt-3" style={{ color: '#0A2342' }}>{promptText(prompt)}</h2>
                  {options.length > 0 ? <div className="grid gap-2 mt-5">{options.map((option) => <label key={String(option)} className="rounded-xl border p-3 text-sm" style={{ borderColor: answers[item.id] === option ? '#0A2342' : '#E5EAF0' }}><input type="radio" name={`answer-${item.id}`} checked={answers[item.id] === option} onChange={() => setAnswers((current) => ({ ...current, [item.id]: option }))} className="mr-2" disabled={Boolean(result)} />{String(option)}</label>)}</div> : <input type="text" value={answers[item.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))} disabled={Boolean(result)} placeholder="Type your answer" className="w-full rounded-xl border p-3 mt-5 text-sm" />}
                  {result ? <div className="mt-5 rounded-xl p-4" style={{ background: result.correct ? '#EAF7F0' : '#FFFBEF', color: result.correct ? '#2E7D32' : '#8A6500' }}><p className="font-bold">{result.correct ? 'Correct' : 'Keep practising'} · {result.score}/100</p><p className="text-sm mt-1">{result.completed_items} of {result.total_items} items completed.</p></div> : <button type="button" onClick={() => submit(item)} disabled={answers[item.id] === undefined || answers[item.id] === ''} className="mt-5 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: '#0A2342', color: 'white' }}>Submit answer</button>}
                </article>
              )
            })}
          </section>
        )}

        <section className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <h2 className="text-xl font-bold" style={{ color: '#0A2342' }}>Recent practice history</h2>
          {historyLoading ? <p className="text-sm mt-4" style={{ color: '#6B7A99' }}>Loading history…</p> : history.length === 0 ? <p className="text-sm mt-4" style={{ color: '#6B7A99' }}>Your completed practice attempts will appear here.</p> : <div className="grid gap-3 mt-4">{history.map((attempt) => <div key={attempt.attempt_id} className="flex justify-between items-center rounded-xl p-3" style={{ background: '#F5F7FA' }}><span className="text-sm" style={{ color: '#6B7A99' }}>{new Date(attempt.created_at).toLocaleDateString()}</span><span className="font-bold" style={{ color: '#0A2342' }}>{attempt.score}/100</span></div>)}</div>}
        </section>
      </main>
    </div>
  )
}
