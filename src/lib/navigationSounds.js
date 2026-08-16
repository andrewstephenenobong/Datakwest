const STORAGE_KEY = 'datakwest-navigation-sounds'

export const navigationActions = [
  ['home', 'Home', 'Returning to your learning home'],
  ['learn', 'Learn', 'Opening a learning path'],
  ['practice', 'Practice', 'Starting focused practice'],
  ['community', 'Community', 'Opening the learner community'],
  ['career', 'Career', 'Opening your career centre'],
  ['more', 'More menu', 'Opening additional destinations'],
]

export const defaultNavigationSoundPreferences = {
  enabled: true,
  style: 'soft',
  home: true,
  learn: true,
  practice: true,
  community: true,
  career: true,
  more: true,
}

export function getNavigationSoundPreferences() {
  if (typeof window === 'undefined') return defaultNavigationSoundPreferences
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
    return { ...defaultNavigationSoundPreferences, ...(stored || {}) }
  } catch {
    return defaultNavigationSoundPreferences
  }
}

export function saveNavigationSoundPreferences(preferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultNavigationSoundPreferences, ...preferences }))
}

function tone(context, frequency, duration, volume, type, delay = 0) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const start = context.currentTime + delay
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

export function playNavigationSound(action = 'learn', style = getNavigationSoundPreferences().style) {
  if (typeof window === 'undefined' || style === 'off') return
  const preferences = getNavigationSoundPreferences()
  if (!preferences.enabled || preferences[action] === false) return
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  const context = new AudioContext()
  const base = { home: 392, learn: 523, practice: 330, community: 440, career: 659, more: 262 }[action] || 440
  const settings = {
    soft: { type: 'sine', volume: 0.035, duration: 0.13, interval: 0.06, second: 1.18 },
    chime: { type: 'triangle', volume: 0.055, duration: 0.17, interval: 0.08, second: 1.25 },
    pop: { type: 'square', volume: 0.025, duration: 0.08, interval: 0, second: 1.45 },
  }[style] || { type: 'sine', volume: 0.035, duration: 0.13, interval: 0.06, second: 1.18 }
  tone(context, base, settings.duration, settings.volume, settings.type)
  if (settings.interval) tone(context, base * settings.second, settings.duration, settings.volume * 0.8, settings.type, settings.interval)
  window.setTimeout(() => context.close().catch(() => null), 500)
}

export function previewNavigationSound(style) {
  const current = getNavigationSoundPreferences()
  saveNavigationSoundPreferences({ ...current, enabled: true, style, learn: true })
  playNavigationSound('learn', style)
  saveNavigationSoundPreferences(current)
}


const OWL_INTRO_SOUND_KEY = 'datakwest-owl-intro-sound'

export function getOwlIntroSoundPreference() {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(OWL_INTRO_SOUND_KEY) !== 'off'
}

export function saveOwlIntroSoundPreference(enabled) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(OWL_INTRO_SOUND_KEY, enabled ? 'on' : 'off')
}

export function playOwlIntroSound() {
  if (typeof window === 'undefined' || !getOwlIntroSoundPreference()) return false
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return false
  const context = new AudioContext()
  const notes = [392, 523, 659]
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime + index * 0.09
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.2)
  })
  window.setTimeout(() => context.close().catch(() => null), 520)
  return true
}
