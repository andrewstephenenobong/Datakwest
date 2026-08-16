import { useEffect, useState } from 'react'
import { getPlaygroundRankings } from '../lib/playground'

export default function PlaygroundRankings({ gameKey }) {
  const [data, setData] = useState(null)
  const [message, setMessage] = useState('Rankings update after settled online matches.')

  useEffect(() => {
    let active = true
    getPlaygroundRankings(gameKey, 10).then(({ rankings, error }) => {
      if (!active) return
      if (error) { setMessage('Rankings are available after signing in and completing a settled match.'); return }
      setData(rankings); setMessage('Anonymous Owl rankings for this game.')
    })
    return () => { active = false }
  }, [gameKey])

  return <section className="dk-rankings-panel" aria-labelledby="playground-rankings-title"><div className="dk-section-heading"><div><span className="dk-kicker">Competitive, not personal</span><h2 id="playground-rankings-title">Owl rankings</h2></div><span className="dk-safe-pill">ELO rating</span></div>{data?.rankings?.length ? <div className="dk-ranking-list">{data.rankings.map((item) => <div className={`dk-ranking-row ${item.is_you ? 'is-you' : ''}`} key={`${item.rank}-${item.player_code}`}><strong>#{item.rank}</strong><span>{item.player_code}{item.is_you ? ' · You' : ''}</span><b>{item.rating}</b><small>{item.wins}W · {item.draws}D · {item.losses}L</small></div>)}</div> : <p className="dk-online-status">{message}</p>}</section>
}
