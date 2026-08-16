export const CONNECT_FOUR_ROWS = 6
export const CONNECT_FOUR_COLUMNS = 7

export function createConnectFourState() {
  return {
    version: 1,
    board: Array(CONNECT_FOUR_ROWS * CONNECT_FOUR_COLUMNS).fill(null),
    next_symbol: 'X',
    winner: null,
  }
}

function countDirection(board, row, column, symbol, rowStep, columnStep) {
  let count = 1
  for (const sign of [-1, 1]) {
    let nextRow = row + rowStep * sign
    let nextColumn = column + columnStep * sign
    while (nextRow >= 0 && nextRow < CONNECT_FOUR_ROWS && nextColumn >= 0 && nextColumn < CONNECT_FOUR_COLUMNS && board[nextRow * CONNECT_FOUR_COLUMNS + nextColumn] === symbol) {
      count += 1
      nextRow += rowStep * sign
      nextColumn += columnStep * sign
    }
  }
  return count
}

export function findConnectFourWinner(board, row, column, symbol) {
  return [[1, 0], [0, 1], [1, 1], [1, -1]].some(([rowStep, columnStep]) => countDirection(board, row, column, symbol, rowStep, columnStep) >= 4) ? symbol : board.every(Boolean) ? 'draw' : null
}

export function applyConnectFourMove(state, column, symbol = state.next_symbol) {
  if (!state || state.winner) throw new Error('round_finished')
  if (!Number.isInteger(column) || column < 0 || column >= CONNECT_FOUR_COLUMNS) throw new Error('invalid_column')
  if (symbol !== state.next_symbol) throw new Error('not_your_turn')

  let row = CONNECT_FOUR_ROWS - 1
  while (row >= 0 && state.board[row * CONNECT_FOUR_COLUMNS + column]) row -= 1
  if (row < 0) throw new Error('column_full')

  const board = [...state.board]
  board[row * CONNECT_FOUR_COLUMNS + column] = symbol
  const winner = findConnectFourWinner(board, row, column, symbol)
  return { ...state, board, next_symbol: symbol === 'X' ? 'O' : 'X', winner }
}
