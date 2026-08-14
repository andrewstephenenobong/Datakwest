import { useEffect, useMemo, useState } from 'react'
import { getChallengeCenter } from '../lib/challenges'
import {
  getLiveChallengeLeaderboard,
  getLiveChallengeWorkspace,
  reportLiveChallengeScore,
  startLiveChallengeRound,
  submitLiveChallengeRound,
} from '../lib/liveChallenges'

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not scheduled'
const errorMessage = (error) => error?.message || 'Something went wrong. Please try again.'

export default function LiveChallenges() {
  const [challenges, setChallenges] = useState([])
  const [challengeId, setChallengeId] = useState('')
  const [workspace, setWorkspace] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [session, setSession] = useState(null)
  const [response, setResponse] = useState('')
  const [submission, setSubmission] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    async function loadChallenges() {
      const { challenges: available, error: loadError } = await getChallengeCenter(20)
      if (!active) return
      if (loadError) setError(errorMessage(loadError))
      const next = available || []
      setChallenges(next)
      const firstActive = next.find((item) => item.status === 'active') || next[0]
      if (firstActive) setChallengeId(firstActive.id)
      setLoading(false)
    }
    loadChallenges()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    async function loadWorkspace() {
      if (!challengeId) return
      setWorkspaceLoading(true)
      setError('')
      const [{ workspace: nextWorkspace, error: workspaceError }, { leaderboard: nextLeaderboard, error: leaderboardError }] = await Promise.all([
        getLiveChallengeWorkspace(challengeId),
        getLiveChallengeLeaderboard(challengeId, 20),
      ])
      if (!active) return
      if (workspaceError) setError(errorMessage(workspaceError))
      else setWorkspace(nextWorkspace)
      if (!leaderboardError) setLeaderboard(nextLeaderboard?.leaderboard || [])
      setWorkspaceLoading(false)
    }
    loadWorkspace()
    return () => { active = false }
  }, [challengeId])

  const selectedChallenge = useMemo(() => challenges.find((item) => item.id === challengeId), [challenges, challengeId])
  const rounds = workspace?.rounds || []
  const activeRound = rounds.find((round) => round.status === 'live' && !round.submission_status)
  const selectedRound = session?.round_id ? rounds.find((round) => round.id === session.round_id) : activeRound

  async function refreshWorkspace() {
    if (!challengeId) return
    const [{ workspace: nextWorkspace }, { leaderboard: nextLeaderboard }] = await Promise.all([
      getLiveChallengeWorkspace(challengeId),
      getLiveChallengeLeaderboard(challengeId, 20),
    ])
    setWorkspace(nextWorkspace)
    setLeaderboard(nextLeaderboard?.leaderboard || [])
  }

  async function handleStart(roundId) {
    setActionLoading(true)
    setError('')
    setNotice('')
    const { session: nextSession, error: startError } = await startLiveChallengeRound(roundId)
    if (startError) setError(errorMessage(startError))
    else {
      setSession(nextSession)
      setResponse('')
      setSubmission(null)
      setNotice('Round started. Submit before the server deadline.')
    }
    setActionLoading(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!session?.session_id) return
    setActionLoading(true)
    setError('')
    setNotice('')
    const parsedResponse = (() => {
      try {
        return JSON.parse(response)
      } catch {
        return response
      }
    })()
    const { result, error: submitError } = await submitLiveChallengeRound(session.session_id, parsedResponse)
    if (submitError) setError(errorMessage(submitError))
    else {
      setSubmission(result)
      setSession(null)
      setNotice('Round submitted. Your server-derived score is shown below.')
      await refreshWorkspace()
    }
    setActionLoading(false)
  }

  async function handleReport() {
    if (!submission?.submission_id || disputeReason.trim().length < 10) return
    setActionLoading(true)
    setError('')
    const { error: reportError } = await reportLiveChallengeScore(submission.submission_id, disputeReason)
    if (reportError) setError(errorMessage(reportError))
    else {
      setNotice('Your score dispute was submitted for moderation.')
      setDisputeReason('')
    }
    setActionLoading(false)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D97832' }}>Applied practice</p>
            <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Live Challenges</h1>
            <p className="mt-2" style={{ color: '#6B7A99' }}>Complete timed rounds, see server-derived standings, and dispute a score when something needs review.</p>
          </div>
          <a href="/challenges" className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: '#0A2342', color: 'white' }}>Challenge Center</a>
        </div>

        {error && <div className="mt-6 rounded-xl p-4 text-sm" style={{ background: '#FFF1F0', color: '#B42318' }} role="alert">{error}</div>}
        {notice && <div className="mt-6 rounded-xl p-4 text-sm" style={{ background: '#EAF7F0', color: '#2E7D32' }} role="status">{notice}</div>}

        <section className="mt-6 bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
          <label className="block text-sm font-semibold" style={{ color: '#0A2342' }} htmlFor="challenge-select">Live challenge</label>
          <select id="challenge-select" value={challengeId} onChange={(event) => { setChallengeId(event.target.value); setWorkspace(null); setSession(null); setSubmission(null) }} className="mt-2 w-full rounded-xl border px-3 py-3" style={{ borderColor: '#C7D1DE' }} disabled={loading}>
            <option value="">{loading ? 'Loading challenges…' : 'Select a challenge'}</option>
            {challenges.map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title} · {challenge.status}</option>)}
          </select>
          {selectedChallenge && <p className="text-sm mt-3" style={{ color: '#6B7A99' }}>{selectedChallenge.description || 'Participate in a focused live learning challenge.'} Ends {formatDate(selectedChallenge.ends_at)}.</p>}
        </section>

        {workspaceLoading ? <div className="mt-6 bg-white rounded-2xl p-8 text-center" style={{ color: '#6B7A99' }}>Loading your live workspace…</div> : workspace && (
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-6 mt-6">
            <section className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D97832' }}>Round workspace</p><h2 className="text-xl font-bold mt-1" style={{ color: '#0A2342' }}>{workspace.challenge?.title}</h2></div>
                <span className="text-sm font-semibold" style={{ color: '#6B7A99' }}>{rounds.length} rounds</span>
              </div>
              <div className="mt-5 space-y-3">
                {rounds.length === 0 ? <p className="text-sm" style={{ color: '#6B7A99' }}>No rounds have been published for this challenge yet.</p> : rounds.map((round) => (
                  <div key={round.id} className="rounded-xl p-4" style={{ background: '#F5F7FA' }}>
                    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold" style={{ color: '#6B7A99' }}>ROUND {round.position}</p><h3 className="font-bold mt-1" style={{ color: '#0A2342' }}>{round.title}</h3></div><span className="text-xs font-bold uppercase" style={{ color: round.status === 'live' ? '#2E7D32' : '#8A6500' }}>{round.status}</span></div>
                    <p className="text-xs mt-2" style={{ color: '#6B7A99' }}>{formatDate(round.starts_at)} — {formatDate(round.ends_at)}</p>
                    {round.submission_status && <p className="text-sm font-semibold mt-3" style={{ color: '#2E7D32' }}>Submitted{round.score !== null ? ` · ${round.score}/100` : ''}</p>}
                    {round.status === 'live' && !round.submission_status && !session && <button type="button" onClick={() => handleStart(round.id)} disabled={actionLoading} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: '#0A2342', color: 'white' }}>{actionLoading ? 'Starting…' : 'Start round'}</button>}
                  </div>
                ))}
              </div>
              {session && selectedRound?.prompt && <form onSubmit={handleSubmit} className="mt-6 border-t pt-5" style={{ borderColor: '#C7D1DE' }}><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D97832' }}>Active response</p><h3 className="font-bold text-lg mt-2" style={{ color: '#0A2342' }}>{selectedRound.title}</h3><pre className="text-sm mt-3 whitespace-pre-wrap" style={{ color: '#53657D' }}>{JSON.stringify(selectedRound.prompt, null, 2)}</pre><textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Submit JSON or plain text response" required rows={5} className="mt-4 w-full rounded-xl border p-3 text-sm" style={{ borderColor: '#C7D1DE' }} /><button type="submit" disabled={actionLoading} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: '#D97832', color: 'white' }}>{actionLoading ? 'Submitting…' : 'Submit round'}</button></form>}
              {submission && <div className="mt-6 border-t pt-5" style={{ borderColor: '#C7D1DE' }}><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D97832' }}>Server result</p><p className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>{submission.score}/100</p><p className="text-sm mt-1" style={{ color: '#6B7A99' }}>{submission.feedback?.correct ? 'Correct response' : 'Response recorded for review'}</p><textarea value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} placeholder="Optional score dispute (minimum 10 characters)" rows={3} className="mt-4 w-full rounded-xl border p-3 text-sm" style={{ borderColor: '#C7D1DE' }} /><button type="button" onClick={handleReport} disabled={actionLoading || disputeReason.trim().length < 10} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: '#F5F7FA', color: '#0A2342' }}>Report score</button></div>}
            </section>
            <aside className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}><p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D97832' }}>Leaderboard</p><h2 className="text-xl font-bold mt-1" style={{ color: '#0A2342' }}>Current standings</h2><div className="mt-4 space-y-2">{leaderboard.length === 0 ? <p className="text-sm" style={{ color: '#6B7A99' }}>No scored rounds yet.</p> : leaderboard.map((entry) => <div key={`${entry.rank}-${entry.score}`} className="flex items-center justify-between rounded-xl p-3" style={{ background: entry.is_current_user ? '#FFF1E8' : '#F5F7FA' }}><span className="text-sm font-bold" style={{ color: '#0A2342' }}>#{entry.rank}{entry.is_current_user ? ' · You' : ''}</span><span className="text-sm" style={{ color: '#53657D' }}>{entry.score} pts · {entry.rounds_completed} rounds</span></div>)}</div></aside>
          </div>
        )}
      </main>
    </div>
  )
}
