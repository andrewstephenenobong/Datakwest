import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { logEvent } from '../lib/analytics'
import { sendTutorMessage } from '../lib/tutor'

const MODES = [
  { id: 'tutor', label: 'Explain', prompt: 'Explain a concept clearly' },
  { id: 'hint', label: 'Give me a hint', prompt: 'Give me a hint without solving it for me' },
  { id: 'practice', label: 'Practice me', prompt: 'Give me a short practice question' },
  { id: 'review', label: 'Review my work', prompt: 'Review my answer and tell me what to improve' },
]

function normaliseSources(response) {
  const sources = response?.sources || response?.citations || []
  return Array.isArray(sources) ? sources.filter((source) => source?.title || source?.url) : []
}

function renderTutorText(text) {
  return text.split(/```/g).map((segment, segmentIndex) => {
    if (segmentIndex % 2 === 1) {
      const code = segment.replace(/^\w+\n/, '')
      return <pre key={`code-${segmentIndex}`} className="mt-3 overflow-x-auto rounded-xl p-4 text-xs leading-6" style={{ background: '#0A2342', color: '#E8F0FE' }}><code>{code}</code></pre>
    }

    return segment.split(/\n{2,}/g).filter(Boolean).map((paragraph, paragraphIndex) => <p key={`paragraph-${segmentIndex}-${paragraphIndex}`} className={segmentIndex === 0 && paragraphIndex === 0 ? '' : 'mt-3'}>{paragraph}</p>)
  })
}

export default function Tutor() {
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState('tutor')
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [lastRequest, setLastRequest] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [reportedIndex, setReportedIndex] = useState(null)
  const [savedIndex, setSavedIndex] = useState(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const { user } = useAuth()
  const draftKey = `datakwest:tutor-draft:${user?.id || 'anonymous'}`

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(draftKey)
      if (savedDraft) setMessage(savedDraft)
    } catch {
      // Draft persistence is an enhancement; the Tutor remains usable when storage is unavailable.
    }
    setDraftRestored(true)
  }, [draftKey])

  useEffect(() => {
    if (!draftRestored) return
    try {
      if (message) window.localStorage.setItem(draftKey, message)
      else window.localStorage.removeItem(draftKey)
    } catch {
      // Ignore storage failures so learners can continue typing and submitting.
    }
  }, [draftKey, draftRestored, message])

  const activeMode = useMemo(() => MODES.find((item) => item.id === mode) || MODES[0], [mode])

  async function submitTutorMessage(nextMessage = message, nextMode = mode) {
    const trimmedMessage = nextMessage.trim()
    if (!trimmedMessage || sending) return

    setSending(true)
    setError('')
    setLastRequest({ message: trimmedMessage, mode: nextMode })
    setMessages((current) => [...current, { role: 'user', text: trimmedMessage, mode: nextMode }])
    setMessage('')

    const { response, error: requestError } = await sendTutorMessage({
      message: trimmedMessage,
      mode: nextMode,
      conversationId,
    })

    if (requestError || response?.error) {
      setError(requestError?.message || response?.error || 'The Datakwest owl is unavailable right now. Your question is safe—try again when the connection returns.')
    } else if (response?.reply) {
      setConversationId(response.conversationId || conversationId)
      setMessages((current) => [...current, {
        role: 'assistant',
        text: response.reply,
        mode: nextMode,
        nextAction: response.nextAction,
        evidenceRequest: response.evidenceRequest,
        sources: normaliseSources(response),
        confidence: response.confidence,
      }])
    } else {
      setError('The Tutor returned an incomplete response. Please try the same question again.')
    }
    setSending(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    submitTutorMessage()
  }

  async function reportAnswer(index) {
    await logEvent(user?.id, 'tutor_answer_reported', { message_index: index, source: 'tutor', reason: 'learner_reported' })
    setReportedIndex(index)
  }

  function startNewConversation() {
    setMessages([])
    setConversationId(null)
    setError('')
    setLastRequest(null)
    setCopiedIndex(null)
    setReportedIndex(null)
    setSavedIndex(null)
  }

  async function saveExplanation(index) {
    await logEvent(user?.id, 'tutor_explanation_saved', { message_index: index, source: 'tutor' })
    setSavedIndex(index)
  }

  async function copyMessage(text, index) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      window.setTimeout(() => setCopiedIndex(null), 1600)
    } catch {
      setError('Copy is unavailable in this browser. Select the response manually instead.')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 sm:py-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
          <button type="button" onClick={startNewConversation} className="rounded-xl border px-3 py-2 text-xs font-bold" style={{ borderColor: '#DCE5F0', background: 'white', color: '#2456A6' }}>New conversation</button>
        </div>

        <section className="mt-6 overflow-hidden rounded-[2rem] border" style={{ borderColor: '#DCE5F0', background: 'white', boxShadow: '0 16px 50px rgba(10,35,66,0.08)' }}>
          <div className="flex flex-col gap-5 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7" style={{ borderColor: '#E7EDF5', background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FBFF 100%)' }}>
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl" style={{ background: '#FFF5D8' }}>
                <img src="/datakwest-owl-3d.webp" alt="Datakwest owl tutor" className="h-14 w-14 object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: '#9A7610' }}>Datakwest owl tutor</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl" style={{ color: '#0A2342' }}>Ask for help, not shortcuts.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: '#6B7A99' }}>I explain, ask useful questions, and help you turn stuck moments into independent confidence.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2" aria-label="Tutor context">
              <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: '#EEF3FA', color: '#2456A6' }}>Current skill: your active path</span>
              <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: '#EEF6F1', color: '#2D8A5A' }}>Evidence-first guidance</span>
              <Link to="/settings" className="rounded-full px-3 py-1.5 text-xs font-bold underline underline-offset-2" style={{ background: '#FFF9E8', color: '#967414' }}>Review privacy controls</Link>
            </div>
          </div>

          <div className="p-4 sm:p-7">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tutor modes">
              {MODES.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} onClick={() => setMode(item.id)} className="rounded-xl px-3 py-2 text-xs font-bold transition" style={{ background: mode === item.id ? '#0A2342' : '#F4F7FB', color: mode === item.id ? 'white' : '#5D6D84' }}>{item.label}</button>
              ))}
            </div>
            <p className="mt-3 text-xs" style={{ color: '#8290A5' }}>Mode: <strong style={{ color: '#2456A6' }}>{activeMode.prompt}</strong>. The Tutor will adapt its response without replacing your own thinking. Your memory and analytics choices remain under your control.</p>

            <section className="mt-5 min-h-[20rem] rounded-2xl p-4 sm:p-6" style={{ background: '#F8FAFD' }} aria-label="Tutor conversation">
              {messages.length === 0 ? (
                <div className="flex min-h-[17rem] flex-col items-center justify-center text-center">
                  <img src="/datakwest-owl-3d.webp" alt="" aria-hidden="true" className="h-20 w-20 object-contain opacity-90" />
                  <p className="mt-3 font-bold" style={{ color: '#0A2342' }}>What are you learning today?</p>
                  <p className="mt-2 max-w-md text-sm leading-6" style={{ color: '#6B7A99' }}>Choose a mode above, then ask a question. You can also start with one of these safe prompts.</p>
                  <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
                    {['Explain this concept simply', 'Give me a hint, not the answer', 'Quiz me on what I just learned'].map((prompt) => <button key={prompt} type="button" onClick={() => { setMode(prompt.includes('hint') ? 'hint' : prompt.includes('Quiz') ? 'practice' : 'tutor'); setMessage(prompt) }} className="rounded-xl border px-3 py-2 text-xs font-bold" style={{ borderColor: '#DCE5F0', background: 'white', color: '#2456A6' }}>{prompt}</button>)}
                  </div>
                </div>
              ) : (
                <div className="space-y-4" role="log" aria-live="polite" aria-relevant="additions" aria-atomic="false">
                  {messages.map((item, index) => (
                    <article key={`${item.role}-${index}`} className={`rounded-2xl p-4 sm:p-5 ${item.role === 'user' ? 'ml-4 sm:ml-16' : 'mr-4 sm:mr-16'}`} style={{ background: item.role === 'user' ? '#E8F0FE' : 'white', color: '#0A2342', border: item.role === 'assistant' ? '1px solid #E2EAF3' : 'none' }}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-wide" style={{ color: item.role === 'user' ? '#2456A6' : '#9A7610' }}>{item.role === 'user' ? 'You' : 'Datakwest owl'}</p>
                        {item.role === 'assistant' && <div className="flex items-center gap-3"><button type="button" onClick={() => saveExplanation(index)} className="text-xs font-bold" style={{ color: savedIndex === index ? '#2D8A5A' : '#6B7A99' }}>{savedIndex === index ? 'Saved' : 'Save'}</button><button type="button" onClick={() => copyMessage(item.text, index)} className="text-xs font-bold" style={{ color: '#6B7A99' }}>{copiedIndex === index ? 'Copied' : 'Copy'}</button><button type="button" onClick={() => reportAnswer(index)} className="text-xs font-bold" style={{ color: reportedIndex === index ? '#2D8A5A' : '#6B7A99' }}>{reportedIndex === index ? 'Reported' : 'Report answer'}</button></div>}
                      </div>
                      <div className="mt-2 text-sm leading-7">{renderTutorText(item.text)}</div>
                      {item.role === 'assistant' && item.confidence != null && <p className="mt-3 text-xs font-semibold" style={{ color: '#8290A5' }}>Response confidence: {Math.round(Number(item.confidence) * 100)}%. Verify important decisions with the cited evidence.</p>}
                      {item.role === 'assistant' && item.sources.length > 0 && <details className="mt-4 rounded-xl p-3" style={{ background: '#F4F7FB' }}><summary className="cursor-pointer text-xs font-black" style={{ color: '#2456A6' }}>Sources and learning evidence</summary><ul className="mt-2 space-y-2">{item.sources.map((source, sourceIndex) => <li key={`${source.url || source.title}-${sourceIndex}`}><a href={source.url} target="_blank" rel="noreferrer" className="text-xs font-semibold underline" style={{ color: '#416181' }}>{source.title || source.url}</a></li>)}</ul></details>}
                      {item.role === 'assistant' && item.nextAction?.label && <div className="mt-4 rounded-xl p-3" style={{ background: '#FFF9E8' }}><p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#967414' }}>Next best action</p><p className="mt-1 text-sm font-bold" style={{ color: '#0A2342' }}>{item.nextAction.label}</p>{item.nextAction.reason && <p className="mt-1 text-xs leading-5" style={{ color: '#6B7A99' }}>{item.nextAction.reason}</p>}<Link to="/practice" className="mt-3 inline-flex text-xs font-bold" style={{ color: '#2456A6' }}>Turn this into practice →</Link></div>}
                    </article>
                  ))}
                  {sending && <div className="flex items-center gap-3 rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: '#E2EAF3', color: '#6B7A99' }}><img src="/datakwest-owl-3d.webp" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />The owl is thinking through your path…</div>}
                </div>
              )}
            </section>

            {error && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert"><span className="text-sm">{error}</span>{lastRequest && <button type="button" onClick={() => submitTutorMessage(lastRequest.message, lastRequest.mode)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold" style={{ color: '#991B1B' }}>Retry</button>}</div>}

            <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border bg-white p-4" style={{ borderColor: '#DCE5F0' }}>
              <label htmlFor="tutor-message" className="sr-only">Ask the Datakwest owl</label>
              <textarea id="tutor-message" value={message} onChange={(event) => setMessage(event.target.value.slice(0, 4000))} rows="4" maxLength="4000" placeholder={`Ask the owl to ${activeMode.prompt.toLowerCase()}…`} className="w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#2456A6]" style={{ borderColor: '#E2E8F0', color: '#0A2342' }} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs" style={{ color: '#6B7A99' }}>{message.length}/4000{message && <span className="ml-2" role="status">· Draft saved on this device</span>}</span><button type="submit" disabled={!message.trim() || sending} className="rounded-xl px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50" style={{ background: '#0A2342', color: 'white' }}>{sending ? 'Thinking…' : 'Ask the owl'}</button></div>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
