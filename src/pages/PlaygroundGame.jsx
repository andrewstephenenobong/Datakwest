import { useEffect, useState } from 'react'
import { getOwlIntroSoundPreference, playOwlIntroSound, saveOwlIntroSoundPreference } from '../lib/navigationSounds'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LearnerNavigation from '../components/LearnerNavigation'
import PlaygroundOnlinePanel from '../components/PlaygroundOnlinePanel'
import PlaygroundRankings from '../components/PlaygroundRankings'
import { DIFFICULTIES, DifficultySelector, GAME_DEFINITIONS, GameComponent, getGameDefinition, getSavedDifficulty, usePlaygroundReaction } from '../components/playground/GameComponents'

function OwlGuide({ game, onClose, replay = false }) {
  const [soundEnabled, setSoundEnabled] = useState(() => getOwlIntroSoundPreference())
  const [soundPlayed, setSoundPlayed] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!soundEnabled) return
      setSoundPlayed(playOwlIntroSound())
    }, 120)
    return () => window.clearTimeout(timer)
  }, [soundEnabled])
  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    saveOwlIntroSoundPreference(next)
    if (next) setSoundPlayed(playOwlIntroSound())
  }
  return <div className="dk-owl-guide-backdrop" role="presentation"><section className="dk-owl-guide dk-owl-guide-enter" role="dialog" aria-modal="true" aria-labelledby="owl-guide-title"><button type="button" className="dk-owl-guide-close" onClick={onClose} aria-label="Close Owl game guide">×</button><div className="dk-owl-guide-avatar"><img src="/playground-owl-mascot-clean.png" alt="" /></div><div className="dk-owl-guide-spark" aria-hidden="true">✦</div><span className="dk-kicker">{replay ? 'Owl refresher' : 'First time here?'}</span><h2 id="owl-guide-title">Let the Owl show you how to play.</h2><p className="dk-owl-guide-intro">{replay ? 'Here is a quick reminder before your next round.' : 'No pressure. I will explain the rules, then you can choose a comfortable challenge level.'}</p><ol>{game.guide.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol><div className="dk-owl-guide-tools"><button type="button" className="dk-owl-sound-toggle" onClick={toggleSound} aria-pressed={soundEnabled}>{soundEnabled ? 'Sound on' : 'Sound off'}</button><button type="button" className="dk-owl-sound-toggle" onClick={() => setSoundPlayed(playOwlIntroSound())}>{soundPlayed ? 'Replay chime' : 'Play chime'}</button></div><button type="button" className="dk-online-primary" onClick={onClose}>{replay ? 'Back to the game' : 'I’m ready — let’s play'}</button></section></div>
}

export default function PlaygroundGame() {
  const { game: routeGame } = useParams(); const navigate = useNavigate(); const game = GAME_DEFINITIONS.find((item) => item.route === routeGame) || GAME_DEFINITIONS[0]; const { reaction, react } = usePlaygroundReaction(); const [difficulty, setDifficulty] = useState(() => getSavedDifficulty(game.id)); const [guideOpen, setGuideOpen] = useState(false); const [guideReplay, setGuideReplay] = useState(false)
  useEffect(() => { setDifficulty(getSavedDifficulty(game.id)); const seen = window.localStorage.getItem(`dk_playground_guide_seen_${game.id}`); if (!seen) setGuideOpen(true) }, [game.id])
  const closeGuide = () => { window.localStorage.setItem(`dk_playground_guide_seen_${game.id}`, '1'); setGuideOpen(false) }; const openGuide = () => { setGuideReplay(true); setGuideOpen(true) }; const goToGame = (next) => navigate(`/playground/${next.route}`)
  return <div className="dk-playground-page"><LearnerNavigation /><main className="mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-12">
    <div className="dk-game-breadcrumb"><Link to="/playground">Playground</Link><span aria-hidden="true">/</span><strong>{game.title}</strong></div>
    <section className="dk-game-hero"><div><span className="dk-kicker">{game.eyebrow}</span><h1>{game.title}</h1><p>{game.description} Choose your pace, keep it friendly, and let the Owl call the next round.</p></div><div className="dk-owl-speech dk-owl-speech-game" aria-live="polite"><img src="/playground-owl-mascot-clean.png" alt="DataKwest Owl" /><span>{reaction}</span></div></section>
    <nav className="dk-game-tabs" aria-label="Playground games">{GAME_DEFINITIONS.map((item) => <button type="button" key={item.id} className={item.id === game.id ? 'is-active' : ''} onClick={() => goToGame(item)}>{item.icon}<span>{item.title}</span></button>)}</nav>
    <section className="dk-playground-play dk-dedicated-game" aria-labelledby="current-game"><div className="dk-section-heading"><div><span className="dk-kicker">Now playing</span><h2 id="current-game">{game.title}</h2></div><div className="dk-game-actions"><button type="button" className="dk-guide-button" onClick={openGuide}>How to play</button><span className="dk-local-pill">Solo + same-screen</span></div></div><DifficultySelector gameId={game.id} value={difficulty} onChange={setDifficulty} /><GameComponent key={`${game.id}-${difficulty}`} gameId={game.id} onReact={react} difficulty={difficulty} /></section>
    <section className="dk-reaction-strip"><div className="dk-reaction-strip-owl">🦉</div><div><strong>Owl tip</strong><p>{reaction}</p></div><span className="dk-safe-pill">{DIFFICULTIES[difficulty].label} mode</span></section>
    {game.onlineKey && <><PlaygroundOnlinePanel gameKey={game.onlineKey} /><PlaygroundRankings gameKey={game.onlineKey} /></>}
    <section className="dk-safe-banner"><div className="dk-safe-banner-mark">✓</div><div><strong>Server-authoritative online play</strong><p>When you play online, the server validates room membership, turns, matchmaking scope, and snapshots. Your local game is always available if you want a quiet reset.</p></div></section>
  </main>{guideOpen && <OwlGuide game={game} onClose={closeGuide} replay={guideReplay} />}</div>
}
