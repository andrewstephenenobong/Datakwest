import { useEffect, useState } from 'react'
import { createPlaygroundRoom, joinPlaygroundRoom, queuePlaygroundMatch, leavePlaygroundMatchmaking, heartbeatPlaygroundRoom, setPlaygroundSpectatorMode } from '../lib/playground'
import PlaygroundOnlineMatch from './PlaygroundOnlineMatch'
import PlaygroundSpectatorPanel from './PlaygroundSpectatorPanel'

export default function PlaygroundOnlinePanel({ gameKey = 'tic_tac_toe' }) {
  const [inviteCode, setInviteCode] = useState('')
  const [room, setRoom] = useState(null)
  const [queued, setQueued] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Online play is coming through safe rooms and age-aware matchmaking.')
  const [spectatorsEnabled, setSpectatorsEnabled] = useState(false)

  useEffect(() => {
    if (!queued || busy) return undefined
    const timer = window.setInterval(async () => {
      const { queue, error } = await queuePlaygroundMatch(gameKey)
      if (error) { setMessage(error.message || 'Matchmaking is temporarily unavailable.'); return }
      if (queue?.matched && queue.room_id) {
        setRoom(queue)
        setQueued(false)
        setMessage('Match found. The server-authoritative room is ready.')
      }
    }, 4000)
    return () => window.clearInterval(timer)
  }, [busy, gameKey, queued])

  useEffect(() => {
    if (!room?.room_id) return undefined
    const timer = window.setInterval(async () => {
      const { error } = await heartbeatPlaygroundRoom(room.room_id)
      if (error) setMessage(error.message || 'The room connection needs attention.')
    }, 30000)
    return () => window.clearInterval(timer)
  }, [room?.room_id])

  const run = async (operation, successMessage) => {
    setBusy(true); setMessage('Checking the safe-play service…')
    const { room: nextRoom, queue, error } = await operation()
    setBusy(false)
    if (error) { setMessage(error.message || 'The online room service is not available yet. You can keep playing locally.'); return }
    if (nextRoom) setRoom(nextRoom)
    if (queue?.room_id) setRoom(queue)
    if (queue) setQueued(Boolean(queue.queued))
    setMessage(queue?.matched ? 'Match found. The server-authoritative room is ready.' : successMessage)
  }

  return <section className="dk-online-panel" aria-labelledby="online-play-title">
    <div><span className="dk-kicker">Play together</span><h2 id="online-play-title">Private rooms and safe matchmaking</h2><p>Online play uses preset reactions only. Your learning progress and mastery stay separate from Playground games.</p></div>
    <div className="dk-online-actions">
      <button type="button" className="dk-online-primary" disabled={busy} onClick={() => run(() => createPlaygroundRoom(gameKey, 'private', 2), 'Private room created. Share the invite code with your friend.')}>Create private room</button>
      <button type="button" className="dk-online-secondary" disabled={busy || queued} onClick={() => run(() => queuePlaygroundMatch(gameKey), 'You are safely queued. We will only match within the permitted age scope.')}> {queued ? 'Searching…' : 'Find a safe match'} </button>
      {queued && <button type="button" className="dk-online-secondary" disabled={busy} onClick={() => run(() => leavePlaygroundMatchmaking(), 'Matchmaking cancelled.')}>Cancel search</button>}
    </div>
    <div className="dk-online-join"><label htmlFor="playground-invite">Have an invite code?</label><div><input id="playground-invite" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase().slice(0, 10))} placeholder="Enter code" inputMode="text" autoComplete="off" /><button type="button" className="dk-online-secondary" disabled={busy || inviteCode.length < 4} onClick={() => run(() => joinPlaygroundRoom(inviteCode), 'You joined the room. The other player can start the game.')}>Join room</button></div></div>
    <p className="dk-online-status" aria-live="polite">{message}</p>
    {room?.invite_code && <div className="dk-invite-code"><span>Invite code</span><strong>{room.invite_code}</strong></div>}
    {room?.room_id && !room?.invite_code && <div className="dk-invite-code"><span>Matched room</span><strong>{String(room.room_id).slice(0, 8)}</strong></div>}
    {room?.room_id && room?.status === 'active' && <><div className="dk-spectator-host-control"><span>Let age-scoped learners watch this match?</span><button type="button" className="dk-online-secondary" disabled={busy} onClick={async () => { const { error } = await setPlaygroundSpectatorMode(room.room_id, !spectatorsEnabled); if (error) setMessage(error.message || 'Spectator mode could not be changed.'); else { setSpectatorsEnabled(!spectatorsEnabled); setMessage(!spectatorsEnabled ? 'Spectator mode is open with privacy safeguards.' : 'Spectator mode is closed.'); } }}>{spectatorsEnabled ? 'Close spectators' : 'Enable spectators'}</button></div><PlaygroundOnlineMatch roomId={room.room_id} gameKey={gameKey} /></>} 
    <PlaygroundSpectatorPanel />
  </section>
}
