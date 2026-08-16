import { useCallback, useEffect, useRef, useState } from 'react'
import { getWhotSnapshot, heartbeatWhotRoom, submitWhotIntent } from '../lib/playground'

const SHAPES = ['circle', 'triangle', 'cross', 'square']


function isLegal(card, discard, currentShape) {
  if (!card || !discard) return false
  return card.shape === 'whot' || card.shape === currentShape || card.value === discard.value
}

export default function PlaygroundWhotOnlineMatch({ roomId }) {
  const [snapshot, setSnapshot] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Connecting to the server-authoritative deck…')
  const intentCount = useRef(0)

  const refresh = useCallback(async (heartbeat = false) => {
    const response = heartbeat ? await heartbeatWhotRoom(roomId) : await getWhotSnapshot(roomId)
    if (response.error) {
      setMessage('The card table connection needs attention. Your hand is unchanged.')
      return
    }
    setSnapshot(response.snapshot)
    setMessage(response.snapshot?.last_event || 'The server is ready for your next action.')
  }, [roomId])

  useEffect(() => {
    if (!roomId) return undefined
    const initialRefresh = window.setTimeout(() => { void refresh(true) }, 0)
    const timer = window.setInterval(() => { void refresh(true) }, 5000)
    return () => { window.clearTimeout(initialRefresh); window.clearInterval(timer) }
  }, [refresh, roomId])

  const you = snapshot?.members?.find((member) => member.is_you)
  const yourHand = you?.hand || []
  const yourTurn = snapshot?.turn_seat === you?.seat_no && snapshot?.status === 'active'
  const awaitingShape = snapshot?.awaiting_shape_seat === you?.seat_no

  const send = async (action) => {
    if (busy) return
    setBusy(true)
    const clientIntentId = `${roomId}-${you?.seat_no || 0}-${intentCount.current++}`
    const { result, error } = await submitWhotIntent(roomId, { ...action, client_intent_id: clientIntentId })
    setBusy(false)
    if (error) {
      setMessage('The server rejected that action. The table has not changed.')
      await refresh(true)
      return
    }
    setSnapshot(result?.snapshot || snapshot)
    setMessage(result?.snapshot?.last_event || 'Action accepted by the server.')
  }

  return <div className="dk-online-whot-panel"><div className="dk-game-toolbar"><span className="dk-live-status"><i />{snapshot?.status === 'finished' ? 'Round complete' : yourTurn || awaitingShape ? 'Your turn' : 'Waiting for the other player'}</span><span className="dk-score-chip">Server-authoritative</span></div><div className="dk-online-whot-seats">{(snapshot?.members || []).map((member) => <div key={member.seat_no} className={`dk-online-whot-seat ${member.is_you ? 'is-you' : ''}`}><span>Seat {member.seat_no}</span><strong>{member.is_you ? 'You' : 'Owl player'}</strong><small>{member.card_count} cards{member.called ? ' · Whot called' : ''}</small><i className={member.status === 'joined' ? 'is-online' : 'is-away'} /></div>)}</div><div className="dk-online-whot-table"><div className="dk-whot-online-opponent"><span className="dk-kicker">Opponent hand</span><strong>{snapshot?.members?.find((member) => !member.is_you)?.card_count || 0} cards</strong><div className="dk-whot-back-row">{Array.from({ length: Math.min(snapshot?.members?.find((member) => !member.is_you)?.card_count || 0, 8) }, (_, index) => <span key={index}>✦</span>)}</div></div><div className="dk-whot-online-discard"><span className="dk-kicker">On the table</span><div className={`dk-whot-card is-${snapshot?.discard?.shape || 'circle'}`}><strong>{snapshot?.discard?.shape === 'whot' ? 'W' : snapshot?.discard?.value || '—'}</strong><small>{snapshot?.current_shape || snapshot?.discard?.shape || 'shape'}</small></div><p aria-live="polite">{message}</p></div></div><div className="dk-online-whot-hand"><div className="dk-game-toolbar"><span className="dk-kicker">Your hand · {yourHand.length}</span><span className="dk-score-chip">Deck {snapshot?.deck_count ?? '—'}</span></div><div className="dk-whot-cards">{yourHand.map((card) => <button type="button" key={card.id} className={`dk-whot-card is-${card.shape} ${isLegal(card, snapshot?.discard, snapshot?.current_shape) ? 'is-legal' : ''}`} onClick={() => send({ type: 'play', card_id: card.id })} disabled={!yourTurn || !isLegal(card, snapshot?.discard, snapshot?.current_shape) || busy}><strong>{card.shape === 'whot' ? 'W' : card.value}</strong><small>{card.shape}</small></button>)}</div></div>{awaitingShape && <div className="dk-whot-shape-picker"><span>Choose the next shape</span>{SHAPES.map((shape) => <button type="button" key={shape} className="dk-secondary-button" onClick={() => send({ type: 'choose_shape', shape })} disabled={busy}>{shape}</button>)}</div>}<div className="dk-game-footer"><button type="button" className="dk-online-primary" onClick={() => send({ type: 'draw' })} disabled={!yourTurn || busy}>Draw card</button><button type="button" className="dk-secondary-button" onClick={() => send({ type: 'call_whot' })} disabled={!yourTurn || busy || yourHand.length !== 1}>Call Whot</button><p>Only your hand is sent to your device. Opponent cards remain hidden on the server.</p></div></div>
}
