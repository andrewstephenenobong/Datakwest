import { lazy, Suspense, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import NotFound from './pages/NotFound'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Lesson = lazy(() => import('./pages/Lesson'))
const Quiz = lazy(() => import('./pages/Quiz'))
const Remediate = lazy(() => import('./pages/Remediate'))
const Tracks = lazy(() => import('./pages/Tracks'))
const TrackOverview = lazy(() => import('./pages/TrackOverview'))
const TrackLesson = lazy(() => import('./pages/TrackLesson'))
const Project = lazy(() => import('./pages/Project'))
const Tutor = lazy(() => import('./pages/Tutor'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Notifications = lazy(() => import('./pages/Notifications'))
const SkillTree = lazy(() => import('./pages/SkillTree'))
const Assessments = lazy(() => import('./pages/Assessments'))
const Challenges = lazy(() => import('./pages/Challenges'))
const Practice = lazy(() => import('./pages/Practice'))
const Community = lazy(() => import('./pages/Community'))
const PeerReview = lazy(() => import('./pages/PeerReview'))
const SkillBattles = lazy(() => import('./pages/SkillBattles'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const LiveChallenges = lazy(() => import('./pages/LiveChallenges'))
const AdminGovernance = lazy(() => import('./pages/AdminGovernance'))
const Interviews = lazy(() => import('./pages/Interviews'))
const CareerCentre = lazy(() => import('./pages/CareerCentre'))

function RouteLoading() {
  const [slow, setSlow] = useState(false)
  const [step, setStep] = useState(0)
  const steps = ['Warming up your workspace', 'Checking your learning path', 'Setting up your next challenge']

  useEffect(() => {
    const stepTimer = window.setInterval(() => setStep((current) => (current + 1) % steps.length), 1800)
    const slowTimer = window.setTimeout(() => setSlow(true), 7000)
    return () => {
      window.clearInterval(stepTimer)
      window.clearTimeout(slowTimer)
    }
  }, [steps.length])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10" style={{ background: 'linear-gradient(145deg, #F7FAFF 0%, #EEF4FB 58%, #E6F3F0 100%)', color: '#0A2342' }}>
      <style>{`@keyframes dkLoaderFloat { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(2deg); } } @keyframes dkLoaderPulse { 0%,100% { transform: scale(.86); opacity:.26; } 50% { transform: scale(1.08); opacity:.48; } } @keyframes dkLoaderSpin { to { transform: rotate(360deg); } } .dk-loader-owl { animation: dkLoaderFloat 3.6s ease-in-out infinite; } .dk-loader-halo { animation: dkLoaderPulse 2.4s ease-in-out infinite; } .dk-loader-ring { animation: dkLoaderSpin 1.8s linear infinite; } @media (prefers-reduced-motion: reduce) { .dk-loader-owl, .dk-loader-halo, .dk-loader-ring { animation: none; } }`}</style>
      <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full" style={{ background: 'rgba(212,175,55,.14)' }} />
      <div className="pointer-events-none absolute -right-28 bottom-24 h-80 w-80 rounded-full" style={{ background: 'rgba(139,198,181,.22)' }} />
      <section className="relative w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
          <div className="dk-loader-halo absolute h-36 w-36 rounded-full" style={{ background: '#8BC6B5' }} />
          <div className="absolute h-40 w-40 rounded-full border-2 border-dashed" style={{ borderColor: 'rgba(36,86,166,.22)' }} />
          <div className="dk-loader-ring absolute h-40 w-40 rounded-full border-2 border-transparent" style={{ borderTopColor: '#D4AF37', borderRightColor: 'rgba(212,175,55,.25)' }} />
          <img src="/datakwest-owl-3d.webp" alt="Datakwest owl preparing your learning space" width="768" height="768" className="dk-loader-owl relative z-10 h-32 w-32 object-contain drop-shadow-xl" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[.22em]" style={{ color: '#8A6E13' }}>DataKwest</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Preparing your learning space</h1>
        <p aria-live="polite" className="mt-3 text-sm font-semibold" style={{ color: '#6B7A99' }}>{steps[step]}…</p>
        <div className="mx-auto mt-7 h-2 w-full max-w-xs overflow-hidden rounded-full" style={{ background: 'rgba(36,86,166,.12)' }}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(28, ((step + 1) / steps.length) * 100)}%`, background: 'linear-gradient(90deg, #2456A6, #8BC6B5)' }} /></div>
        <p className="mt-4 text-xs" style={{ color: '#8290A5' }}>Your progress is safe while we get things ready.</p>
        {slow && <div className="mx-auto mt-6 max-w-sm rounded-2xl border bg-white/80 p-4 text-left shadow-sm" style={{ borderColor: '#DCE5F0' }}><p className="text-sm font-bold" style={{ color: '#0A2342' }}>This is taking longer than usual.</p><p className="mt-1 text-xs leading-5" style={{ color: '#6B7A99' }}>You can retry the connection or continue waiting. Nothing has been changed on your account.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-10 rounded-xl px-4 py-2 text-xs font-black" style={{ background: '#0A2342', color: 'white' }}>Retry connection</button></div>}
      </section>
    </main>
  )
}

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/lesson/:id" element={<Protected><Lesson /></Protected>} />
        <Route path="/quiz/:id" element={<Protected><Quiz /></Protected>} />
        <Route path="/remediate/:id" element={<Protected><Remediate /></Protected>} />
        <Route path="/tracks" element={<Protected><Tracks /></Protected>} />
        <Route path="/tracks/:skill" element={<Protected><TrackOverview /></Protected>} />
        <Route path="/tracks/:skill/phase/:phaseNumber" element={<Protected><TrackLesson /></Protected>} />
        <Route path="/project" element={<Protected><Project /></Protected>} />
        <Route path="/tutor" element={<Protected><Tutor /></Protected>} />
        <Route path="/portfolio" element={<Protected><Portfolio /></Protected>} />
        <Route path="/achievements" element={<Protected><Achievements /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/skill-tree" element={<Protected><SkillTree /></Protected>} />
        <Route path="/assessments" element={<Protected><Assessments /></Protected>} />
        <Route path="/challenges" element={<Protected><Challenges /></Protected>} />
        <Route path="/practice" element={<Protected><Practice /></Protected>} />
        <Route path="/community" element={<Protected><Community /></Protected>} />
        <Route path="/peer-review" element={<Protected><PeerReview /></Protected>} />
        <Route path="/skill-battles" element={<Protected><SkillBattles /></Protected>} />
        <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
        <Route path="/live-challenges" element={<Protected><LiveChallenges /></Protected>} />
        <Route path="/admin/governance" element={<Protected><AdminGovernance /></Protected>} />
        <Route path="/interviews" element={<Protected><Interviews /></Protected>} />
        <Route path="/career-centre" element={<Protected><CareerCentre /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
