import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import { getInterviewWorkspace, startInterviewSession, submitInterviewResponse, submitInterviewSession } from '../lib/interviews'

const interviewTypes = [
  { value: 'technical', label: 'Technical', description: 'Explain concepts and decisions clearly.' },
  { value: 'behavioural', label: 'Behavioural', description: 'Practise structured stories from your experience.' },
  { value: 'hr', label: 'HR & motivation', description: 'Prepare for the human side of interviews.' },
  { value: 'coding', label: 'Coding', description: 'Reason through a practical implementation task.' },
  { value: 'portfolio', label: 'Portfolio', description: 'Defend the evidence you have built.' },
]

function getPromptText(prompt) {
  if (typeof prompt === 'string') return prompt
  return prompt?.question || prompt?.prompt || prompt?.text || 'Respond to this interview prompt.'
}

export default function Interviews() {
  const [selectedType, setSelectedType] = useState('technical')
  const [workspace, setWorkspace] = useState(null)
  const [session, setSession] = useState(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadWorkspace(type = selectedType) {
    setLoading(true)
    setError('')
    const { workspace: nextWorkspace, error: loadError } = await getInterviewWorkspace(type)
    if (loadError) setError(loadError.message)
    setWorkspace(nextWorkspace || { templates: [], history: [] })
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    async function load() {
      const { workspace: nextWorkspace, error: loadError } = await getInterviewWorkspace(selectedType)
      if (!active) return
      if (loadError) setError(loadError.message)
      setWorkspace(nextWorkspace || { templates: [], history: [] })
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [selectedType])

  const template = useMemo(() => workspace?.templates?.[0] || null, [workspace])
  const prompt = session?.prompts?.[session.currentPromptIndex || 0]
  const promptCount = session?.prompts?.length || 0
  const answeredCount = session?.answered_count || 0

  async function handleStart() {
    if (!template) return
    setWorking(true)
    setError('')
    setNotice('')
    const { session: nextSession, error: startError } = await startInterviewSession(template.id)
    if (startError) {
      setError(startError.message)
    } else {
      setSession({ ...nextSession, currentPromptIndex: 0, answered_count: 0 })
      setAnswer('')
    }
    setWorking(false)
  }

  async function handleAnswer(event) {
    event.preventDefault()
    if (!session || !answer.trim()) return
    const promptIndex = session.currentPromptIndex || 0
    setWorking(true)
    setError('')
    const { result, error: responseError } = await submitInterviewResponse(session.session_id, promptIndex, { text: answer.trim() })
    if (responseError) {
      setError(responseError.message)
      setWorking(false)
      return
    }
    const nextIndex = promptIndex + 1
    setSession((current) => ({
      ...current,
      currentPromptIndex: nextIndex,
      answered_count: result?.answered_count || nextIndex,
    }))
    setAnswer('')
    setWorking(false)
  }

  async function handleSubmit() {
    if (!session) return
    setWorking(true)
    setError('')
    const { result, error: submitError } = await submitInterviewSession(session.session_id)
    if (submitError) setError(submitError.message)
    else {
      setSession(null)
      setNotice(result?.evaluation_status === 'pending' ? 'Your responses are saved. Evaluation will be generated from the versioned rubric.' : 'Interview submitted.')
      await loadWorkspace()
    }
    setWorking(false)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-end justify-between gap-5 flex-wrap mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#B28A12' }}>Career acceleration</p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-2" style={{ color: '#0A2342' }}>Practise the conversation before it counts.</h1>
            <p className="mt-3 max-w-2xl leading-7" style={{ color: '#6B7A99' }}>Use structured interview practice to turn your learning evidence into clearer explanations, stronger stories, and a focused preparation plan.</p>
          </div>
          <div className="rounded-2xl px-5 py-4" style={{ background: '#0A2342', color: 'white' }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#D4AF37' }}>Evidence first</p>
            <p className="font-semibold mt-1">Scores follow evaluated responses.</p>
          </div>
        </div>

        <section className="grid lg:grid-cols-[280px_1fr] gap-5 mb-8" aria-labelledby="interview-modes-title">
          <div className="rounded-2xl p-5" style={{ background: '#0A2342' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#D4AF37' }}>Choose a mode</p>
            <h2 id="interview-modes-title" className="text-xl font-bold text-white mt-2">Build career confidence</h2>
            <p className="text-sm leading-6 mt-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Start with one interview type. You can build breadth after you understand where your evidence is strongest.</p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {interviewTypes.map((type) => (
              <button key={type.value} type="button" onClick={() => setSelectedType(type.value)} className="text-left rounded-2xl p-4 min-h-[142px] border-2" style={{ background: selectedType === type.value ? '#FFF8DE' : 'white', borderColor: selectedType === type.value ? '#D4AF37' : '#E4E9F0' }} aria-pressed={selectedType === type.value}>
                <span className="text-sm font-bold" style={{ color: '#0A2342' }}>{type.label}</span>
                <span className="block text-xs leading-5 mt-2" style={{ color: '#6B7A99' }}>{type.description}</span>
              </button>
            ))}
          </div>
        </section>

        {error && <div role="alert" className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: '#FDECEC', color: '#991B1B' }}>{error}</div>}
        {notice && <div role="status" className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: '#E8F5E9', color: '#246B36' }}>{notice}</div>}

        {loading ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'white' }}>Loading interview practice…</div>
        ) : session ? (
          <section className="rounded-2xl p-6 sm:p-8" style={{ background: 'white', boxShadow: '0 12px 32px rgba(10,35,66,0.08)' }} aria-labelledby="active-interview-title">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B28A12' }}>{session.interview_type} interview</p>
                <h2 id="active-interview-title" className="text-2xl font-bold mt-2" style={{ color: '#0A2342' }}>{session.title}</h2>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#6B7A99' }}>Question {Math.min((session.currentPromptIndex || 0) + 1, promptCount)} of {promptCount}</span>
            </div>
            <div className="h-2 rounded-full mt-6" style={{ background: '#E8EDF4' }}><div className="h-2 rounded-full" style={{ width: `${promptCount ? Math.min(100, ((answeredCount / promptCount) * 100)) : 0}%`, background: '#D4AF37' }} /></div>
            {prompt ? (
              <form onSubmit={handleAnswer} className="mt-8">
                <p className="text-xl font-semibold leading-8" style={{ color: '#0A2342' }}>{getPromptText(prompt)}</p>
                <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={7} className="w-full rounded-xl border p-4 mt-5 outline-none" style={{ borderColor: '#D8E0EB' }} placeholder="Write your answer as if you were speaking to an interviewer…" aria-label="Interview response" />
                <div className="flex justify-between items-center gap-3 mt-4 flex-wrap"><p className="text-xs" style={{ color: '#6B7A99' }}>Your response is saved as evidence and evaluated after submission.</p><button type="submit" disabled={working || !answer.trim()} className="rounded-xl px-5 py-3 font-bold disabled:opacity-50" style={{ background: '#0A2342', color: 'white' }}>{working ? 'Saving…' : 'Save response'}</button></div>
              </form>
            ) : (
              <div className="mt-8 rounded-xl p-5" style={{ background: '#F5F7FA' }}><p className="font-semibold" style={{ color: '#0A2342' }}>All prompts answered.</p><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Submit this attempt to send it for versioned evaluation.</p><button type="button" onClick={handleSubmit} disabled={working} className="rounded-xl px-5 py-3 font-bold mt-5 disabled:opacity-50" style={{ background: '#D4AF37', color: '#0A2342' }}>{working ? 'Submitting…' : 'Submit interview'}</button></div>
            )}
          </section>
        ) : (
          <section className="grid lg:grid-cols-[1fr_320px] gap-5">
            <div className="rounded-2xl p-6 sm:p-8" style={{ background: 'white', boxShadow: '0 12px 32px rgba(10,35,66,0.08)' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B28A12' }}>Recommended practice</p>
              <h2 className="text-2xl font-bold mt-2" style={{ color: '#0A2342' }}>{template?.title || 'No published interview yet'}</h2>
              <p className="mt-3 leading-7" style={{ color: '#6B7A99' }}>{template?.description || 'This interview mode will appear when a reviewed and published template is available for your learner path.'}</p>
              <button type="button" onClick={handleStart} disabled={!template || working} className="rounded-xl px-5 py-3 font-bold mt-6 disabled:opacity-50" style={{ background: '#0A2342', color: 'white' }}>{working ? 'Starting…' : 'Start interview practice'}</button>
            </div>
            <aside className="rounded-2xl p-6" style={{ background: '#FFF8DE' }}><p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8A6C0B' }}>Your history</p><p className="text-3xl font-bold mt-3" style={{ color: '#0A2342' }}>{workspace?.history?.length || 0}</p><p className="text-sm mt-1" style={{ color: '#6B7A99' }}>saved attempts</p><div className="mt-5 space-y-3">{(workspace?.history || []).slice(0, 3).map((item) => <div key={item.session_id} className="border-t pt-3" style={{ borderColor: '#E9DDAA' }}><p className="text-sm font-semibold" style={{ color: '#0A2342' }}>{item.title}</p><p className="text-xs mt-1" style={{ color: '#6B7A99' }}>{item.status} · {item.total_score ?? 'Pending evaluation'}</p></div>)}</div></aside>
          </section>
        )}
      </main>
    </div>
  )
}
