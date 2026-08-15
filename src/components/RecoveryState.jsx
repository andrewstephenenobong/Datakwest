import { Link, useNavigate } from 'react-router-dom'

export default function RecoveryState({ type = 'error', onRetry }) {
  const navigate = useNavigate()
  const isNotFound = type === 'not-found'

  function handleBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  if (isNotFound) {
    return (
      <main className="min-h-screen overflow-x-hidden" style={{ background: '#0B1220', color: 'white' }}>
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-8 sm:py-7">
          <header className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2" aria-label="Return to Datakwest home">
              <img src="/datakwest_icon_1.png" alt="" className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
              <span className="text-sm font-black tracking-tight sm:text-base">DataKwest</span>
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#9AA8BB' }}>Career Operating System</span>
          </header>

          <section className="flex flex-1 items-center justify-center py-10 sm:py-14">
            <div className="w-full overflow-hidden rounded-[2rem] border" style={{ borderColor: 'rgba(255,255,255,0.12)', background: '#122945' }}>
              <div className="relative min-h-[430px] overflow-hidden px-5 py-10 sm:min-h-[520px] sm:px-12 sm:py-14">
                <div className="absolute inset-x-0 bottom-0 h-2/5" style={{ background: 'linear-gradient(180deg, rgba(36,86,166,0), rgba(36,86,166,0.42))' }} />
                <div className="absolute -bottom-24 -left-14 h-64 w-64 rounded-full" style={{ background: 'rgba(212,175,55,0.18)' }} />
                <div className="absolute -right-20 top-8 h-56 w-56 rounded-full" style={{ background: 'rgba(139,198,181,0.18)' }} />
                <div className="relative z-10 grid items-center gap-8 sm:grid-cols-[0.85fr_1.15fr] sm:gap-10">
                  <div>
                    <p className="text-[5rem] font-black leading-none tracking-[-0.08em] sm:text-[8rem]" style={{ color: '#D4AF37' }}>404</p>
                    <div className="relative mt-5 max-w-sm rounded-2xl bg-white px-5 py-4 text-[#0A2342] shadow-xl sm:mt-3 sm:px-6 sm:py-5">
                      <span className="absolute -bottom-3 left-8 h-6 w-6 rotate-45 bg-white" />
                      <p className="relative text-lg font-black leading-tight sm:text-2xl">This is not the learning space you’re looking for.</p>
                    </div>
                  </div>
                  <div className="relative flex min-h-[220px] items-center justify-center sm:min-h-[300px]">
                    <div className="absolute bottom-5 h-10 w-56 rounded-[50%] blur-sm" style={{ background: 'rgba(0,0,0,0.24)' }} />
                    <div className="absolute bottom-8 h-32 w-64 rounded-[50%]" style={{ background: 'rgba(139,198,181,0.22)' }} />
                    <img src="/datakwest_icon_1.png" alt="Datakwest owl" className="relative z-10 h-48 w-48 object-contain drop-shadow-2xl sm:h-64 sm:w-64" />
                    <span className="absolute right-1/4 top-4 h-3 w-3 rounded-full" style={{ background: '#D4AF37' }} />
                    <span className="absolute left-1/4 top-12 h-2 w-2 rounded-full" style={{ background: '#8BC6B5' }} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 border-t px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-12" style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#0E1E32' }}>
                <p className="text-xs leading-5" style={{ color: '#9AA8BB' }}>The link may be out of date, or this learning space may have moved.</p>
                <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
                  <button type="button" onClick={handleBack} style={{ color: '#8FB4E8' }}>Go back</button>
                  <Link to="/" className="rounded-xl px-4 py-2.5" style={{ background: '#D4AF37', color: '#0A2342' }}>Return home</Link>
                </div>
              </div>
            </div>
          </section>
          <footer className="flex items-center justify-between text-xs" style={{ color: '#6E7D91' }}><span>Lost? Start with a skill and build from there.</span><Link to="/login" className="font-bold" style={{ color: '#8FB4E8' }}>Sign in</Link></footer>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#F6F8FC', color: '#0A2342' }}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between"><Link to="/" className="inline-flex items-center gap-2" aria-label="Return to Datakwest home"><img src="/datakwest_icon_1.png" alt="" className="h-9 w-9 object-contain sm:h-10 sm:w-10" /><span className="text-sm font-black tracking-tight sm:text-base">DataKwest</span></Link><span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8290A5' }}>Career Operating System</span></header>
        <section className="flex flex-1 items-center justify-center py-16 sm:py-20"><div className="w-full max-w-2xl"><div className="mb-7 flex items-center gap-4 sm:mb-8 sm:gap-6"><div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl sm:h-28 sm:w-28" style={{ background: '#EAF2FF' }}><div className="absolute -right-2 -top-2 h-4 w-4 rounded-full" style={{ background: '#8FB4E8' }} /><img src="/datakwest_icon_1.png" alt="Datakwest owl" className="h-14 w-14 object-contain sm:h-20 sm:w-20" /></div><div><p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: '#9A7610' }}>Temporary interruption</p><p className="mt-2 text-sm font-semibold" style={{ color: '#6B7A99' }}>The owl hit a learning detour.</p></div></div><div className="rounded-[2rem] border bg-white p-6 sm:p-10" style={{ borderColor: '#DCE5F0', boxShadow: '0 22px 70px rgba(10,35,66,0.10)' }}><p className="text-5xl font-black tracking-[-0.06em] sm:text-7xl" style={{ color: '#0A2342' }}>Hmm</p><h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Something interrupted your learning path.</h1><p className="mt-4 max-w-xl text-sm leading-7 sm:text-base" style={{ color: '#6B7A99' }}>Datakwest could not finish loading this page. Your progress is safe. Try again, or return to the workspace and continue from there.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold" style={{ background: '#0A2342', color: 'white' }}>Go to Datakwest home</Link><button type="button" onClick={onRetry || (() => window.location.reload())} className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 px-5 py-3 text-sm font-bold" style={{ borderColor: '#D9E3EF', color: '#0A2342', background: 'white' }}>Try again</button><button type="button" onClick={handleBack} className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold" style={{ color: '#2456A6' }}>Go back</button></div></div></div></section>
        <footer className="flex flex-col gap-2 text-xs leading-5 sm:flex-row sm:items-center sm:justify-between" style={{ color: '#8290A5' }}><span>If this keeps happening, return home and try the workspace again.</span><Link to="/login" className="font-bold" style={{ color: '#2456A6' }}>Sign in</Link></footer>
      </div>
    </main>
  )
}
