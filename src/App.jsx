import { lazy, Suspense } from 'react'
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
  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: '#F6F8FC' }}>
      <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-sm font-bold" style={{ borderColor: '#DCE5F0', color: '#0A2342' }}>
        <span className="h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} role="status" aria-label="Loading" />
        Preparing your learning space…
      </div>
    </div>
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
