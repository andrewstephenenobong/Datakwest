import { Link, useNavigate } from 'react-router-dom'

export default function RecoveryState({ type = 'error', onRetry }) {
  const navigate = useNavigate()
  const isNotFound = type === 'not-found'

  function handleBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#F6F8FC', color: '#0A2342' }}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="Return to Datakwest home">
            <img src="/datakwest_icon_bg3.png" alt="" className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
            <span className="text-sm font-black tracking-tight sm:text-base">DataKwest</span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8290A5' }}>Career Operating System</span>
        </header>

        <section className="flex flex-1 items-center justify-center py-16 sm:py-20">
          <div className="w-full max-w-2xl">
            <div className="mb-7 flex items-center gap-4 sm:mb-8 sm:gap-6">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl sm:h-28 sm:w-28" style={{ background: isNotFound ? '#FFF5D8' : '#EAF2FF' }}>
                <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full" style={{ background: isNotFound ? '#D4AF37' : '#8FB4E8' }} />
                <img src="/datakwest_icon_bg3.png" alt="Datakwest owl" className="h-14 w-14 object-contain sm:h-20 sm:w-20" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: '#9A7610' }}>{isNotFound ? 'Route not found' : 'Temporary interruption'}</p>
                <p className="mt-2 text-sm font-semibold" style={{ color: '#6B7A99' }}>{isNotFound ? 'The owl could not find this learning space.' : 'The owl hit a learning detour.'}</p>
              </div>
            </div>

            <div className="rounded-[2rem] border bg-white p-6 sm:p-10" style={{ borderColor: '#DCE5F0', boxShadow: '0 22px 70px rgba(10,35,66,0.10)' }}>
              <p className="text-6xl font-black tracking-[-0.06em] sm:text-8xl" style={{ color: '#0A2342' }}>{isNotFound ? '404' : 'Hmm'}</p>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">{isNotFound ? 'This page is not on the map.' : 'Something interrupted your learning path.'}</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 sm:text-base" style={{ color: '#6B7A99' }}>{isNotFound ? 'The link may be out of date, or this learning space may have moved. Let’s get you back to a useful place.' : 'Datakwest could not finish loading this page. Your progress is safe. Try again, or return to the workspace and continue from there.'}</p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold" style={{ background: '#0A2342', color: 'white' }}>Go to Datakwest home</Link>
                {!isNotFound && <button type="button" onClick={onRetry || (() => window.location.reload())} className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 px-5 py-3 text-sm font-bold" style={{ borderColor: '#D9E3EF', color: '#0A2342', background: 'white' }}>Try again</button>}
                <button type="button" onClick={handleBack} className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold" style={{ color: '#2456A6' }}>Go back</button>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 text-xs leading-5 sm:flex-row sm:items-center sm:justify-between" style={{ color: '#8290A5' }}>
              <span>{isNotFound ? 'Looking for your next skill? Start from the home page.' : 'If this keeps happening, return home and try the workspace again.'}</span>
              <Link to="/login" className="font-bold" style={{ color: '#2456A6' }}>Sign in</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
