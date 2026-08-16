import { useNavigate } from 'react-router-dom'
import LearnerNavigation from '../components/LearnerNavigation'
import { GAME_DEFINITIONS, usePlaygroundReaction } from '../components/playground/GameComponents'

const hubStats = [
  { label: 'Quickest reset', value: '3 min', detail: 'Tic-tac-toe' },
  { label: 'Best focus loop', value: '8 cards', detail: 'Memory cards' },
  { label: 'Longest flight', value: '∞', detail: 'Owl Snake' },
]

export default function Playground() {
  const navigate = useNavigate()
  const { reaction } = usePlaygroundReaction()
  return <div className="dk-playground-page"><LearnerNavigation /><main className="mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-12">
    <section className="dk-playground-hero dk-playground-hero-modern"><div className="dk-playground-hero-copy"><span className="dk-kicker">The Playground</span><h1>A joyful reset, hosted by the Owl.</h1><p>Take a small break without leaving your learning rhythm. Pick a game, chase a score, or invite someone into a safe room. Playground activity never changes mastery or career progress.</p><div className="dk-owl-speech" aria-live="polite"><img src="/datakwest_icon_1.png" alt="DataKwest Owl" /><span>{reaction}</span></div></div><div className="dk-playground-owl-wrap"><div className="dk-owl-aura" /><img src="/playground-owl-mascot-clean.png" alt="The DataKwest Owl mascot" className="dk-playground-owl dk-playground-owl-generated" /></div></section>
    <section className="dk-playground-section dk-playground-stats" aria-label="Playground highlights">{hubStats.map((stat) => <div key={stat.label} className="dk-play-stat"><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small></div>)}</section>
    <section className="dk-playground-section" aria-labelledby="choose-game"><div className="dk-section-heading"><div><span className="dk-kicker">Choose your break</span><h2 id="choose-game">Play a little. Return refreshed.</h2></div><span className="dk-safe-pill">Preset reactions only</span></div><div className="dk-game-picker dk-game-picker-modern">{GAME_DEFINITIONS.map((game, index) => <button type="button" key={game.id} className={`dk-game-card tone-${game.tone} dk-game-card-modern ${index === 0 ? 'is-featured' : ''}`} onClick={() => navigate(`/playground/${game.route}`)}><span className="dk-game-card-icon">{game.icon}</span><span className="dk-game-card-eyebrow">{game.eyebrow}</span><strong>{game.title}</strong><span>{game.description}</span><em>Open game <span aria-hidden="true">↗</span></em><span className="dk-game-card-accent" style={{ background: game.accent }} /></button>)}</div></section>
    <section className="dk-playground-section dk-playground-ritual"><div><span className="dk-kicker">A better break</span><h2>Short, social, and separate from your learning score.</h2><p>Use the Playground to reset attention, connect with a friend, or practise patience. Online rooms are age-scoped and server-authoritative, with no open chat.</p></div><button type="button" className="dk-online-primary" onClick={() => navigate('/playground/tic-tac-toe')}>Start a quick round <span aria-hidden="true">→</span></button></section>
    <section className="dk-safe-banner"><div className="dk-safe-banner-mark">✓</div><div><strong>Play kind. Play safe.</strong><p>Preset reactions keep the Playground comfortable for everyone. Private rooms and matchmaking use protected server rules, while your learning data stays separate.</p></div></section>
  </main></div>
}
