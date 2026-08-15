import { supabase } from './supabase'

export const OWL_AUDIO_BUCKET = 'datakwest-owl-audio'
export const OWL_AUDIO_MAX_BYTES = 2 * 1024 * 1024
export const OWL_AUDIO_MAX_DURATION_MS = 5000
export const OWL_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4']

function asError(error) {
  return error ? { message: error.message || 'Audio request failed', code: error.code || 'unknown' } : null
}

export async function getOwlAudioLibrary() {
  const { data, error } = await supabase.rpc('get_owl_audio_library')
  return { data: data || [], error: asError(error) }
}

export function readAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const durationMs = Math.round(audio.duration * 1000)
      URL.revokeObjectURL(url)
      if (!Number.isFinite(durationMs)) reject(new Error('Could not read audio duration'))
      else resolve(durationMs)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read audio file'))
    }
    audio.src = url
  })
}

export async function uploadOwlAudio(file, name) {
  if (!file || !OWL_AUDIO_TYPES.includes(file.type)) throw new Error('Choose an MP3, WAV, OGG, WebM, or M4A audio file.')
  if (file.size > OWL_AUDIO_MAX_BYTES) throw new Error('Audio files must be 2MB or smaller.')
  const durationMs = await readAudioDuration(file)
  if (durationMs < 100 || durationMs > OWL_AUDIO_MAX_DURATION_MS) throw new Error('Audio must be between 0.1 and 5 seconds long.')

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in before adding a custom owl sound.')
  const safeName = (name || file.name.replace(/\.[^/.]+$/, '')).trim().slice(0, 80) || 'Custom owl sound'
  const path = `${userData.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { error: uploadError } = await supabase.storage.from(OWL_AUDIO_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error(uploadError.message || 'Could not upload audio')

  const { data, error } = await supabase.rpc('register_owl_audio_asset', {
    p_name: safeName,
    p_storage_path: path,
    p_mime_type: file.type,
    p_file_size_bytes: file.size,
    p_duration_ms: durationMs,
  })
  if (error) {
    await supabase.storage.from(OWL_AUDIO_BUCKET).remove([path])
    throw new Error(error.message || 'Could not register audio')
  }
  return data
}

export async function getOwlAudioUrl(storagePath) {
  const { data, error } = await supabase.storage.from(OWL_AUDIO_BUCKET).createSignedUrl(storagePath, 60 * 60)
  return { url: data?.signedUrl || null, error: asError(error) }
}

export async function archiveOwlAudioAsset(assetId, storagePath) {
  const { data, error } = await supabase.rpc('archive_owl_audio_asset', { p_asset_id: assetId })
  if (!error && storagePath) await supabase.storage.from(OWL_AUDIO_BUCKET).remove([storagePath])
  return { data, error: asError(error) }
}
