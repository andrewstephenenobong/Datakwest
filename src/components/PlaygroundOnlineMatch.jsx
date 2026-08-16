import { useCallback, useEffect, useState } from 'react'
import { getPlaygroundRoomSnapshot, submitPlaygroundIntent } from '../lib/playground'

const memorySymbols = { owl: '🦉', star: '★', moon: '☾', bolt: '✦' }

export default function PlaygroundOnlineMatch({ roomId, gameKey }) {
  const [snapshot, setSnapshot] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('Connecting to the authoritative room…')

  const refresh = useCallback(async () => {
    const { snapshot: nextSnapshot, error } = await getPlaygroundRoomSnapshot(roomId)
    if (error) { setNotice(error.message || 'The room could not be refreshed.'); return }
    setSnapshot(nextSnapshot)
    setNotice(nextSnapshot?.status === 'finished' ? 'Round complete. Results came from the server.' : 'Live room synchronized.')
  }, [roomId])

  useEffect(() => {
    const initial = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, 2000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [refresh])

  const submit = async (action) => {
    if (busy || snapshot?.status !== 'active') return
    setBusy(true); setNotice('The Owl is checking that move…')
    const { result, error } = await submitPlaygroundIntent(roomId, action)
    setBusy(false)
    if (error) { setNotice(error.message || 'That move was not accepted by the server.'); return }
    if (result?.snapshot) setSnapshot(result.snapshot)
    setNotice(result?.status === 'finished' ? 'Round complete. The server has settled the result.' : 'Move accepted and synchronized.')
  }

  if (!snapshot) return <div className="dk-online-match dk-online-match-loading"><span className="dk-live-dot" />{notice}</div>
  const state = snapshot.state || {}
  const finished = snapshot.status === 'finished'

  return <section className="dk-online-match" aria-labelledby="online-match-title">
    <div className="dk-online-match-head"><div><span className="dk-kicker">Live room</span><h3 id="online-match-title">{gameKey === 'tic_tac_toe' ? 'Tic-tac-toe' : 'Memory Cards'} online</h3></div><span className={`dk-room-status ${finished ? 'is-finished' : 'is-live'}`}><span className="dk-live-dot" />{finished ? 'Finished' : 'Live'}</span></div>
    {gameKey === 'tic_tac_toe' ? <div className="dk-online-tic-grid">{(state.board || []).map((value, index) => <button key={index} type="button" disabled={Boolean(value) || !state.your_turn || finished || busy} onClick={() => submit({ type: 'place', index })} aria-label={`Online cell ${index + 1}${value ? `, ${value}` : ''}`}>{value === 'X' ? '×' : value === 'O' ? '○' : ''}</button>)}</div> : <div className="dk-online-memory-grid">{(state.deck || []).map((value, index) => <button key={index} type="button" disabled={value !== null || !state.your_turn || finished || busy} onClick={() => submit({ type: 'flip', index })} aria-label={value ? `${value} card` : 'Hidden online card'}>{value ? memorySymbols[value] : '?'}</button>)}</div>}
    <div className="dk-online-match-footer"><span>{finished ? 'The Owl has recorded the authoritative result.' : state.your_turn ? 'Your turn' : 'Waiting for the other player'}</span><button type="button" className="dk-secondary-button" onClick={refresh} disabled={busy}>Refresh room</button></div>
    <p className="dk-online-status" aria-live="polite">{notice}</p>
  </section>
}
