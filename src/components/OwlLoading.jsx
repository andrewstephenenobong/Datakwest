import { useEffect, useState } from 'react'

export default function OwlLoading({ message = 'Preparing your learning space…', onRetry = null }) {
  const [step, setStep] = useState(0)
  const [slow, setSlow] = useState(false)
  const steps = [message, 'Checking your learning path…', 'Getting your next step ready…']

  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => (current + 1) % steps.length), 1900)
    const slowTimer = window.setTimeout(() => setSlow(true), 9000)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(slowTimer)
    }
  }, [steps.length])

  return (
    <main className="dk-owl-loading relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <style>{`@keyframes dkOwlFloat { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(2deg); } } @keyframes dkOwlPulse { 0%,100% { transform: scale(.86); opacity:.26; } 50% { transform: scale(1.08); opacity:.48; } } @keyframes dkOwlSpin { to { transform: rotate(360deg); } } .dk-owl-loader { animation: dkOwlFloat 3.6s ease-in-out infinite; } .dk-owl-halo { animation: dkOwlPulse 2.4s ease-in-out infinite; } .dk-owl-ring { animation: dkOwlSpin 1.8s linear infinite; } @media (prefers-reduced-motion: reduce) { .dk-owl-loader, .dk-owl-halo, .dk-owl-ring { animation: none; } }`}</style>
      <div className="dk-owl-loading-orb dk-owl-loading-orb-gold pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full" />
      <div className="dk-owl-loading-orb dk-owl-loading-orb-mint pointer-events-none absolute -right-28 bottom-24 h-80 w-80 rounded-full" />
      <section className="relative w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
          <div className="dk-owl-halo absolute h-36 w-36 rounded-full" />
          <div className="dk-owl-loading-dashed absolute h-40 w-40 rounded-full border-2 border-dashed" />
          <div className="dk-owl-ring absolute h-40 w-40 rounded-full border-2 border-transparent" />
          <img src="/datakwest-owl-3d.webp" alt="Datakwest owl preparing your learning space" width="768" height="768" className="dk-owl-loader relative z-10 h-32 w-32 object-contain drop-shadow-xl" />
        </div>
        <p className="dk-owl-loading-brand text-[11px] font-black uppercase tracking-[.22em]">DataKwest</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Your learning space is opening</h1>
        <p aria-live="polite" className="dk-owl-loading-message mt-3 text-sm font-semibold">{steps[step]}</p>
        <div className="dk-owl-loading-progress mx-auto mt-7 h-2 w-full max-w-xs overflow-hidden rounded-full"><div className="dk-owl-loading-progress-bar h-full rounded-full" style={{ width: `${Math.max(30, ((step + 1) / steps.length) * 100)}%` }} /></div>
        <p className="dk-owl-loading-subtle mt-4 text-xs">Your progress is safe while we get things ready.</p>
        {slow && <div className="dk-owl-loading-slow mt-5 rounded-2xl border p-4 text-left" role="status"><p className="dk-owl-loading-slow-title text-xs font-bold">This is taking longer than usual.</p><p className="dk-owl-loading-message mt-1 text-xs leading-5">Your answers are safe. You can retry the connection without losing your progress.</p><button type="button" onClick={() => onRetry ? onRetry() : window.location.reload()} className="dk-owl-loading-retry mt-3 min-h-10 rounded-xl px-4 py-2 text-xs font-black">Try again</button></div>}
      </section>
    </main>
  )
}
