import { Link, useNavigate, useParams } from 'react-router-dom'
import LearnerNavigation from '../components/LearnerNavigation'
import PlaygroundOnlinePanel from '../components/PlaygroundOnlinePanel'
import PlaygroundRankings from '../components/PlaygroundRankings'
import { GAME_DEFINITIONS, GameComponent, getGameDefinition, usePlaygroundReaction } from '../components/playground/GameComponents'

export default function PlaygroundGame() {
  const { game: routeGame } = useParams()
  const navigate = useNavigate()
  const game = GAME_DEFINITIONS.find((item) => item.route === routeGame) || GAME_DEFINITIONS[0]
  const { reaction, react } = usePlaygroundReaction()
  const goToGame = (next) => navigate(`/playground/${next.route}`)
  return <div className="dk-playground-page"><LearnerNavigation /><main className="mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-12">
    <div className="dk-game-breadcrumb"><Link to="/playground">Playground</Link><span aria-hidden="true">/</span><strong>{game.title}</strong></div>
    <section className="dk-game-hero"><div><span className="dk-kicker">{game.eyebrow}</span><h1>{game.title}</h1><p>{game.description} Choose your pace, keep it friendly, and let the Owl call the next round.</p></div><div className="dk-owl-speech dk-owl-speech-game" aria-live="polite"><img src="/playground-owl-mascot-clean.png" alt="DataKwest Owl" /><span>{reaction}</span></div></section>
    <nav className="dk-game-tabs" aria-label="Playground games">{GAME_DEFINITIONS.map((item) => <button type="button" key={item.id} className={item.id === game.id ? 'is-active' : ''} onClick={() => goToGame(item)}>{item.icon}<span>{item.title}</span></button>)}</nav>
    <section className="dk-playground-play dk-dedicated-game" aria-labelledby="current-game"><div className="dk-section-heading"><div><span className="dk-kicker">Now playing</span><h2 id="current-game">{game.title}</h2></div><span className="dk-local-pill">Solo + same-screen</span></div><GameComponent gameId={game.id} onReact={react} /></section>
    <section className="dk-reaction-strip"><div className="dk-reaction-strip-owl">🦉</div><div><strong>Owl tip</strong><p>{reaction}</p></div><span className="dk-safe-pill">No open chat</span></section>
    {game.onlineKey && <><PlaygroundOnlinePanel gameKey={game.onlineKey} /><PlaygroundRankings gameKey={game.onlineKey} /></>}
    <section className="dk-safe-banner"><div className="dk-safe-banner-mark">✓</div><div><strong>Server-authoritative online play</strong><p>When you play online, the server validates room membership, turns, matchmaking scope, and snapshots. Your local game is always available if you want a quiet reset.</p></div></section>
  </main></div>
}
