import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getSkillBattleLeaderboard, getSkillBattleLobby, startSkillBattle, submitBattleAnswer } from '../lib/skillBattles'

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Open-ended'
}

export default function SkillBattles() {
  const { user } = useAuth()
  const [battles, setBattles] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [session, setSession] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      const { lobby, error: lobbyError } = await getSkillBattleLobby()
      if (cancelled) return
      const nextBattles = lobby.battles || []
      setBattles(nextBattles)
      setSelectedId((current) => current || nextBattles[0]?.id || null)
      if (lobbyError) setError(lobbyError.message)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  async function loadLeaderboard(challengeId) {
    const { leaderboard: result, error: leaderboardError } = await getSkillBattleLeaderboard(challengeId)
    setLeaderboard(result.leaderboard || [])
    if (leaderboardError) setError(leaderboardError.message)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!selectedId) return
      const { leaderboard: result, error: leaderboardError } = await getSkillBattleLeaderboard(selectedId)
      if (cancelled) return
      setLeaderboard(result.leaderboard || [])
      if (leaderboardError) setError(leaderboardError.message)
    }
    load()
    return () => { cancelled = true }
  }, [selectedId])

  async function beginBattle() {
    if (!selectedId) return
    setBusy(true)
    setError('')
    setNotice('')
    const { session: nextSession, error: startError } = await startSkillBattle(selectedId)
    if (startError) setError(startError.message)
    else {
      setSession(nextSession)
      setAnswer('')
      setNotice('Battle session started. Your score will be calculated on the server.')
    }
    setBusy(false)
  }

  async function submitAnswer() {
    const item = session?.items?.[0]
    if (!item || !answer.trim()) return
    setBusy(true)
    setError('')
    const { result, error: answerError } = await submitBattleAnswer(session.session_id, item.id, answer.trim())
    if (answerError) setError(answerError.message)
    else {
      setSession((current) => ({ ...current, items: current.items.slice(1), last_result: result }))
      setAnswer('')
      setNotice(`Server score: ${result.score}. ${result.completed_items}/${result.total_items} items completed.`)
      await loadLeaderboard(selectedId)
    }
    setBusy(false)
  }

  const selected = battles.find((battle) => battle.id === selectedId)
  const currentItem = session?.items?.[0]

  return <div className="min-h-screen" style={{ background: '#F5F7FA' }}><Navbar /><main className="max-w-5xl mx-auto px-6 py-10"><Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link><div className="mt-6 mb-8"><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C05621' }}>Phase 3 · Applied competition</p><h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Skill Battles</h1><p className="mt-2" style={{ color: '#6B7A99' }}>Compete in bounded practice rounds. Scores, timing, and rankings are calculated by the server.</p></div>{error && <div className="rounded-xl p-4 mb-4" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}{notice && <div className="rounded-xl p-4 mb-4" style={{ background: '#EAF7F0', color: '#2E7D32' }} role="status">{notice}</div>}{loading ? <div className="bg-white rounded-2xl p-8 text-center">Loading battles…</div> : battles.length === 0 ? <div className="bg-white rounded-2xl p-8 text-center"><h2 className="font-bold" style={{ color: '#0A2342' }}>No skill battles are open</h2><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Published battle rounds will appear here when they are available.</p></div> : <div className="grid lg:grid-cols-[300px_1fr] gap-6"><aside className="bg-white rounded-2xl p-4 h-fit" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><h2 className="font-bold px-2" style={{ color: '#0A2342' }}>Battle lobby</h2><div className="grid gap-2 mt-3">{battles.map((battle) => <button key={battle.id} type="button" onClick={() => { setSelectedId(battle.id); setSession(null) }} className="text-left rounded-xl p-3" style={{ background: selectedId === battle.id ? '#FFF1E8' : '#F5F7FA' }}><p className="font-semibold text-sm" style={{ color: '#0A2342' }}>{battle.title}</p><p className="text-xs mt-1" style={{ color: '#6B7A99' }}>{battle.participant_count || 0} participants · {battle.participation_status || 'Not enrolled'}</p></button>)}</div></aside><section><div className="bg-white rounded-2xl p-6 mb-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C05621' }}>Battle {selected?.status}</p><h2 className="text-xl font-bold mt-2" style={{ color: '#0A2342' }}>{selected?.title}</h2><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>{selected?.description}</p></div><span className="text-sm font-semibold" style={{ color: '#6B7A99' }}>{selected?.participant_count || 0} players</span></div><div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm"><div className="rounded-xl p-3" style={{ background: '#F5F7FA' }}><p className="text-xs" style={{ color: '#6B7A99' }}>Starts</p><p className="font-semibold mt-1" style={{ color: '#0A2342' }}>{formatDate(selected?.starts_at)}</p></div><div className="rounded-xl p-3" style={{ background: '#F5F7FA' }}><p className="text-xs" style={{ color: '#6B7A99' }}>Ends</p><p className="font-semibold mt-1" style={{ color: '#0A2342' }}>{formatDate(selected?.ends_at)}</p></div></div>{selected?.participation_status === 'enrolled' && !session && <button type="button" onClick={beginBattle} disabled={busy} className="mt-5 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: '#0A2342', color: 'white' }}>{busy ? 'Starting…' : 'Start battle'}</button>}{selected?.participation_status !== 'enrolled' && !session && <p className="text-sm mt-5" style={{ color: '#8A6500' }}>Join this battle from the Challenges page before starting a round.</p>}</div>{session && currentItem && <div className="bg-white rounded-2xl p-6 mb-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6D4CB3' }}>Battle question</p><p className="text-lg font-semibold mt-3" style={{ color: '#0A2342' }}>{currentItem.prompt?.question || currentItem.prompt?.text || 'Complete the practice item.'}</p><input value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitAnswer() }} placeholder="Your answer" className="w-full rounded-xl border p-3 mt-5" /><button type="button" onClick={submitAnswer} disabled={busy || !answer.trim()} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: '#0A2342', color: 'white' }}>{busy ? 'Scoring…' : 'Submit answer'}</button></div>}{session && !currentItem && <div className="bg-white rounded-2xl p-6 mb-5"><h2 className="font-bold" style={{ color: '#0A2342' }}>Round complete</h2><p className="text-sm mt-2" style={{ color: '#6B7A99' }}>Your final answers were scored by the Practice Engine. Check the leaderboard below.</p></div>}<div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><h2 className="text-lg font-bold" style={{ color: '#0A2342' }}>Leaderboard</h2>{leaderboard.length === 0 ? <p className="text-sm mt-3" style={{ color: '#6B7A99' }}>No scored rounds yet.</p> : <div className="grid gap-2 mt-4">{leaderboard.map((entry) => <div key={`${entry.rank}-${entry.is_current_user}`} className="flex items-center justify-between rounded-xl p-3" style={{ background: entry.is_current_user ? '#FFF1E8' : '#F5F7FA' }}><div><span className="font-bold mr-3" style={{ color: '#C05621' }}>#{entry.rank}</span><span className="text-sm" style={{ color: '#0A2342' }}>{entry.is_current_user ? 'You' : 'Competitor'}</span></div><div className="text-sm font-bold" style={{ color: '#0A2342' }}>{entry.score} pts · {entry.correct}/{entry.answered} correct</div></div>)}</div>}</div></section></div>}</main></div>
}
