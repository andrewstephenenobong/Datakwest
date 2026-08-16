import { supabase } from './supabase'

export async function createPlaygroundRoom(gameKey, visibility = 'private', maxPlayers = 2) {
  const { data, error } = await supabase.rpc('create_playground_room', {
    p_game_key: gameKey,
    p_visibility: visibility,
    p_max_players: maxPlayers,
  })
  return { room: data, error }
}

export async function joinPlaygroundRoom(inviteCode) {
  const { data, error } = await supabase.rpc('join_playground_room', { p_invite_code: inviteCode })
  return { room: data, error }
}

export async function queuePlaygroundMatch(gameKey) {
  const { data, error } = await supabase.rpc('find_playground_match', { p_game_key: gameKey })
  return { queue: data, error }
}

export async function leavePlaygroundMatchmaking() {
  const { data, error } = await supabase.rpc('leave_playground_matchmaking')
  return { queue: data, error }
}

export async function getPlaygroundRoomSnapshot(roomId) {
  const { data, error } = await supabase.rpc('playground_room_snapshot', { p_room_id: roomId })
  return { snapshot: data, error }
}

export async function heartbeatPlaygroundRoom(roomId) {
  const { data, error } = await supabase.rpc('heartbeat_playground_room', { p_room_id: roomId })
  return { snapshot: data, error }
}

export async function leavePlaygroundRoom(roomId) {
  const { data, error } = await supabase.rpc('leave_playground_room', { p_room_id: roomId })
  return { result: data, error }
}

export async function submitPlaygroundIntent(roomId, action) {
  const { data, error } = await supabase.rpc('submit_playground_intent', {
    p_room_id: roomId,
    p_action: action,
  })
  return { result: data, error }
}

export async function sendPlaygroundReaction(roomId, reactionKey) {
  const { data, error } = await supabase.rpc('send_playground_reaction', {
    p_room_id: roomId,
    p_reaction_key: reactionKey,
  })
  return { result: data, error }
}

export async function setPlaygroundSpectatorMode(roomId, enabled) {
  const { data, error } = await supabase.rpc('set_playground_spectator_mode', { p_room_id: roomId, p_enabled: enabled })
  return { result: data, error }
}

export async function joinPlaygroundSpectator(roomId) {
  const { data, error } = await supabase.rpc('join_playground_spectator', { p_room_id: roomId })
  return { result: data, error }
}

export async function leavePlaygroundSpectator(roomId) {
  const { data, error } = await supabase.rpc('leave_playground_spectator', { p_room_id: roomId })
  return { result: data, error }
}

export async function getPlaygroundSpectatorSnapshot(roomId) {
  const { data, error } = await supabase.rpc('playground_spectator_snapshot', { p_room_id: roomId })
  return { snapshot: data, error }
}

export async function getPlaygroundRankings(gameKey, limit = 25) {
  const { data, error } = await supabase.rpc('get_playground_rankings', { p_game_key: gameKey, p_limit: limit })
  return { rankings: data, error }
}


export async function getSnakeLadderSnapshot(roomId) {
  const { data, error } = await supabase.rpc('playground_snake_ladder_snapshot', { p_room_id: roomId })
  return { snapshot: data, error }
}

export async function heartbeatSnakeLadderRoom(roomId) {
  const { data, error } = await supabase.rpc('heartbeat_playground_snake_ladder', { p_room_id: roomId })
  return { snapshot: data, error }
}

export async function submitSnakeLadderIntent(roomId, action) {
  const { data, error } = await supabase.rpc('submit_playground_snake_ladder_intent', {
    p_room_id: roomId,
    p_action: action,
  })
  return { result: data, error }
}


export async function getWhotSnapshot(roomId) {
  const { data, error } = await supabase.rpc('playground_whot_snapshot', { p_room_id: roomId })
  return { snapshot: data, error }
}

export async function submitWhotIntent(roomId, action) {
  const { data, error } = await supabase.rpc('submit_playground_whot_intent', {
    p_room_id: roomId,
    p_action: action,
  })
  return { result: data, error }
}


export async function heartbeatWhotRoom(roomId) {
  const { data, error } = await supabase.rpc('heartbeat_playground_whot', { p_room_id: roomId })
  return { snapshot: data, error }
}
