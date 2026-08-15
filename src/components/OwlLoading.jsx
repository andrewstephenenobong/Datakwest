import { useEffect, useState } from 'react'

export default function OwlLoading({ message = 'Preparing your learning space…' }) {
  const [step, setStep] = useState(0)
  const steps = [message, 'Checking your learning path…', 'Getting your next step ready…']

  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => (current + 1) % steps.length), 1900)
    return () => window.clearInterval(timer)
  }, [steps.length])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10" style={{ background: 'linear-gradient(145deg, #F7FAFF 0%, #EEF4FB 58%, #E6F3F0 100%)', color: '#0A2342' }}>
      <style>{`@keyframes dkOwlFloat { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(2deg); } } @keyframes dkOwlPulse { 0%,100% { transform: scale(.86); opacity:.26; } 50% { transform: scale(1.08); opacity:.48; } } @keyframes dkOwlSpin { to { transform: rotate(360deg); } } .dk-owl-loader { animation: dkOwlFloat 3.6s ease-in-out infinite; } .dk-owl-halo { animation: dkOwlPulse 2.4s ease-in-out infinite; } .dk-owl-ring { animation: dkOwlSpin 1.8s linear infinite; } @media (prefers-reduced-motion: reduce) { .dk-owl-loader, .dk-owl-halo, .dk-owl-ring { animation: none; } }`}</style>
      <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full" style={{ background: 'rgba(212,175,55,.14)' }} />
      <div className="pointer-events-none absolute -right-28 bottom-24 h-80 w-80 rounded-full" style={{ background: 'rgba(139,198,181,.22)' }} />
      <section className="relative w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
          <div className="dk-owl-halo absolute h-36 w-36 rounded-full" style={{ background: '#8BC6B5' }} />
          <div className="absolute h-40 w-40 rounded-full border-2 border-dashed" style={{ borderColor: 'rgba(36,86,166,.22)' }} />
          <div className="dk-owl-ring absolute h-40 w-40 rounded-full border-2 border-transparent" style={{ borderTopColor: '#D4AF37', borderRightColor: 'rgba(212,175,55,.25)' }} />
          <img src="/datakwest-owl-3d.webp" alt="Datakwest owl preparing your learning space" width="768" height="768" className="dk-owl-loader relative z-10 h-32 w-32 object-contain drop-shadow-xl" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[.22em]" style={{ color: '#8A6E13' }}>DataKwest</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Your learning space is opening</h1>
        <p aria-live="polite" className="mt-3 text-sm font-semibold" style={{ color: '#6B7A99' }}>{steps[step]}</p>
        <div className="mx-auto mt-7 h-2 w-full max-w-xs overflow-hidden rounded-full" style={{ background: 'rgba(36,86,166,.12)' }}><div className="h-full rounded-full" style={{ width: `${Math.max(30, ((step + 1) / steps.length) * 100)}%`, background: 'linear-gradient(90deg, #2456A6, #8BC6B5)' }} /></div>
        <p className="mt-4 text-xs" style={{ color: '#8290A5' }}>Your progress is safe while we get things ready.</p>
      </section>
    </main>
  )
}
