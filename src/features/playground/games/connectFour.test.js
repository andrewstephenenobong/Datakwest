import test from 'node:test'
import assert from 'node:assert/strict'
import { applyConnectFourMove, createConnectFourState } from './connectFour.js'

test('connect four drops tokens and alternates turns', () => {
  const state = createConnectFourState()
  const next = applyConnectFourMove(state, 0)
  assert.equal(next.board[35], 'X')
  assert.equal(next.next_symbol, 'O')
  assert.equal(next.winner, null)
})

test('connect four detects horizontal wins', () => {
  let state = createConnectFourState()
  for (const column of [0, 0, 1, 1, 2, 2]) state = applyConnectFourMove(state, column)
  state = applyConnectFourMove(state, 3)
  assert.equal(state.winner, 'X')
})

test('connect four rejects wrong turns, invalid columns, and full columns', () => {
  const state = createConnectFourState()
  assert.throws(() => applyConnectFourMove(state, 0, 'O'), /not_your_turn/)
  assert.throws(() => applyConnectFourMove(state, 7), /invalid_column/)
  let full = state
  for (let index = 0; index < 6; index += 1) full = applyConnectFourMove(full, 0)
  assert.throws(() => applyConnectFourMove(full, 0), /column_full/)
})
