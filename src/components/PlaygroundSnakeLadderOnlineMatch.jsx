import { useEffect, useMemo, useState } from 'react'
import { getSnakeLadderSnapshot, heartbeatSnakeLadderRoom, submitSnakeLadderIntent } from '../lib/playground'

const BOARD_LINKS = { 4: 14, 9: 31, 17: 7, 20: 38, 28: 84, 40: 59, 51: 67, 54: 34, 62: 19, 63: 81, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78 }

export default function PlaygroundSnakeLadderOnlineMatch({ roomId }) {
  const [snapshot, setSnapshot] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Connecting to the server-authoritative board…')
  const [intentId, setIntentId] = useState(0)

  const refresh = async (heartbeat = false) => {
    const response = heartbeat ? await heartbeatSnakeLadderRoom(roomId) : await getSnakeLadderSnapshot(roomId)
    if (response.error) {
      setMessage('The board connection needs attention. Your move was not accepted.')
      return
    }
    setSnapshot(response.snapshot)
    setMessage(response.snapshot?.last_event || 'The server is ready for the next roll.')
  }

  useEffect(() => {
    if (!roomId) return undefined
    refresh(true)
    const timer = window.setInterval(() => refresh(true), 5000)
    return () => window.clearInterval(timer)
  }, [roomId])

  const you = snapshot?.members?.find((member) => member.is_you)
  const yourSeat = you?.seat_no
  const yourTurn = snapshot?.turn_seat === yourSeat && snapshot?.status === 'active'
  const positions = useMemo(() => Object.fromEntries((snapshot?.members || []).map((member) => [member.seat_no, member.position])), [snapshot])

  const roll = async () => {
    if (!yourTurn || busy) return
    setBusy(true)
    const clientIntentId = `${roomId}-${yourSeat}-${Date.now()}-${intentId}`
    setIntentId((value) => value + 1)
    const { result, error } = await submitSnakeLadderIntent(roomId, { type: 'roll', client_intent_id: clientIntentId })
    setBusy(false)
    if (error) {
      setMessage('The server rejected that roll. The board has not changed.')
      await refresh(true)
      return
    }
    setSnapshot(result?.snapshot || snapshot)
    setMessage(result?.snapshot?.last_event || 'Roll accepted by the server.')
  }

  return <div className="dk-online-snake-panel"><div className="dk-game-toolbar"><span className="dk-live-status"><i />{snapshot?.status === 'finished' ? 'Round complete' : yourTurn ? 'Your turn' : 'Waiting for the other player'}</span><span className="dk-score-chip">Server-authoritative</span></div><div className="dk-online-snake-seats">{(snapshot?.members || []).map((member) => <div key={member.seat_no} className={`dk-online-snake-seat ${member.is_you ? 'is-you' : ''}`}><span>Seat {member.seat_no}</span><strong>{member.is_you ? 'You' : 'Owl player'}</strong><small>Square {member.position}</small><i className={member.status === 'joined' ? 'is-online' : 'is-away'} /></div>)}</div><div className="dk-online-snake-board" aria-label="Server-authoritative Snake and Ladder board">{Array.from({ length: 100 }, (_, index) => { const number = 100 - index; const token = (snapshot?.members || []).find((member) => member.position === number); return <div key={number} className={`dk-online-snake-cell ${number % 2 ? 'is-odd' : 'is-even'} ${BOARD_LINKS[number] && BOARD_LINKS[number] > number ? 'is-ladder' : ''} ${BOARD_LINKS[number] && BOARD_LINKS[number] < number ? 'is-snake' : ''}`}><span>{number}</span>{token && <b className={`dk-online-snake-token seat-${token.seat_no}`}>{token.is_you ? 'Y' : token.seat_no}</b>}</div> })}</div><div className="dk-online-snake-controls"><div className="dk-online-snake-die" aria-live="polite">{snapshot?.last_roll || '—'}</div><div><strong>{message}</strong><p>Moves are resolved on the server. The browser cannot choose the dice or position.</p></div><button type="button" className="dk-online-primary" onClick={roll} disabled={!yourTurn || busy}>{busy ? 'Sending…' : 'Roll server die'}</button></div></div>
}
