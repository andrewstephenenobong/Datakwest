import { useCallback, useEffect, useState } from 'react'
import { getPlaygroundSpectatorSnapshot, joinPlaygroundSpectator, leavePlaygroundSpectator } from '../lib/playground'

export default function PlaygroundSpectatorPanel() {
  const [roomId, setRoomId] = useState('')
  const [watching, setWatching] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [message, setMessage] = useState('Watch only when the room host has enabled spectators.')

  const refresh = useCallback(async () => {
    if (!roomId) return
    const { snapshot: nextSnapshot, error } = await getPlaygroundSpectatorSnapshot(roomId)
    if (error) { setMessage(error.message || 'The spectator view is not available.'); return }
    setSnapshot(nextSnapshot); setMessage('Live spectator view synchronized.')
  }, [roomId])

  useEffect(() => {
    if (!watching) return undefined
    const initial = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, 3000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [refresh, watching])

  const join = async () => {
    const normalized = roomId.trim()
    if (!normalized) return
    const { result, error } = await joinPlaygroundSpectator(normalized)
    if (error) { setMessage(error.message || 'This room cannot be watched.'); return }
    setRoomId(result.room_id); setWatching(true); setMessage('You are watching anonymously. No player identity is shown.')
  }

  const leave = async () => {
    if (roomId) await leavePlaygroundSpectator(roomId)
    setWatching(false); setSnapshot(null); setMessage('You left spectator mode.')
  }

  const state = snapshot?.state || {}
  const gameKey = snapshot?.game_key
  return <section className="dk-spectator-panel" aria-labelledby="spectator-title"><div className="dk-spectator-head"><div><span className="dk-kicker">Watch safely</span><h2 id="spectator-title">Owl spectator mode</h2><p>Watch an ongoing match without seeing learner names, profiles, invites, or hidden card values.</p></div><span className="dk-safe-pill">Read only</span></div><div className="dk-spectator-entry"><input value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="Paste an opaque room ID" aria-label="Opaque spectator room ID" /><button type="button" className="dk-online-primary" onClick={watching ? leave : join}>{watching ? 'Leave view' : 'Watch match'}</button></div>{snapshot && <><div className="dk-spectator-meta"><span>{snapshot.player_count} players</span><span>{snapshot.spectator_count} watching</span><span>{snapshot.status === 'finished' ? 'Finished' : 'Live'}</span></div>{(gameKey === 'tic_tac_toe' || gameKey === 'connect_four') && <div className={`dk-spectator-board ${gameKey === 'connect_four' ? 'is-connect' : 'is-tic'}`}>{(state.board || []).map((value, index) => <span key={index} className={value ? `is-${value.toLowerCase()}` : ''}>{value || ''}</span>)}</div>}{gameKey === 'memory_cards' && <div className="dk-spectator-memory">{(state.deck || []).map((value, index) => <span key={index}>{value ? '●' : '?'}</span>)}</div>}</>}<p className="dk-online-status" aria-live="polite">{message}</p></section>
}
