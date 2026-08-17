import { Link } from 'react-router-dom'

export default function AuthShell({ eyebrow, title, subtitle, children, footer, alternateLabel, alternateLink, alternateText }) {
  return (
    <div className="auth-page app-page min-h-screen" style={{ background: 'var(--auth-page)', color: 'var(--auth-ink)' }}>
      <header className="auth-header flex min-w-0 items-center justify-between px-3 py-4 sm:px-10 sm:py-5">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Go to DataKwest home">
          <img src="/datakwest_logo_lockup.png" alt="DataKwest logo" className="auth-logo h-12 w-48 max-w-full object-contain object-left" />
          <div className="min-w-0">
            <p className="auth-wordmark text-sm font-black tracking-tight" style={{ color: 'var(--auth-ink)' }}>DATAKWEST</p>
            <p className="auth-tagline text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--auth-muted)' }}>Digital skills, one mission at a time</p>
          </div>
        </Link>
        <Link to="/" className="auth-explore-link hidden text-sm font-bold sm:block" style={{ color: 'var(--auth-link)' }}>Explore Datakwest</Link>
      </header>
      <main className="mx-auto grid min-w-0 w-full max-w-6xl gap-6 px-3 pb-10 pt-2 sm:gap-8 sm:px-6 sm:pb-12 sm:pt-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-10 lg:pt-10">
        <section className="auth-hero hidden min-w-0 rounded-[2rem] p-10 lg:block"><p className="auth-hero-eyebrow text-xs font-bold uppercase tracking-[0.22em]">Your digital skills journey</p><h1 className="mt-5 text-4xl font-bold leading-tight text-white">Learn what moves your life forward.</h1><p className="auth-hero-copy mt-5 text-sm leading-7">Datakwest gives you a practical path across the digital skills that matter—from first principles to portfolio-ready proof.</p><div className="mt-10 space-y-4"><div className="flex items-center gap-3"><span className="auth-hero-step auth-hero-step-gold">01</span><span className="text-sm font-bold text-white">Short lessons that build momentum</span></div><div className="flex items-center gap-3"><span className="auth-hero-step auth-hero-step-muted">02</span><span className="text-sm font-bold text-white">Projects that make skills visible</span></div><div className="flex items-center gap-3"><span className="auth-hero-step auth-hero-step-muted">03</span><span className="text-sm font-bold text-white">AI guidance when you get stuck</span></div></div></section>
        <section className="auth-card auth-surface mx-auto min-w-0 w-full max-w-xl rounded-[2rem] px-4 py-6 sm:p-10"><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--auth-eyebrow)' }}>{eyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-tight" style={{ color: 'var(--auth-ink)' }}>{title}</h2><p className="mt-3 text-sm leading-6" style={{ color: 'var(--auth-muted)' }}>{subtitle}</p></div>{children}{footer && <p className="auth-footer-copy mt-7 text-center text-sm">{footer}</p>}{alternateLabel && <p className="auth-footer-copy mt-3 text-center text-sm">{alternateLabel} <Link to={alternateLink} className="font-bold" style={{ color: 'var(--auth-ink)' }}>{alternateText}</Link></p>}</section>
      </main>
    </div>
  )
}
