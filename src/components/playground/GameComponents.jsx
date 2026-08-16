import { useCallback, useEffect, useMemo, useState } from 'react'

export const GAME_DEFINITIONS = [
  { id: 'tic', route: 'tic-tac-toe', onlineKey: 'tic_tac_toe', title: 'Tic-tac-toe', eyebrow: 'Quick strategy', description: 'Read the board, block the Owl, and land the cleverest three-in-a-row.', tone: 'blue', icon: '×○', accent: '#5B8DEF' },
  { id: 'memory', route: 'memory-cards', onlineKey: 'memory_cards', title: 'Memory cards', eyebrow: 'Focus sprint', description: 'Build a streak by finding pairs before your attention wanders.', tone: 'gold', icon: '◐◑', accent: '#E6B84B' },
  { id: 'snake', route: 'owl-snake', onlineKey: null, title: 'Owl Snake', eyebrow: 'Score chase', description: 'Collect moon-stars, grow your trail, and beat your personal best.', tone: 'green', icon: '●', accent: '#56B69A' },
  { id: 'connect', route: 'connect-four', onlineKey: 'connect_four', title: 'Connect Four', eyebrow: 'Tactical duel', description: 'Control the middle, set a trap, and connect four glowing tokens.', tone: 'purple', icon: '✦', accent: '#A985F3' },
]

const REACTIONS = {
  welcome: 'The Owl is ready when you are.',
  win: 'Brilliant move. That was worth a tiny victory flap.',
  draw: 'A draw! The Owl respects a worthy rival.',
  match: 'Nice match. Your focus is getting stronger.',
  score: 'New high-score energy. Keep going!',
}

export function getGameDefinition(id) {
  return GAME_DEFINITIONS.find((game) => game.id === id) || GAME_DEFINITIONS[0]
}

export function usePlaygroundReaction() {
  const [reaction, setReaction] = useState(REACTIONS.welcome)
  return { reaction, react: (key) => setReaction(REACTIONS[key] || REACTIONS.welcome) }
}

function resetTic() { return { board: Array(9).fill(null), turn: 'X', winner: null } }
function checkTicWinner(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  for (const [a,b,c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  return board.every(Boolean) ? 'draw' : null
}

export function TicTacToeGame({ onReact }) {
  const [game, setGame] = useState(resetTic)
  const [mode, setMode] = useState('owl')
  const makeMove = useCallback((index, player = game.turn) => {
    if (game.board[index] || game.winner || (mode === 'owl' && player === 'O')) return
    const board = [...game.board]; board[index] = player
    const winner = checkTicWinner(board)
    setGame({ board, turn: player === 'X' ? 'O' : 'X', winner })
    if (winner) onReact(winner === 'draw' ? 'draw' : 'win')
  }, [game, mode, onReact])
  useEffect(() => {
    if (mode !== 'owl' || game.turn !== 'O' || game.winner) return undefined
    const timeout = window.setTimeout(() => {
      const empty = game.board.map((value, index) => value ? null : index).filter((value) => value !== null)
      const choice = empty[Math.floor(Math.random() * empty.length)]
      if (choice !== undefined) {
        const board = [...game.board]; board[choice] = 'O'
        const winner = checkTicWinner(board)
        setGame({ board, turn: 'X', winner })
        if (winner) onReact(winner === 'draw' ? 'draw' : 'win')
      }
    }, 420)
    return () => window.clearTimeout(timeout)
  }, [game, mode, onReact])
  const reset = (nextMode = mode) => { setMode(nextMode); setGame(resetTic()) }
  const status = game.winner ? (game.winner === 'draw' ? 'Draw game' : `${game.winner === 'X' ? 'You' : 'Owl'} win`) : `${game.turn === 'X' ? 'Your' : mode === 'owl' ? 'Owl' : 'Player 2'} turn`
  return <div className="dk-game-panel dk-modern-game-panel"><div className="dk-game-toolbar"><span className="dk-live-status"><i />{status}</span><div className="dk-mode-switch"><button type="button" className={mode === 'owl' ? 'is-active' : ''} onClick={() => reset('owl')}>Vs Owl</button><button type="button" className={mode === 'local' ? 'is-active' : ''} onClick={() => reset('local')}>Two players</button></div></div><div className="dk-tic-grid dk-tic-grid-modern">{game.board.map((value, index) => <button type="button" key={index} className={`dk-tic-cell ${value ? 'is-filled' : ''}`} onClick={() => makeMove(index)} aria-label={`Cell ${index + 1}${value ? `, ${value}` : ''}`}>{value === 'X' ? '×' : value === 'O' ? '○' : <span>+</span>}</button>)}</div><div className="dk-game-footer"><p aria-live="polite">{game.winner ? 'Ready for a rematch?' : 'Three in a row wins the round.'}</p><button type="button" className="dk-secondary-button" onClick={() => reset()}>Restart</button></div></div>
}

function makeDeck() { return ['owl','owl','star','star','moon','moon','bolt','bolt'].sort(() => Math.random() - 0.5).map((value, index) => ({ id: index, value, revealed: false, matched: false })) }
export function MemoryGame({ onReact }) {
  const [cards, setCards] = useState(makeDeck)
  const [flipped, setFlipped] = useState([])
  const [turn, setTurn] = useState(1)
  const [scores, setScores] = useState({ 1: 0, 2: 0 })
  useEffect(() => { if (flipped.length !== 2) return undefined; const [first, second] = flipped.map((id) => cards.find((card) => card.id === id)); const timeout = window.setTimeout(() => { if (first.value === second.value) { setCards((current) => current.map((card) => card.id === first.id || card.id === second.id ? { ...card, matched: true } : card)); setScores((current) => ({ ...current, [turn]: current[turn] + 1 })); onReact('match') } else setTurn((current) => current === 1 ? 2 : 1); setFlipped([]) }, 650); return () => window.clearTimeout(timeout) }, [flipped, cards, onReact, turn])
  const flip = (id) => { if (flipped.length === 2 || flipped.includes(id)) return; const card = cards.find((item) => item.id === id); if (!card || card.matched || card.revealed) return; setCards((current) => current.map((item) => item.id === id ? { ...item, revealed: true } : item)); setFlipped((current) => [...current, id]) }
  const restart = () => { setCards(makeDeck()); setFlipped([]); setScores({ 1: 0, 2: 0 }); setTurn(1) }
  const complete = cards.every((card) => card.matched)
  return <div className="dk-game-panel dk-modern-game-panel"><div className="dk-game-toolbar"><span className="dk-live-status"><i />Player {turn}'s turn</span><span className="dk-score-chip">{scores[1]} : {scores[2]}</span></div><div className="dk-memory-grid dk-memory-grid-modern" aria-label="Memory cards">{cards.map((card) => <button type="button" key={card.id} className={`dk-memory-card ${card.revealed || card.matched ? 'is-open' : ''} ${card.matched ? 'is-matched' : ''}`} onClick={() => flip(card.id)} aria-label={card.revealed || card.matched ? `${card.value} card` : 'Hidden memory card'}><span>{card.revealed || card.matched ? ({ owl: '🦉', star: '★', moon: '☾', bolt: '✦' }[card.value]) : '?'}</span></button>)}</div><div className="dk-game-footer"><p aria-live="polite">{complete ? 'All pairs found. Lovely focus!' : 'Find a pair. A wrong guess passes the turn.'}</p><button type="button" className="dk-secondary-button" onClick={restart}>Restart</button></div></div>
}

export function ConnectFourGame({ onReact }) {
  const columns = 7; const rows = 6; const [board, setBoard] = useState(() => Array(rows * columns).fill(null)); const [turn, setTurn] = useState('X'); const [winner, setWinner] = useState(null)
  const drop = (column) => { if (winner) return; let row = rows - 1; while (row >= 0 && board[row * columns + column]) row -= 1; if (row < 0) return; const next = [...board]; next[row * columns + column] = turn; const directions = [[1,0],[0,1],[1,1],[1,-1]]; const count = (dx,dy) => { let total = 1; for (const sign of [-1,1]) { let x = column + dx * sign; let y = row + dy * sign; while (x >= 0 && x < columns && y >= 0 && y < rows && next[y * columns + x] === turn) { total += 1; x += dx * sign; y += dy * sign } } return total }; const won = directions.some(([dx,dy]) => count(dx,dy) >= 4); setBoard(next); setWinner(won ? turn : next.every(Boolean) ? 'draw' : null); setTurn(turn === 'X' ? 'O' : 'X'); if (won) onReact('win'); else if (next.every(Boolean)) onReact('draw') }
  const reset = () => { setBoard(Array(rows * columns).fill(null)); setTurn('X'); setWinner(null) }
  return <div className="dk-game-panel dk-modern-game-panel"><div className="dk-game-toolbar"><span className="dk-live-status"><i />{winner ? winner === 'draw' ? 'Draw game' : `${winner === 'X' ? 'Player 1' : 'Player 2'} wins` : `${turn === 'X' ? 'Player 1' : 'Player 2'} turn`}</span><span className="dk-score-chip">Connect four</span></div><div className="dk-connect-board dk-connect-board-modern" role="grid" aria-label="Connect Four board">{Array.from({ length: columns }, (_, column) => <button key={column} type="button" className="dk-connect-column" onClick={() => drop(column)} aria-label={`Drop token in column ${column + 1}`}>{Array.from({ length: rows }, (_, row) => <span key={row} className={`dk-connect-slot ${board[row * columns + column] === 'X' ? 'is-red' : board[row * columns + column] === 'O' ? 'is-gold' : ''}`} />)}</button>)}</div><div className="dk-game-footer"><p aria-live="polite">{winner ? 'Ready for another strategy round?' : 'Control the middle. Four connected tokens wins.'}</p><button type="button" className="dk-secondary-button" onClick={reset}>Restart</button></div></div>
}

export function SnakeGame({ onReact }) {
  const size = 14; const [snake, setSnake] = useState([{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }]); const [food, setFood] = useState({ x: 10, y: 5 }); const [direction, setDirection] = useState({ x: 1, y: 0 }); const [running, setRunning] = useState(false); const [score, setScore] = useState(0); const [best, setBest] = useState(() => Number(window.localStorage.getItem('dk_owl_snake_best') || 0))
  const reset = () => { setSnake([{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }]); setFood({ x: 10, y: 5 }); setDirection({ x: 1, y: 0 }); setScore(0); setRunning(false) }
  useEffect(() => { const onKey = (event) => { const keys = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } }; if (keys[event.key]) { event.preventDefault(); const next = keys[event.key]; if (next.x + direction.x !== 0 || next.y + direction.y !== 0) setDirection(next); setRunning(true) } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [direction])
  useEffect(() => { if (!running) return undefined; const timer = window.setInterval(() => setSnake((current) => { const head = { x: current[0].x + direction.x, y: current[0].y + direction.y }; const hit = head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || current.some((part) => part.x === head.x && part.y === head.y); if (hit) { setRunning(false); onReact('score'); return current } const next = [head, ...current]; if (head.x === food.x && head.y === food.y) { setScore((value) => { const nextScore = value + 1; setBest((bestScore) => { const nextBest = Math.max(bestScore, nextScore); window.localStorage.setItem('dk_owl_snake_best', String(nextBest)); return nextBest }); return nextScore }); setFood({ x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) }) } else next.pop(); return next }), 180); return () => window.clearInterval(timer) }, [running, direction, food, onReact])
  const cells = useMemo(() => Array.from({ length: size * size }, (_, index) => ({ x: index % size, y: Math.floor(index / size) })), [])
  const steer = (next) => { if (next.x + direction.x !== 0 || next.y + direction.y !== 0) setDirection(next); setRunning(true) }
  return <div className="dk-game-panel dk-modern-game-panel"><div className="dk-game-toolbar"><span className="dk-live-status"><i />{running ? 'Flight in progress' : score ? 'Round over' : 'Ready to fly'}</span><span className="dk-score-chip">Score {score} · Best {best}</span></div><div className="dk-snake-board dk-snake-board-modern" role="img" aria-label={`Owl Snake board. Score ${score}. Use arrow keys or controls below.`}>{cells.map((cell) => { const part = snake.find((item) => item.x === cell.x && item.y === cell.y); const isFood = food.x === cell.x && food.y === cell.y; return <span key={`${cell.x}-${cell.y}`} className={`dk-snake-cell ${part ? 'is-snake' : ''} ${isFood ? 'is-food' : ''}`}>{part && cell.x === snake[0].x && cell.y === snake[0].y ? '🦉' : isFood ? '★' : ''}</span> })}</div><div className="dk-snake-controls"><button type="button" onClick={() => steer({ x: 0, y: -1 })}>↑</button><div><button type="button" onClick={() => steer({ x: -1, y: 0 })}>←</button><button type="button" onClick={() => steer({ x: 0, y: 1 })}>↓</button><button type="button" onClick={() => steer({ x: 1, y: 0 })}>→</button></div></div><div className="dk-game-footer"><p>{running ? 'Collect moon-stars and avoid the edges.' : score ? 'Your score is safe. Ready for another flight?' : 'Press a direction to launch.'}</p><button type="button" className="dk-secondary-button" onClick={reset}>Restart</button></div></div>
}

export function GameComponent({ gameId, onReact }) {
  if (gameId === 'memory') return <MemoryGame onReact={onReact} />
  if (gameId === 'snake') return <SnakeGame onReact={onReact} />
  if (gameId === 'connect') return <ConnectFourGame onReact={onReact} />
  return <TicTacToeGame onReact={onReact} />
}
