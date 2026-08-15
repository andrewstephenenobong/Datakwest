import { useEffect, useState } from 'react'

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine)
  const [showRestored, setShowRestored] = useState(false)

  useEffect(() => {
    function handleOffline() {
      setOnline(false)
      setShowRestored(false)
    }

    function handleOnline() {
      setOnline(true)
      setShowRestored(true)
      const timer = window.setTimeout(() => setShowRestored(false), 3600)
      return () => window.clearTimeout(timer)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (online && !showRestored) return null

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-3">
      <div className="flex w-full max-w-xl items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-bold shadow-lg" style={{ borderColor: online ? '#9FD2B2' : '#E5B8B8', background: online ? '#F0FBF3' : '#FFF5F4', color: online ? '#17633B' : '#8F2B2B' }}>
        <span>{online ? 'Connection restored. Your learning space is ready.' : 'You are offline. Drafts stay on this device; reconnect before submitting evidence.'}</span>
        {!online && <button type="button" onClick={() => window.location.reload()} className="min-h-9 shrink-0 rounded-lg border px-3 text-xs" style={{ borderColor: '#D99A9A', color: '#8F2B2B' }}>Retry</button>}
      </div>
    </div>
  )
}
