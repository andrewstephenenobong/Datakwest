# Repository inventory

## Pages
src/pages/Achievements.jsx
src/pages/AdminGovernance.jsx
src/pages/Assessments.jsx
src/pages/CareerCentre.jsx
src/pages/Challenges.jsx
src/pages/Community.jsx
src/pages/Dashboard.jsx
src/pages/ForgotPassword.jsx
src/pages/Interviews.jsx
src/pages/Landing.jsx
src/pages/Lesson.jsx
src/pages/LiveChallenges.jsx
src/pages/Login.jsx
src/pages/Marketplace.jsx
src/pages/NotFound.jsx
src/pages/Notifications.jsx
src/pages/Onboarding.jsx
src/pages/PeerReview.jsx
src/pages/Playground.jsx
src/pages/PlaygroundGame.jsx
src/pages/Portfolio.jsx
src/pages/Practice.jsx
src/pages/Profile.jsx
src/pages/Project.jsx
src/pages/Quiz.jsx
src/pages/Remediate.jsx
src/pages/ResetPassword.jsx
src/pages/Settings.jsx
src/pages/Signup.jsx
src/pages/SkillBattles.jsx
src/pages/SkillTree.jsx
src/pages/TrackLesson.jsx
src/pages/TrackOverview.jsx
src/pages/Tracks.jsx
src/pages/Tutor.jsx

## Components
src/components/AuthShell.jsx
src/components/CaptchaField.jsx
src/components/DiagramRenderer.jsx
src/components/ErrorBoundary.jsx
src/components/LearnerNavigation.jsx
src/components/Navbar.jsx
src/components/NetworkStatusBanner.jsx
src/components/OwlLoading.jsx
src/components/PasswordField.jsx
src/components/PlaygroundLudoOnlineMatch.jsx
src/components/PlaygroundOnlineMatch.jsx
src/components/PlaygroundOnlinePanel.jsx
src/components/PlaygroundRankings.jsx
src/components/PlaygroundSnakeLadderOnlineMatch.jsx
src/components/PlaygroundSpectatorPanel.jsx
src/components/PlaygroundWhotOnlineMatch.jsx
src/components/ProtectedRoute.jsx
src/components/RecoveryState.jsx
src/components/playground/GameComponents.jsx

## Route references
src/App.jsx:2:import { Route, Routes } from 'react-router-dom'
src/App.jsx:53:    <Suspense fallback={<RouteLoading />}>
src/App.jsx:57:      <Routes>
src/App.jsx:58:        <Route path="/" element={<Landing />} />
src/App.jsx:59:        <Route path="/login" element={<Login />} />
src/App.jsx:60:        <Route path="/signup" element={<Signup />} />
src/App.jsx:61:        <Route path="/forgot-password" element={<ForgotPassword />} />
src/App.jsx:62:        <Route path="/reset-password" element={<ResetPassword />} />
src/App.jsx:63:        <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
src/App.jsx:64:        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
src/App.jsx:65:        <Route path="/lesson/:id" element={<Protected><Lesson /></Protected>} />
src/App.jsx:66:        <Route path="/quiz/:id" element={<Protected><Quiz /></Protected>} />
src/App.jsx:67:        <Route path="/remediate/:id" element={<Protected><Remediate /></Protected>} />
src/App.jsx:68:        <Route path="/tracks" element={<Protected><Tracks /></Protected>} />
src/App.jsx:69:        <Route path="/tracks/:skill" element={<Protected><TrackOverview /></Protected>} />
src/App.jsx:70:        <Route path="/tracks/:skill/phase/:phaseNumber" element={<Protected><TrackLesson /></Protected>} />
src/App.jsx:71:        <Route path="/project" element={<Protected><Project /></Protected>} />
src/App.jsx:72:        <Route path="/tutor" element={<Protected><Tutor /></Protected>} />
src/App.jsx:73:        <Route path="/portfolio" element={<Protected><Portfolio /></Protected>} />
src/App.jsx:74:        <Route path="/achievements" element={<Protected><Achievements /></Protected>} />
src/App.jsx:75:        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
src/App.jsx:76:        <Route path="/skill-tree" element={<Protected><SkillTree /></Protected>} />
src/App.jsx:77:        <Route path="/assessments" element={<Protected><Assessments /></Protected>} />
src/App.jsx:78:        <Route path="/challenges" element={<Protected><Challenges /></Protected>} />
src/App.jsx:79:        <Route path="/practice" element={<Protected><Practice /></Protected>} />
src/App.jsx:80:        <Route path="/community" element={<Protected><Community /></Protected>} />
src/App.jsx:81:        <Route path="/peer-review" element={<Protected><PeerReview /></Protected>} />
src/App.jsx:82:        <Route path="/skill-battles" element={<Protected><SkillBattles /></Protected>} />
src/App.jsx:83:        <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
src/App.jsx:84:        <Route path="/live-challenges" element={<Protected><LiveChallenges /></Protected>} />
src/App.jsx:85:        <Route path="/admin/governance" element={<Protected><AdminGovernance /></Protected>} />
src/App.jsx:86:        <Route path="/interviews" element={<Protected><Interviews /></Protected>} />
src/App.jsx:87:        <Route path="/career-centre" element={<Protected><CareerCentre /></Protected>} />
src/App.jsx:88:        <Route path="/playground" element={<Protected><Playground /></Protected>} />
src/App.jsx:89:        <Route path="/playground/:game" element={<Protected><PlaygroundGame /></Protected>} />
src/App.jsx:90:        <Route path="/settings" element={<Protected><Settings /></Protected>} />
src/App.jsx:91:        <Route path="/profile" element={<Protected><Profile /></Protected>} />
src/App.jsx:92:        <Route path="*" element={<NotFound />} />
src/App.jsx:93:      </Routes>
src/main.jsx:3:import { BrowserRouter } from 'react-router-dom'
src/main.jsx:13:      <BrowserRouter>
src/main.jsx:19:      </BrowserRouter>

## Tests
./backend/supabase/migrations/0065_playground_spectator_mode.sql
./coverage/test-coverage.txt
./ops/pwa-live-test-evidence.txt
./ops/security-qa-tests.txt
./src/features/playground/games/connectFour.test.js
./tests/config.test.mjs
./tests/migrations.test.mjs

## Theme references
src/App.css:75:  border-top: 1px solid var(--border);
src/App.css:99:  border-right: 1px solid var(--border);
src/App.css:103:    border-bottom: 1px solid var(--border);
src/App.css:119:    color: var(--text-h);
src/App.css:158:  border-top: 1px solid var(--border);
src/App.css:178:    border-left-color: var(--border);
src/App.css:182:    border-right-color: var(--border);
src/components/playground/GameComponents.jsx:133:  const [theme, setTheme] = useState(() => window.localStorage.getItem('dk_ladder_theme') || 'canopy'); const [turn, setTurn] = useState('you'); const [die, setDie] = useState(null); const [rolling, setRolling] = useState(false); const [celebration, setCelebration] = useState(false); const [notice, setNotice] = useState('Climb the bright rungs, dodge the snakes, and reach 100.'); const winner = positions.you >= 100 ? 'you' : positions.owl >= 100 ? 'owl' : null
src/components/playground/GameComponents.jsx:136:  const chooseTheme = (nextTheme) => { setTheme(nextTheme); window.localStorage.setItem('dk_ladder_theme', nextTheme) }
src/context/ThemeContext.jsx:34:  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
src/context/ThemeContext.jsx:66:    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
src/index.css:71::root[data-theme='dark'] {
src/index.css:92:html[data-theme='dark'],
src/index.css:93:html[data-theme='dark'] body {
src/index.css:98:html[data-theme='dark'] .bg-white {
src/index.css:102:html[data-theme='dark'] input,
src/index.css:103:html[data-theme='dark'] select,
src/index.css:104:html[data-theme='dark'] textarea {
src/index.css:110:html[data-theme='dark'] input::placeholder,
src/index.css:111:html[data-theme='dark'] textarea::placeholder {
src/index.css:115:html[data-theme='dark'] .text-gray-500,
src/index.css:116:html[data-theme='dark'] .text-gray-600,
src/index.css:117:html[data-theme='dark'] .text-slate-500,
src/index.css:118:html[data-theme='dark'] .text-slate-600 {
src/index.css:122:html[data-theme='dark'] a:not([style*='color']) {
src/index.css:126:@media (prefers-color-scheme: dark) {
src/index.css:127:  :root[data-theme='system'] { color-scheme: dark; }
src/index.css:155:html[data-theme='dark'] .landing-page {
src/index.css:180:html[data-theme='dark'] .landing-page .bg-white\/95 {
src/index.css:184:html[data-theme='dark'] .landing-page .text-white {
src/index.css:245:html[data-theme='dark'] .landing-page .bg-white {
src/index.css:249:html[data-theme='dark'] .landing-page .bg-white\/95 {
src/index.css:265:html[data-theme='dark'] .landing-page .landing-lockup-light {
src/index.css:269:html[data-theme='dark'] .landing-page .landing-lockup-dark {
src/index.css:302:html[data-theme='dark'] {
src/index.css:402:html[data-theme='dark'] .onboarding-page {
src/index.css:481:html[data-theme='dark'] .onboarding-page {
src/index.css:491:html[data-theme='dark'] .onboarding-page > header [style*='#0A2342'],
src/index.css:492:html[data-theme='dark'] .onboarding-page > header [style*='#8391A7'],
src/index.css:493:html[data-theme='dark'] .onboarding-page main section [style*='#0A2342'],
src/index.css:494:html[data-theme='dark'] .onboarding-page main section [style*='#6B7A99'],
src/index.css:495:html[data-theme='dark'] .onboarding-page main section [style*='#8290A5'],
src/index.css:496:html[data-theme='dark'] .onboarding-page main section [style*='#7B8AA0'],
src/index.css:497:html[data-theme='dark'] .onboarding-page main section [style*='#8A98AA'] {
src/index.css:501:html[data-theme='dark'] .onboarding-page main section [style*='#6B7A99'],
src/index.css:502:html[data-theme='dark'] .onboarding-page main section [style*='#8290A5'],
src/index.css:503:html[data-theme='dark'] .onboarding-page main section [style*='#7B8AA0'],
src/index.css:504:html[data-theme='dark'] .onboarding-page main section [style*='#8A98AA'] {
src/index.css:508:html[data-theme='dark'] .onboarding-page main section > div[data-onboarding-step],
src/index.css:509:html[data-theme='dark'] .onboarding-page main section [style*='background: white'] {
src/index.css:513:html[data-theme='dark'] .onboarding-page main section [style*='#FBFCFE'],
src/index.css:514:html[data-theme='dark'] .onboarding-page main section [style*='#FCFDFE'],
src/index.css:515:html[data-theme='dark'] .onboarding-page main section [style*='#F7F9FC'] {
src/index.css:519:html[data-theme='dark'] .onboarding-page main section [style*='#FFF9E8'],
src/index.css:520:html[data-theme='dark'] .onboarding-page main section [style*='#FFF5D8'] {
src/index.css:524:html[data-theme='dark'] .onboarding-page main section [style*='#E6ECF4'],
src/index.css:525:html[data-theme='dark'] .onboarding-page main section [style*='#E2EAF3'],
src/index.css:526:html[data-theme='dark'] .onboarding-page main section [style*='#D8E1EC'],
src/index.css:527:html[data-theme='dark'] .onboarding-page main section [style*='#EDF1F6'] {
src/index.css:531:html[data-theme='dark'] .onboarding-page main section [style*='#EAF0F7'],
src/index.css:532:html[data-theme='dark'] .onboarding-page main section [style*='#EEF3FA'] {
src/index.css:537:html[data-theme='dark'] .onboarding-page main section [style*='#E1E8F1'] {
src/index.css:541:html[data-theme='dark'] .onboarding-page main section [style*='#967414'],
src/index.css:542:html[data-theme='dark'] .onboarding-page main section [style*='#9A7610'] {
src/index.css:546:html[data-theme='dark'] .onboarding-page main section input {
src/index.css:552:html[data-theme='dark'] .onboarding-page .onboarding-question-card {
src/index.css:557:html[data-theme='dark'] .onboarding-page .onboarding-answer-option {
src/index.css:563:html[data-theme='dark'] .onboarding-page .onboarding-answer-option[aria-selected='true'],
src/index.css:564:html[data-theme='dark'] .onboarding-page .onboarding-answer-option[aria-checked='true'] {
src/index.css:570:html[data-theme='dark'] .onboarding-page .onboarding-answer-option .onboarding-answer-icon {
src/index.css:575:html[data-theme='dark'] .onboarding-page .onboarding-answer-option[aria-selected='true'] .onboarding-answer-icon,
src/index.css:576:html[data-theme='dark'] .onboarding-page .onboarding-answer-option[aria-checked='true'] .onboarding-answer-icon {
src/index.css:589:html[data-theme='dark'] .onboarding-page .onboarding-header-wordmark,
src/index.css:590:html[data-theme='dark'] .onboarding-page .onboarding-step-heading {
src/index.css:594:html[data-theme='dark'] .onboarding-page .onboarding-header-tagline,
src/index.css:595:html[data-theme='dark'] .onboarding-page .onboarding-header-meta,
src/index.css:596:html[data-theme='dark'] .onboarding-page .onboarding-step-helper {
src/index.css:600:html[data-theme='dark'] .onboarding-page .onboarding-step-heading {
src/index.css:665:html[data-theme='dark'] main [style*='color: #0A2342'],
src/index.css:666:html[data-theme='dark'] main [style*="color: '#0A2342'"] {
src/index.css:670:html[data-theme='dark'] main [style*='color: #6B7A99'],
src/index.css:671:html[data-theme='dark'] main [style*="color: '#6B7A99'"],
src/index.css:672:html[data-theme='dark'] main [style*='color: #8290A5'],
src/index.css:673:html[data-theme='dark'] main [style*="color: '#8290A5'"],
src/index.css:674:html[data-theme='dark'] main [style*='color: #7B8AA0'],
src/index.css:675:html[data-theme='dark'] main [style*="color: '#7B8AA0'"],
src/index.css:676:html[data-theme='dark'] main [style*='color: #8A98AA'],
src/index.css:677:html[data-theme='dark'] main [style*="color: '#8A98AA'"] {
src/index.css:681:html[data-theme='dark'] main [style*='background: white'],
src/index.css:682:html[data-theme='dark'] main [style*="background: 'white'"],
src/index.css:683:html[data-theme='dark'] main [style*='background: #FBFCFE'],
src/index.css:684:html[data-theme='dark'] main [style*="background: '#FBFCFE'"],
src/index.css:685:html[data-theme='dark'] main [style*='background: #FCFDFE'],
src/index.css:686:html[data-theme='dark'] main [style*="background: '#FCFDFE'"],
src/index.css:687:html[data-theme='dark'] main [style*='background: #F7F9FC'],
src/index.css:688:html[data-theme='dark'] main [style*="background: '#F7F9FC'"] {
src/index.css:692:html[data-theme='dark'] main [style*='borderColor: #E6ECF4'],
src/index.css:693:html[data-theme='dark'] main [style*="borderColor: '#E6ECF4'"],
src/index.css:694:html[data-theme='dark'] main [style*='borderColor: #E2EAF3'],
src/index.css:695:html[data-theme='dark'] main [style*="borderColor: '#E2EAF3'"],
src/index.css:696:html[data-theme='dark'] main [style*='borderColor: #D8E1EC'],
src/index.css:697:html[data-theme='dark'] main [style*="borderColor: '#D8E1EC'"] {
src/index.css:701:html[data-theme='dark'] .bg-white\/95 {
src/index.css:725:html[data-theme='dark'] .learner-nav-item[aria-current='page'],
src/index.css:726:html[data-theme='dark'] .learner-nav-item[style*='#E8F0FE'] {
src/index.css:731:html:not([data-theme='dark']) .learner-nav-item[aria-current='page'],
src/index.css:732:html:not([data-theme='dark']) .learner-nav-item[style*='#E8F0FE'] {
src/index.css:742:html[data-theme='dark'] .learner-more-menu [style*='#0A2342'],
src/index.css:743:html[data-theme='dark'] .learner-more-menu [style*="color: '#0A2342'"] {
src/index.css:747:html[data-theme='dark'] .learner-more-menu [style*='#F5F7FA'],
src/index.css:748:html[data-theme='dark'] .learner-more-menu [style*="background: '#F5F7FA'"] {
src/index.css:752:html[data-theme='dark'] .learner-more-menu input {
src/index.css:758:html[data-theme='dark'] .learner-more-menu button[style*='background: white'],
src/index.css:759:html[data-theme='dark'] .learner-more-menu button[style*="background: 'white'"] {
src/index.css:763:html[data-theme='dark'] .learner-more-menu button:hover {
src/index.css:805:html[data-theme='dark'] .auth-hero {
src/index.css:810:html[data-theme='dark'] .auth-surface {
src/index.css:829:html[data-theme='dark'] [style*='background: #F5F7FA'],
src/index.css:830:html[data-theme='dark'] [style*="background: '#F5F7FA'"],
src/index.css:831:html[data-theme='dark'] [style*='background: #F7FAFF'],
src/index.css:832:html[data-theme='dark'] [style*="background: '#F7FAFF'"],
src/index.css:833:html[data-theme='dark'] [style*='background: #F8FAFD'],
src/index.css:834:html[data-theme='dark'] [style*="background: '#F8FAFD'"],
src/index.css:835:html[data-theme='dark'] [style*='background: #FBFCFE'],
src/index.css:836:html[data-theme='dark'] [style*="background: '#FBFCFE'"],
src/index.css:837:html[data-theme='dark'] [style*='background: #FFFFFF'],
src/index.css:838:html[data-theme='dark'] [style*="background: '#FFFFFF'"] {
src/index.css:842:html[data-theme='dark'] [style*='borderColor: #DCE5F0'],
src/index.css:843:html[data-theme='dark'] [style*="borderColor: '#DCE5F0'"],
src/index.css:844:html[data-theme='dark'] [style*='borderColor: #E7EDF4'],
src/index.css:845:html[data-theme='dark'] [style*="borderColor: '#E7EDF4'"],
src/index.css:846:html[data-theme='dark'] [style*='borderColor: #EDF1F6'],
src/index.css:847:html[data-theme='dark'] [style*="borderColor: '#EDF1F6'"] {
src/index.css:851:html[data-theme='dark'] [style*='color: #0A2342'],
src/index.css:852:html[data-theme='dark'] [style*="color: '#0A2342'"],
src/index.css:853:html[data-theme='dark'] [style*='color: #1D3557'],
src/index.css:854:html[data-theme='dark'] [style*="color: '#1D3557'"] {
src/index.css:858:html[data-theme='dark'] [style*='color: #6B7A99'],
src/index.css:859:html[data-theme='dark'] [style*="color: '#6B7A99'"],
src/index.css:860:html[data-theme='dark'] [style*='color: #8290A5'],
src/index.css:861:html[data-theme='dark'] [style*="color: '#8290A5'"],
src/index.css:862:html[data-theme='dark'] [style*='color: #8A98AA'],
src/index.css:863:html[data-theme='dark'] [style*="color: '#8A98AA'"] {
src/index.css:868:html[data-theme='dark'] [style*='background: #FEE2E2'],
src/index.css:869:html[data-theme='dark'] [style*="background: '#FEE2E2'"] {
src/index.css:873:html[data-theme='dark'] [style*='background: #E8F5E9'],
src/index.css:874:html[data-theme='dark'] [style*="background: '#E8F5E9'"] {
src/index.css:878:html[data-theme='dark'] [style*='background: #FFF9E8'],
src/index.css:879:html[data-theme='dark'] [style*="background: '#FFF9E8'"],
src/index.css:880:html[data-theme='dark'] [style*='background: #FFFBEF'],
src/index.css:881:html[data-theme='dark'] [style*="background: '#FFFBEF'"] {
src/index.css:885:html[data-theme='dark'] [style*='background: #E8F0FE'],
src/index.css:886:html[data-theme='dark'] [style*="background: '#E8F0FE'"] {
src/index.css:890:html[data-theme='dark'] [style*='borderColor: #E2E8F0'],
src/index.css:891:html[data-theme='dark'] [style*="borderColor: '#E2E8F0'"],
src/index.css:892:html[data-theme='dark'] [style*='borderColor: #E2EAF3'],
src/index.css:893:html[data-theme='dark'] [style*="borderColor: '#E2EAF3'"],
src/index.css:894:html[data-theme='dark'] [style*='borderColor: #DCE5F0'],
src/index.css:895:html[data-theme='dark'] [style*="borderColor: '#DCE5F0'"] {
src/index.css:899:html[data-theme='dark'] [style*='color: #991B1B'],
src/index.css:900:html[data-theme='dark'] [style*="color: '#991B1B'"] {
src/index.css:904:html[data-theme='dark'] [style*='color: #2E7D32'],
src/index.css:905:html[data-theme='dark'] [style*="color: '#2E7D32'"] {
src/index.css:933:html[data-theme='dark'] .app-navbar-profile [style*='#E8F0FE'],
src/index.css:934:html[data-theme='dark'] .app-navbar-profile [style*="background: '#E8F0FE'"] {
src/index.css:938:html[data-theme='dark'] .app-navbar-profile [style*='#6B7A99'],
src/index.css:939:html[data-theme='dark'] .app-navbar-profile [style*="color: '#6B7A99'"] {
src/index.css:944:html[data-theme='dark'] [style*='linear-gradient(145deg, #F7FAFF'],
src/index.css:945:html[data-theme='dark'] [style*="linear-gradient(145deg, '#F7FAFF'"] {
src/index.css:949:html[data-theme='dark'] [style*='radial-gradient(circle, rgba(139,198,181'],
src/index.css:950:html[data-theme='dark'] [style*="radial-gradient(circle, 'rgba(139,198,181'"] {
src/index.css:954:html[data-theme='dark'] [style*='background: #EEF8F4'],
src/index.css:955:html[data-theme='dark'] [style*="background: '#EEF8F4'"] {
src/index.css:959:html[data-theme='dark'] [style*='background: #F5F7FA'],
src/index.css:960:html[data-theme='dark'] [style*="background: '#F5F7FA'"] {
src/index.css:965:html[data-theme='dark'] [style*='background: #F6F8FC'],
src/index.css:966:html[data-theme='dark'] [style*="background: '#F6F8FC'"] {
src/index.css:970:html[data-theme='dark'] [style*='background: #F4F7FB'],
src/index.css:971:html[data-theme='dark'] [style*="background: '#F4F7FB'"] {
src/index.css:975:html[data-theme='dark'] [style*='background: #EEF6F1'],
src/index.css:976:html[data-theme='dark'] [style*="background: '#EEF6F1'"] {
src/index.css:980:html[data-theme='dark'] [style*='background: #EEF3FA'],
src/index.css:981:html[data-theme='dark'] [style*="background: '#EEF3FA'"] {
src/index.css:985:html[data-theme='dark'] [style*='#E2EAF3'],
src/index.css:986:html[data-theme='dark'] [style*='#DCE5F0'],
src/index.css:987:html[data-theme='dark'] [style*='#E6ECF4'] {
src/index.css:991:html[data-theme='dark'] [style*='color: #8290A5'],
src/index.css:992:html[data-theme='dark'] [style*="color: '#8290A5'"],
src/index.css:993:html[data-theme='dark'] [style*='color: #6F858B'],
src/index.css:994:html[data-theme='dark'] [style*="color: '#6F858B'"] {
src/index.css:1085:html[data-theme='dark'] .app-navbar-logo {
src/index.css:1336:@media (prefers-color-scheme: dark) {
src/index.css:1344:html[data-theme='dark'] .dashboard-primary-heading,
src/index.css:1345:html[data-theme='dark'] .dashboard-section-heading,
src/index.css:1346:html[data-theme='dark'] .dashboard-metric-value {
src/index.css:1353:html[data-theme='dark'] .career-page,
src/index.css:1354:html[data-theme='dark'] .community-page,
src/index.css:1355:html[data-theme='dark'] .practice-page,
src/index.css:1356:html[data-theme='dark'] .tracks-page {
src/index.css:1361:html[data-theme='dark'] .career-page [style*='color: rgb(10, 35, 66)'],
src/index.css:1362:html[data-theme='dark'] .community-page [style*='color: rgb(10, 35, 66)'],
src/index.css:1363:html[data-theme='dark'] .practice-page [style*='color: rgb(10, 35, 66)'],
src/index.css:1364:html[data-theme='dark'] .tracks-page [style*='color: rgb(10, 35, 66)'],
src/index.css:1365:html[data-theme='dark'] .career-page [style*='color:#0A2342'],
src/index.css:1366:html[data-theme='dark'] .community-page [style*='color:#0A2342'],
src/index.css:1367:html[data-theme='dark'] .practice-page [style*='color:#0A2342'],
src/index.css:1368:html[data-theme='dark'] .tracks-page [style*='color:#0A2342'] {
src/index.css:1372:html[data-theme='dark'] .career-page [style*='color: rgb(107, 122, 153)'],
src/index.css:1373:html[data-theme='dark'] .community-page [style*='color: rgb(107, 122, 153)'],
src/index.css:1374:html[data-theme='dark'] .practice-page [style*='color: rgb(107, 122, 153)'],
src/index.css:1375:html[data-theme='dark'] .tracks-page [style*='color: rgb(107, 122, 153)'],
src/index.css:1376:html[data-theme='dark'] .career-page [style*='color:#6B7A99'],
src/index.css:1377:html[data-theme='dark'] .community-page [style*='color:#6B7A99'],
src/index.css:1378:html[data-theme='dark'] .practice-page [style*='color:#6B7A99'],
src/index.css:1379:html[data-theme='dark'] .tracks-page [style*='color:#6B7A99'] {
src/index.css:1383:html[data-theme='dark'] .career-page [style*='background: rgb(255, 255, 255)'],
src/index.css:1384:html[data-theme='dark'] .community-page [style*='background: rgb(255, 255, 255)'],
src/index.css:1385:html[data-theme='dark'] .practice-page [style*='background: rgb(255, 255, 255)'],
src/index.css:1386:html[data-theme='dark'] .tracks-page [style*='background: rgb(255, 255, 255)'],
src/index.css:1387:html[data-theme='dark'] .career-page [style*='background: white'],
src/index.css:1388:html[data-theme='dark'] .community-page [style*='background: white'],
src/index.css:1389:html[data-theme='dark'] .practice-page [style*='background: white'],
src/index.css:1390:html[data-theme='dark'] .tracks-page [style*='background: white'] {
src/index.css:1395:html[data-theme='dark'] .career-page [style*='background: rgb(245, 247, 250)'],
src/index.css:1396:html[data-theme='dark'] .community-page [style*='background: rgb(245, 247, 250)'],
src/index.css:1397:html[data-theme='dark'] .practice-page [style*='background: rgb(245, 247, 250)'],
src/index.css:1398:html[data-theme='dark'] .tracks-page [style*='background: rgb(245, 247, 250)'] {
src/index.css:1402:html[data-theme='dark'] .career-page [style*='border-color: rgb(226, 234, 243)'],
src/index.css:1403:html[data-theme='dark'] .community-page [style*='border-color: rgb(226, 234, 243)'],
src/index.css:1404:html[data-theme='dark'] .practice-page [style*='border-color: rgb(226, 234, 243)'],
src/index.css:1405:html[data-theme='dark'] .tracks-page [style*='border-color: rgb(226, 234, 243)'],
src/index.css:1406:html[data-theme='dark'] .practice-page [style*='border-color: rgb(229, 234, 240)'] {
src/index.css:1410:html[data-theme='dark'] .career-page h1,
src/index.css:1411:html[data-theme='dark'] .career-page h2,
src/index.css:1412:html[data-theme='dark'] .career-page h3,
src/index.css:1413:html[data-theme='dark'] .career-page h4,
src/index.css:1414:html[data-theme='dark'] .community-page h1,
src/index.css:1415:html[data-theme='dark'] .community-page h2,
src/index.css:1416:html[data-theme='dark'] .community-page h3,
src/index.css:1417:html[data-theme='dark'] .community-page h4,
src/index.css:1418:html[data-theme='dark'] .practice-page h1,
src/index.css:1419:html[data-theme='dark'] .practice-page h2,
src/index.css:1420:html[data-theme='dark'] .practice-page h3,
src/index.css:1421:html[data-theme='dark'] .practice-page h4,
src/index.css:1422:html[data-theme='dark'] .tracks-page h1,
src/index.css:1423:html[data-theme='dark'] .tracks-page h2,
src/index.css:1424:html[data-theme='dark'] .tracks-page h3,
src/index.css:1425:html[data-theme='dark'] .tracks-page h4 {
src/index.css:1430:html[data-theme='dark'] .learner-more-menu [style*='color: rgb(10, 35, 66)'],
src/index.css:1431:html[data-theme='dark'] .learner-more-menu [style*='color: rgb(107, 122, 153)'],
src/index.css:1432:html[data-theme='dark'] .learner-more-menu [style*='color: rgb(130, 144, 165)'],
src/index.css:1433:html[data-theme='dark'] .learner-more-menu [style*='color: rgb(138, 152, 170)'] {
src/index.css:1437:html[data-theme='dark'] .learner-more-menu [style*='color: rgb(138, 152, 170)'] {
src/index.css:1441:html[data-theme='dark'] .learner-more-menu [style*='background: rgb(255, 255, 255)'],
src/index.css:1442:html[data-theme='dark'] .learner-more-menu [style*='background: white'] {
src/index.css:1446:html[data-theme='dark'] .learner-more-menu [style*='background: rgb(245, 247, 250)'],
src/index.css:1447:html[data-theme='dark'] .learner-more-menu [style*='background: #F5F7FA'] {
src/index.css:1451:html[data-theme='dark'] .learner-more-menu input::placeholder {
src/index.css:1455:html[data-theme='dark'] .learner-more-menu h2,
src/index.css:1456:html[data-theme='dark'] .learner-more-menu h3 {
src/index.css:1476:html[data-theme='dark'] .min-h-screen:not(.landing-page):not(.auth-page):not(.onboarding-page):not(.dashboard-page):not(.lesson-page) {
src/index.css:1481:html[data-theme='dark'] main h1,
src/index.css:1482:html[data-theme='dark'] main h2,
src/index.css:1483:html[data-theme='dark'] main h3,
src/index.css:1484:html[data-theme='dark'] main h4 {
src/index.css:1488:html[data-theme='dark'] main p:not(.text-white):not([class*='text-white']) {
src/index.css:1492:html[data-theme='dark'] main [style*='color: rgb(10, 35, 66)'],
src/index.css:1493:html[data-theme='dark'] main [style*='color: rgb(29, 53, 87)'],
src/index.css:1494:html[data-theme='dark'] main [style*='color: rgb(36, 86, 166)'] {
src/index.css:1498:html[data-theme='dark'] main [style*='color: rgb(107, 122, 153)'],
src/index.css:1499:html[data-theme='dark'] main [style*='color: rgb(130, 144, 165)'],
src/index.css:1500:html[data-theme='dark'] main [style*='color: rgb(123, 138, 160)'],
src/index.css:1501:html[data-theme='dark'] main [style*='color: rgb(138, 152, 170)'],
src/index.css:1502:html[data-theme='dark'] main [style*='color: rgb(111, 133, 139)'] {
src/index.css:1506:html[data-theme='dark'] main [style*='background: rgb(255, 255, 255)'],
src/index.css:1507:html[data-theme='dark'] main [style*='background: rgb(251, 252, 254)'],
src/index.css:1508:html[data-theme='dark'] main [style*='background: rgb(247, 249, 252)'],
src/index.css:1509:html[data-theme='dark'] main [style*='background: rgb(246, 248, 252)'] {
src/index.css:1513:html[data-theme='dark'] main [style*='background: rgb(245, 247, 250)'],
src/index.css:1514:html[data-theme='dark'] main [style*='background: rgb(244, 247, 251)'],
src/index.css:1515:html[data-theme='dark'] main [style*='background: rgb(248, 250, 253)'] {
src/index.css:1519:html[data-theme='dark'] main [style*='border-color: rgb(220, 229, 240)'],
src/index.css:1520:html[data-theme='dark'] main [style*='border-color: rgb(226, 234, 243)'],
src/index.css:1521:html[data-theme='dark'] main [style*='border-color: rgb(229, 234, 240)'],
src/index.css:1522:html[data-theme='dark'] main [style*='border-color: rgb(216, 225, 236)'] {
src/index.css:1526:html[data-theme='dark'] main .bg-white {
src/index.css:1532:  html[data-theme='dark'] main {
src/index.css:1664:html[data-theme='dark'] .dashboard-page .dashboard-stat-label,
src/index.css:1665:html[data-theme='dark'] .dashboard-page .dashboard-factor-label {
src/index.css:1669:html[data-theme='dark'] .dashboard-page .dashboard-stat-value,
src/index.css:1670:html[data-theme='dark'] .dashboard-page .dashboard-metric-value {
src/index.css:1675:html[data-theme='dark'] .dashboard-page .dashboard-stat-value-highlight {
src/index.css:1679:html[data-theme='dark'] .dashboard-page [style*='color: rgb(10, 35, 66)'],
src/index.css:1680:html[data-theme='dark'] .dashboard-page [style*='color:#0A2342'] {
src/index.css:1684:html[data-theme='dark'] .dashboard-page [style*='color: rgb(107, 122, 153)'],
src/index.css:1685:html[data-theme='dark'] .dashboard-page [style*='color:#6B7A99'] {
src/index.css:1689:html[data-theme='dark'] .dashboard-page [style*='background: rgb(245, 247, 250)'],
src/index.css:1690:html[data-theme='dark'] .dashboard-page [style*='background:#F5F7FA'] {
src/index.css:1865:html[data-theme='dark'] .dk-playground-page .dk-chess-full-panel {
src/index.css:1902:html[data-theme='dark'] .dk-ludo-traditional-panel { --ludo-board: #183036; --ludo-route: #f4ead8; --ludo-ink: #f7fbfa; }
src/index.css:1915:html[data-theme='dark'] .dk-ludo-cell { border-color: rgb(247 251 250 / .16); }
src/index.css:1965:html[data-theme='dark'] .dk-dedicated-game .dk-guide-button {
src/index.css:1970:html[data-theme='dark'] .dk-dedicated-game .dk-guide-button:hover,
src/index.css:1971:html[data-theme='dark'] .dk-dedicated-game .dk-guide-button:focus-visible { background: #24464e !important; color: #ffffff !important; border-color: #9ad9c5 !important; }
src/index.css:2151:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card h3 { color: #0A2342 !important; }
src/index.css:2152:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card p { color: #52657F !important; }
src/index.css:2153:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card button { color: #0A2342 !important; }
src/index.css:2224:html[data-theme='dark'] .lesson-page {
src/index.css:2229:html[data-theme='dark'] .lesson-hero,
src/index.css:2230:html[data-theme='dark'] .lesson-surface,
src/index.css:2231:html[data-theme='dark'] .lesson-content-card,
src/index.css:2232:html[data-theme='dark'] .lesson-choice-card {
src/index.css:2238:html[data-theme='dark'] .lesson-back-link {
src/index.css:2244:html[data-theme='dark'] .lesson-back-link:hover,
src/index.css:2245:html[data-theme='dark'] .lesson-back-link:focus-visible {
src/index.css:2251:html[data-theme='dark'] .lesson-page-title,
src/index.css:2252:html[data-theme='dark'] .lesson-content-title,
src/index.css:2253:html[data-theme='dark'] .lesson-surface h2,
src/index.css:2254:html[data-theme='dark'] .lesson-surface h3,
src/index.css:2255:html[data-theme='dark'] .lesson-surface p,
src/index.css:2256:html[data-theme='dark'] .lesson-surface li,
src/index.css:2257:html[data-theme='dark'] .lesson-body-copy,
src/index.css:2258:html[data-theme='dark'] .lesson-section-copy,
src/index.css:2259:html[data-theme='dark'] .lesson-section-label {
src/index.css:2263:html[data-theme='dark'] .lesson-page-subtitle,
src/index.css:2264:html[data-theme='dark'] .lesson-surface .lesson-muted,
src/index.css:2265:html[data-theme='dark'] .lesson-surface button[style*='#6B7A99'],
src/index.css:2266:html[data-theme='dark'] .lesson-surface button[style*="color: '#6B7A99'"] {
src/index.css:2270:html[data-theme='dark'] .lesson-content-card [style*='background: #F5F7FA'],
src/index.css:2271:html[data-theme='dark'] .lesson-content-card [style*="background: '#F5F7FA'"] {
src/index.css:2275:html[data-theme='dark'] .lesson-content-card [style*='background: #FFFBEF'],
src/index.css:2276:html[data-theme='dark'] .lesson-content-card [style*="background: '#FFFBEF'"] {
src/index.css:2280:html[data-theme='dark'] .lesson-content-card [style*='background: #F0F4FF'],
src/index.css:2281:html[data-theme='dark'] .lesson-content-card [style*="background: '#F0F4FF'"] {
src/index.css:2323:html[data-theme='dark'] .lesson-example-card {
src/index.css:2328:html[data-theme='dark'] .lesson-exercise-card {
src/index.css:2333:html[data-theme='dark'] .lesson-example-card .lesson-section-label,
src/index.css:2334:html[data-theme='dark'] .lesson-example-card .lesson-section-copy,
src/index.css:2335:html[data-theme='dark'] .lesson-exercise-card .lesson-section-label,
src/index.css:2336:html[data-theme='dark'] .lesson-exercise-card .lesson-section-copy {
src/index.css:2340:html[data-theme='dark'] .lesson-quiz-panel {
src/index.css:2344:html[data-theme='dark'] .lesson-quiz-panel > div > p,
src/index.css:2345:html[data-theme='dark'] .lesson-quiz-panel > p {
src/index.css:2349:html[data-theme='dark'] .lesson-quiz-option {
src/index.css:2355:html[data-theme='dark'] .lesson-quiz-option:hover,
src/index.css:2356:html[data-theme='dark'] .lesson-quiz-option:focus-visible {
src/index.css:2428:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-inactive {
src/index.css:2434:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-inactive h3 {
src/index.css:2438:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-inactive p {
src/index.css:2442:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-inactive button {
src/index.css:2448:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-inactive button:hover,
src/index.css:2449:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-inactive button:focus-visible {
src/index.css:2455:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-active {
src/index.css:2461:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-active h3 {
src/index.css:2465:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-active p {
src/index.css:2469:html[data-theme='dark'] .tracks-page .tracks-learning-skill-card.is-active button {

## Hex colors
    335 #0A2342
    219 #6B7A99
    112 #D4AF37
     86 #F5F7FA
     74 #2456A6
     51 #991B1B
     38 #2E7D32
     35 #8BC6B5
     30 #FEE2E2
     30 #91A7AD
     30 #8290A5
     29 #E2E8F0
     28 #9A7610
     27 #DCE5F0
     26 #FFFFFF
     25 #F7FBFA
     23 #0E1B1F
     22 #FFF9E8
     22 #E8F5E9
     21 #E8F0FE
     20 #E2EAF3
     18 #FFFBEF
     17 #fff
     17 #E6C85C
     17 #40565D
     15 #F4F7FB
     15 #14252A
     13 #8A6500
     12 #967414
     11 #2D8A5A
     11 #1E293B
     10 #EEF3FA
     10 #EAF7F0
     10 #8A98AA
      9 #FBFCFE
      9 #56B69A
      8 #e9c46a
      8 #F6F8FC
      8 #EEF6F1
      8 #6D4CB3
      8 #2B4046
      7 #FFF5D8
      7 #F8FAFD
      7 #E6ECF4
      7 #DDF5E3
      7 #5b8def
      7 #416181
      7 #203A4A
      6 #e7b957
      6 #F7FAFF
      6 #E17863
      6 #D97832
      6 #9AA8BB
      6 #8FB4E8
      5 #f5d27a
      5 #FAFAFA
      5 #D8E1EC
      5 #C7D1DE
      5 #C05621
      5 #9AD9C5
      5 #7B8AA0
      5 #5B8DEF
      5 #56b69a
      5 #173238
      5 #153D74
      4 #f7fbfa
      4 #e47763
      4 #FCFDFE
      4 #F7F9FC
      4 #F3FAF6
      4 #F0F4FF
      4 #F0D56D
      4 #EDF1F6
      4 #EAF0F7
      4 #B28A12
      4 #6F858B
      4 #2c63b6
      3 #ffffff
      3 #d8795b
      3 #FFF8DE
      3 #FFF1E8
      3 #FFB5B5
      3 #FFB5A9
      3 #F7D76A
      3 #F6C85F
      3 #F0D58A
      3 #EAF7F1
      3 #E7EDF4
      3 #E1E8F1
      3 #A985F3
      3 #A7B8BC
      3 #8A6C0B
      3 #69444A
      3 #5D6D84
      3 #55737B
      3 #52657F
      3 #4B6385
      3 #3A321A
      3 #2c7771
      3 #246B36
      3 #216E46
      3 #1E3A32
      3 #1D3941
      3 #1B3036
      3 #172B31
      2 #fff2a8
      2 #fff1d0
      2 #f8f5ed
      2 #f7ce67
      2 #f3eadb
      2 #e17863
      2 #ad6b43
      2 #a86186
      2 #FDECEC
      2 #F8FBFF
      2 #F06B63
      2 #EEF8F4
      2 #EEF4FB
      2 #E6F3F0
      2 #E6B84B
      2 #E5EAF0
      2 #E5D394
      2 #D9E3EF
      2 #C1CFD2
      2 #B9C8D8
      2 #B18A16
      2 #9DD7B2
      2 #9C3F31
      2 #8F2B2B
      2 #856404
      2 #8391A7
      2 #77869B
      2 #6d9bf0
      2 #6496a7
      2 #536D73
      2 #53657D
      2 #52706f
      2 #52677E
      2 #4b769f
      2 #49656A
      2 #425b9e
      2 #3C8E93
      2 #3A2425
      2 #302B1B
      2 #24484F
      2 #1E5AA8
      2 #1E3A5F
      2 #1D4945
      2 #1D3557
      2 #102B35
      2 #10252B
      2 #0B2342
      1 #fffdf7
      1 #fffdf4
      1 #fff8e2
      1 #fff7dc
      1 #f7f1e5
      1 #f4f6f9
      1 #f4ead8
      1 #f3dda1
      1 #f39d79
      1 #f1e7d6
      1 #f1c85f
      1 #f08a65
      1 #efb5a8
      1 #edbd69
      1 #eaf1fb
      1 #e9c37e
      1 #e6e0d3
      1 #e5b65b
      1 #e2bd51
      1 #d9bf74
      1 #d9705f
      1 #d8b34e
      1 #d8a52e
      1 #d7eced
      1 #d5e5e1
      1 #d4dee8
      1 #d4585b
      1 #d1a846
      1 #c86f5e
      1 #c75f50
      1 #be8420
      1 #b97888
      1 #b94a3f
      1 #b76558
      1 #adddce
      1 #aa841a
      1 #a9c8f3
      1 #a985f3
      1 #a95e59
      1 #a8d8c8
      1 #a37d36
      1 #FFF8F2
      1 #FFF6D9
      1 #FFF5F4
      1 #FFF4F2
      1 #FFF1F0
      1 #FFF0DE
      1 #FFB11B
      1 #FECACA
      1 #FDE5E5
      1 #FAFBFC
      1 #F3E4AA
      1 #F2EDFB
      1 #F2ECFF
      1 #F2D34E
      1 #F1F5F9
      1 #F0FBF3
      1 #F0F6FF
      1 #F0D56A
      1 #F0D2B5
      1 #EEF4FF
      1 #EAF2FF
      1 #E9DDAA
      1 #E8EDF4
      1 #E7EDF5
      1 #E7B957
      1 #E6C65C
      1 #E5B8B8
      1 #E5AD7B
      1 #E4E9F0
      1 #DCEEFF
      1 #DCE7F5
      1 #D9E9F1
      1 #D99A9A
      1 #D8E0EB
      1 #D8D0BF
      1 #D8795B
      1 #D7E8E4
      1 #D6DEE9
      1 #D69AA0
      1 #C9A83A
      1 #C99B52
      1 #C8D5E3
      1 #C4D6D8
      1 #C3A6AA
      1 #BFD1D2
      1 #BFA64A
      1 #B6A1E8
      1 #B5CBC8
      1 #B5C7C9
      1 #B4C2C5
      1 #B42318
      1 #A8B49B
      1 #A5483C
      1 #9ad9c5
      1 #9FD2B2
      1 #9CB2B5
      1 #9BAEB2
      1 #9A5B21
      1 #93B9C9
      1 #927136
      1 #8c779d
      1 #8b73b7
      1 #8B7631
      1 #8A6E13
      1 #806F45
      1 #7d9bb7
      1 #7d2922
      1 #7A5A00
      1 #79d3c0
      1 #76633A
      1 #70858C
      1 #6f9eaa
      1 #6f540b
      1 #6b8f78
      1 #6E7D91
      1 #6D9BC7
      1 #6B5B50
      1 #6B5A28
      1 #6B4FA1
      1 #5c7775
      1 #587471
      1 #5687d8
      1 #51a58c
      1 #4A3D20
      1 #4285F4
      1 #40516B
      1 #3e5b62
      1 #3C3820
      1 #3B3821
      1 #37A169
      1 #36546D
      1 #35535B
      1 #35515A
      1 #2D2A22
      1 #2B5057
      1 #2859ae
      1 #277d68
      1 #26383D
      1 #251A1D
      1 #2469AD
      1 #2456a6
      1 #244d51
      1 #24464e
      1 #214b50
      1 #203A40
      1 #1E3848
      1 #1D3E38
      1 #1D343A
      1 #1C3942
      1 #193033
      1 #183B3A
      1 #183334
      1 #183036
      1 #17633B
      1 #17302f
      1 #163f81
      1 #163454
      1 #155d4b
      1 #15548F
      1 #142d32
      1 #142B31
      1 #142A31
      1 #132A32
      1 #122945
      1 #102c36
      1 #102b4a
      1 #102829
      1 #10242B
      1 #102328
      1 #0e2631
      1 #0a2342
      1 #0E3B69
      1 #0E1E32
      1 #0D294B
      1 #0B1B21
      1 #0B1B20
      1 #0B1220
      1 #071A32
      1 #06151bcc
