import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { sendTutorMessage } from '../lib/tutor'

export default function Tutor() {
  const [message, setMessage] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage || sending) return

    setSending(true)
    setError('')
    setMessages(current => [...current, { role: 'user', text: trimmedMessage }])
    setMessage('')

    const { response, error: requestError } = await sendTutorMessage({
      message: trimmedMessage,
      conversationId,
    })

    if (requestError || response?.error) {
      setError(requestError?.message || 'The Tutor is unavailable right now. Please try again.')
    } else if (response?.reply) {
      setConversationId(response.conversationId || conversationId)
      setMessages(current => [...current, { role: 'assistant', text: response.reply }])
    }
    setSending(false)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Tutor AI</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Ask for help, not shortcuts</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>The Tutor explains concepts, asks useful questions, and helps you build independent confidence.</p>
        </div>

        <section className="bg-white rounded-2xl p-6 mb-6 min-h-80" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }} aria-live="polite">
          {messages.length === 0 ? (
            <div className="text-center py-14">
              <p className="font-bold" style={{ color: '#0A2342' }}>What are you learning today?</p>
              <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Try: “Explain SQL joins with a simple example.”</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={`rounded-2xl p-4 ${item.role === 'user' ? 'ml-8' : 'mr-8'}`} style={{ background: item.role === 'user' ? '#E8F0FE' : '#F5F7FA', color: '#0A2342' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#6B7A99' }}>{item.role === 'user' ? 'You' : 'Tutor'}</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.text}</p>
                </div>
              ))}
              {sending && <p className="text-sm" style={{ color: '#6B7A99' }}>Tutor is thinking…</p>}
            </div>
          )}
        </section>

        {error && <div className="rounded-xl p-4 mb-4" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <label htmlFor="tutor-message" className="sr-only">Ask the Tutor</label>
          <textarea id="tutor-message" value={message} onChange={event => setMessage(event.target.value.slice(0, 4000))} rows="4" maxLength="4000" placeholder="Ask a learning question..." className="w-full rounded-xl border px-4 py-3 resize-y" style={{ borderColor: '#E2E8F0' }} />
          <div className="flex items-center justify-between gap-4 mt-3">
            <span className="text-xs" style={{ color: '#6B7A99' }}>{message.length}/4000</span>
            <button type="submit" disabled={!message.trim() || sending} className="px-5 py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: '#0A2342', color: 'white' }}>{sending ? 'Sending…' : 'Ask Tutor'}</button>
          </div>
        </form>
      </main>
    </div>
  )
}
