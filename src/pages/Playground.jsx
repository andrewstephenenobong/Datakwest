import { useCallback, useEffect, useMemo, useState } from 'react'
import LearnerNavigation from '../components/LearnerNavigation'
import PlaygroundOnlinePanel from '../components/PlaygroundOnlinePanel'
import PlaygroundRankings from '../components/PlaygroundRankings'

const gameDefinitions = [
  { id: 'tic', title: 'Tic-tac-toe', eyebrow: 'Quick match', description: 'A tiny strategy break with the Owl or a friend beside you.', tone: 'blue', icon: '×○' },
  { id: 'memory', title: 'Memory cards', eyebrow: 'Focus break', description: 'Flip, match, and train your attention in a calm card challenge.', tone: 'gold', icon: '◐◑' },
  { id: 'snake', title: 'Owl Snake', eyebrow: 'Score chase', description: 'Guide the Owl, collect stars, and beat your best score.', tone: 'green', icon: '●' },
  { id: 'connect', title: 'Connect Four', eyebrow: 'New strategy', description: 'Drop bright Owl tokens and connect four before your rival does.', tone: 'purple', icon: '✦' },
]

const reactionLines = {
  welcome: 'The Owl is ready when you are.',
  win: 'Brilliant move. That was worth a tiny victory flap.',
  draw: 'A draw! The Owl respects a worthy rival.',
  match: 'Nice match. Your focus is getting stronger.',
  score: 'New high score energy. Keep going!',
  safe: 'Play kindly. Preset reactions keep the Playground comfortable for everyone.',
}

function resetTic() {
  return { board: Array(9).fill(null), turn: 'X', winner: null, mode: 'owl' }
}

function checkTicWinner(board) {
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
  for (const [a, b, c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  return board.every(Boolean) ? 'draw' : null
}

function MemoryGame({ onReact }) {
  const makeDeck = () => ['owl', 'owl', 'star', 'star', 'moon', 'moon', 'bolt', 'bolt'].sort(() => Math.random() - 0.5).map((value, index) => ({ id: index, value, revealed: false, matched: false }))
  const [cards, setCards] = useState(makeDeck)
  const [flipped, setFlipped] = useState([])
  const [turn, setTurn] = useState(1)
  const [scores, setScores] = useState({ 1: 0, 2: 0 })
  const locked = flipped.length === 2

  useEffect(() => {
    if (flipped.length !== 2) return undefined
    const [first, second] = flipped.map((id) => cards.find((card) => card.id === id))
    const timeout = window.setTimeout(() => {
      if (first.value === second.value) {
        setCards((current) => current.map((card) => card.id === first.id || card.id === second.id ? { ...card, matched: true } : card))
        setScores((current) => ({ ...current, [turn]: current[turn] + 1 }))
        onReact('match')
      } else setTurn((current) => current === 1 ? 2 : 1)
      setFlipped([])
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [flipped, cards, onReact, turn])

  const flip = (id) => {
    if (locked || flipped.includes(id)) return
    const card = cards.find((item) => item.id === id)
    if (card.matched || card.revealed) return
    setCards((current) => current.map((item) => item.id === id ? { ...item, revealed: true } : item))
    setFlipped((current) => [...current, id])
  }
  const restart = () => { setCards(makeDeck()); setFlipped([]); setScores({ 1: 0, 2: 0 }); setTurn(1) }
  const complete = cards.every((card) => card.matched)
  return <div className="dk-game-panel">
    <div className="dk-game-toolbar"><span>Player {turn}'s turn</span><span>Score {scores[1]} : {scores[2]}</span></div>
    <div className="dk-memory-grid" aria-label="Memory cards">{cards.map((card) => <button type="button" key={card.id} className={`dk-memory-card ${card.revealed || card.matched ? 'is-open' : ''}`} onClick={() => flip(card.id)} aria-label={card.revealed || card.matched ? `${card.value} card` : 'Hidden memory card'}><span>{card.revealed || card.matched ? ({ owl: '🦉', star: '★', moon: '☾', bolt: '✦' }[card.value]) : '?'}</span></button>)}</div>
    <div className="dk-game-footer"><p aria-live="polite">{complete ? 'All pairs found. Lovely focus!' : 'Find matching pairs. A wrong pair passes the turn.'}</p><button type="button" className="dk-secondary-button" onClick={restart}>Restart</button></div>
  </div>
}

function TicTacToeGame({ onReact }) {
  const [game, setGame] = useState(resetTic)
  const [mode, setMode] = useState('owl')
  const makeMove = useCallback((index, player = game.turn) => {
    if (game.board[index] || game.winner) return
    const board = [...game.board]; board[index] = player
    const winner = checkTicWinner(board)
    setGame({ board, turn: player === 'X' ? 'O' : 'X', winner, mode })
    if (winner) onReact(winner === 'draw' ? 'draw' : 'win')
  }, [game.board, game.turn, game.winner, mode, onReact])
  useEffect(() => {
    if (mode !== 'owl' || game.turn !== 'O' || game.winner) return undefined
    const timeout = window.setTimeout(() => {
      const empty = game.board.map((value, index) => value ? null : index).filter((value) => value !== null)
      const choice = empty[Math.floor(Math.random() * empty.length)]
      if (choice !== undefined) makeMove(choice, 'O')
    }, 420)
    return () => window.clearTimeout(timeout)
  }, [game, mode, makeMove])
  const reset = (nextMode = mode) => { setMode(nextMode); setGame({ ...resetTic(), mode: nextMode }) }
  return <div className="dk-game-panel">
    <div className="dk-game-toolbar"><span>{game.winner ? (game.winner === 'draw' ? 'Draw game' : `${game.winner === 'X' ? 'You' : 'Owl'} win`) : `${game.turn === 'X' ? 'Your' : mode === 'owl' ? 'Owl' : 'Player 2'} turn`}</span><div className="dk-mode-switch"><button type="button" className={mode === 'owl' ? 'is-active' : ''} onClick={() => reset('owl')}>Vs Owl</button><button type="button" className={mode === 'local' ? 'is-active' : ''} onClick={() => reset('local')}>Two players</button></div></div>
    <div className="dk-tic-grid">{game.board.map((value, index) => <button type="button" key={index} className="dk-tic-cell" onClick={() => makeMove(index)} aria-label={`Cell ${index + 1}${value ? `, ${value}` : ''}`}>{value === 'X' ? '×' : value === 'O' ? '○' : ''}</button>)}</div>
    <div className="dk-game-footer"><p aria-live="polite">{game.winner ? 'Ready for a rematch?' : 'Three in a row wins the round.'}</p><button type="button" className="dk-secondary-button" onClick={() => reset()}>Restart</button></div>
  </div>
}

function ConnectFourGame({ onReact }) {
  const columns = 7; const rows = 6
  const [board, setBoard] = useState(() => Array(rows * columns).fill(null))
  const [turn, setTurn] = useState('X'); const [winner, setWinner] = useState(null)
  const drop = (column) => {
    if (winner) return
    let row = rows - 1
    while (row >= 0 && board[row * columns + column]) row -= 1
    if (row < 0) return
    const next = [...board]; next[row * columns + column] = turn
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]]
    const count = (dx, dy) => { let total = 1; for (const sign of [-1, 1]) { let x = column + dx * sign; let y = row + dy * sign; while (x >= 0 && x < columns && y >= 0 && y < rows && next[y * columns + x] === turn) { total += 1; x += dx * sign; y += dy * sign } } return total }
    const won = directions.some(([dx, dy]) => count(dx, dy) >= 4)
    setBoard(next); setWinner(won ? turn : next.every(Boolean) ? 'draw' : null); setTurn(turn === 'X' ? 'O' : 'X')
    if (won) onReact('win'); else if (next.every(Boolean)) onReact('draw')
  }
  const reset = () => { setBoard(Array(rows * columns).fill(null)); setTurn('X'); setWinner(null) }
  return <div className="dk-game-panel"><div className="dk-game-toolbar"><span>{winner ? winner === 'draw' ? 'Draw game' : `${winner === 'X' ? 'Player 1' : 'Player 2'} wins` : `${turn === 'X' ? 'Player 1' : 'Player 2'} turn`}</span><span>Connect four</span></div><div className="dk-connect-board" role="grid" aria-label="Connect Four board">{Array.from({ length: columns }, (_, column) => <button key={column} type="button" className="dk-connect-column" onClick={() => drop(column)} aria-label={`Drop token in column ${column + 1}`}>{Array.from({ length: rows }, (_, row) => <span key={row} className={`dk-connect-slot ${board[row * columns + column] === 'X' ? 'is-red' : board[row * columns + column] === 'O' ? 'is-gold' : ''}`} />)}</button>)}</div><div className="dk-game-footer"><p aria-live="polite">{winner ? 'Ready for another bright strategy round?' : 'Drop a token. Four connected tokens wins.'}</p><button type="button" className="dk-secondary-button" onClick={reset}>Restart</button></div></div>
}

function SnakeGame({ onReact }) {
  const size = 14
  const [snake, setSnake] = useState([{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }])
  const [food, setFood] = useState({ x: 10, y: 5 })
  const [direction, setDirection] = useState({ x: 1, y: 0 })
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(window.localStorage.getItem('dk_owl_snake_best') || 0))
  const reset = () => { setSnake([{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }]); setFood({ x: 10, y: 5 }); setDirection({ x: 1, y: 0 }); setScore(0); setRunning(false) }
  useEffect(() => {
    const onKey = (event) => {
      const keys = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } }
      if (keys[event.key]) { event.preventDefault(); const next = keys[event.key]; if (next.x + direction.x !== 0 || next.y + direction.y !== 0) setDirection(next); setRunning(true) }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [direction])
  useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => setSnake((current) => {
      const head = { x: current[0].x + direction.x, y: current[0].y + direction.y }
      const hit = head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || current.some((part) => part.x === head.x && part.y === head.y)
      if (hit) { setRunning(false); onReact('score'); return current }
      const next = [head, ...current]
      if (head.x === food.x && head.y === food.y) { setScore((value) => { const nextScore = value + 1; setBest((bestScore) => { const nextBest = Math.max(bestScore, nextScore); window.localStorage.setItem('dk_owl_snake_best', String(nextBest)); return nextBest }); return nextScore }); setFood({ x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) }) } else next.pop()
      return next
    }), 180)
    return () => window.clearInterval(timer)
  }, [running, direction, food, onReact])
  const cells = useMemo(() => Array.from({ length: size * size }, (_, index) => ({ x: index % size, y: Math.floor(index / size) })), [])
  const steer = (next) => { if (next.x + direction.x !== 0 || next.y + direction.y !== 0) setDirection(next); setRunning(true) }
  return <div className="dk-game-panel"><div className="dk-game-toolbar"><span>Score {score}</span><span>Best {best}</span></div><div className="dk-snake-board" role="img" aria-label={`Owl Snake board. Score ${score}. Use arrow keys or controls below.`}>{cells.map((cell) => { const part = snake.find((item) => item.x === cell.x && item.y === cell.y); const isFood = food.x === cell.x && food.y === cell.y; return <span key={`${cell.x}-${cell.y}`} className={`dk-snake-cell ${part ? 'is-snake' : ''} ${isFood ? 'is-food' : ''}`}>{part && cell.x === snake[0].x && cell.y === snake[0].y ? '🦉' : isFood ? '★' : ''}</span> })}</div><div className="dk-snake-controls"><button type="button" onClick={() => steer({ x: 0, y: -1 })}>↑</button><div><button type="button" onClick={() => steer({ x: -1, y: 0 })}>←</button><button type="button" onClick={() => steer({ x: 0, y: 1 })}>↓</button><button type="button" onClick={() => steer({ x: 1, y: 0 })}>→</button></div></div><div className="dk-game-footer"><p>{running ? 'Collect stars and avoid the edges.' : score ? 'Round over. Your score is safe.' : 'Press a direction to start.'}</p><button type="button" className="dk-secondary-button" onClick={reset}>Restart</button></div></div>
}

export default function Playground() {
  const [selected, setSelected] = useState('tic')
  const [reaction, setReaction] = useState(reactionLines.welcome)
  const selectedGame = gameDefinitions.find((game) => game.id === selected)
  const react = (key) => setReaction(reactionLines[key] || reactionLines.welcome)
  return <div className="dk-playground-page"><LearnerNavigation /><main className="mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-12">
    <section className="dk-playground-hero"><div className="dk-playground-hero-copy"><span className="dk-kicker">DataKwest Playground</span><h1>A joyful break, hosted by the Owl.</h1><p>Play for a few minutes, reset your focus, and come back to your learning path when you are ready. Playground wins stay separate from mastery and career progress.</p><div className="dk-owl-speech" aria-live="polite"><img src="/datakwest_icon_1.png" alt="DataKwest Owl" /><span>{reaction}</span></div></div><div className="dk-playground-owl-wrap"><img src="/datakwest_icon_1.png" alt="The DataKwest Owl mascot" className="dk-playground-owl" /></div></section>
    <section className="dk-playground-section" aria-labelledby="choose-game"><div className="dk-section-heading"><div><span className="dk-kicker">Quick play</span><h2 id="choose-game">Choose your game</h2></div><span className="dk-safe-pill">Preset reactions only</span></div><div className="dk-game-picker">{gameDefinitions.map((game) => <button type="button" key={game.id} className={`dk-game-card tone-${game.tone} ${selected === game.id ? 'is-selected' : ''}`} onClick={() => { setSelected(game.id); react('welcome') }}><span className="dk-game-card-icon">{game.icon}</span><span className="dk-game-card-eyebrow">{game.eyebrow}</span><strong>{game.title}</strong><span>{game.description}</span><em>Play now <span aria-hidden="true">→</span></em></button>)}</div></section>
    <section className="dk-playground-play" aria-labelledby="active-game"><div className="dk-section-heading"><div><span className="dk-kicker">Now playing</span><h2 id="active-game">{selectedGame.title}</h2></div><span className="dk-local-pill">Solo + same-screen</span></div>{selected === 'tic' ? <TicTacToeGame onReact={react} /> : selected === 'memory' ? <MemoryGame onReact={react} /> : selected === 'snake' ? <SnakeGame onReact={react} /> : <ConnectFourGame onReact={react} />}</section>
    <PlaygroundOnlinePanel gameKey={selected === 'tic' ? 'tic_tac_toe' : selected === 'memory' ? 'memory_cards' : 'connect_four'} />
    {selected !== 'snake' && <PlaygroundRankings gameKey={selected === 'tic' ? 'tic_tac_toe' : selected === 'memory' ? 'memory_cards' : 'connect_four'} />}
    <section className="dk-safe-banner"><div className="dk-safe-banner-mark">✓</div><div><strong>Play kind. Play safe.</strong><p>The Playground uses preset reactions at launch. Private rooms and safe matchmaking will be introduced with server-authoritative room controls before online competition is enabled.</p></div></section>
  </main></div>
}
