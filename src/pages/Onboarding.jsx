import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { logEvent } from '../lib/analytics'

const skillOptions = [
  ['Frontend Development', 'Build websites and interfaces people enjoy using.'],
  ['Backend Development', 'Create APIs, databases, and reliable services.'],
  ['Full-Stack Development', 'Connect user experiences to complete working products.'],
  ['Data Analytics', 'Turn spreadsheets, SQL, and dashboards into decisions.'],
  ['UI/UX Design', 'Research needs and shape clearer digital experiences.'],
  ['Cybersecurity', 'Understand threats, systems, and practical digital defence.'],
  ['Cloud & DevOps', 'Ship, automate, and operate reliable software systems.'],
  ['AI & Automation', 'Use AI, prompting, and workflows to multiply your impact.'],
  ['Digital Marketing', 'Create measurable growth through content and campaigns.'],
  ['Business & Productivity', 'Use digital systems and automation to work better.'],
]

const commonSteps = [
  { key: 'background', eyebrow: 'Your starting point', question: "What's your background?", helper: 'This helps us calibrate the first week of your roadmap.', options: ['Student, no work experience', 'Working professional', 'Career switcher', 'Recent graduate'] },
  { key: 'goal', eyebrow: 'Your destination', question: "What's your main goal?", helper: 'We will use this outcome to shape your learning missions.', options: ['Start a career in digital skills', 'Level up for my current role', 'Build projects and a portfolio', 'Explore a new digital path'] },
  { key: 'availability', eyebrow: 'Your rhythm', question: 'How much time can you commit weekly?', helper: 'Your plan should fit your real schedule, not an ideal one.', options: ['Less than 5 hrs/week', '5–10 hrs/week', '10–20 hrs/week', '20+ hrs/week (full-time)'] },
]

const skillQuestions = {
  'Frontend Development': [
    { key: 'frontendExperience', eyebrow: 'Frontend baseline', question: "How familiar are you with building user interfaces?", helper: 'We will use this to choose the right first projects and challenge pace.', options: ['I have never built one', 'I have tried HTML or CSS', 'I can build basic pages', 'I have built interactive interfaces'] },
    { key: 'frontendDirection', eyebrow: 'Frontend direction', question: 'What would you most like to build first?', helper: 'Your answer helps us connect lessons to a motivating project.', options: ['Responsive websites', 'React applications', 'Design systems and UI components', 'Interactive web experiences'] },
  ],
  'Backend Development': [
    { key: 'backendExperience', eyebrow: 'Backend baseline', question: "How familiar are you with servers, APIs, or databases?", helper: 'We will set a starting point that builds confidence without skipping foundations.', options: ['None yet', 'I have used a database or API', 'I can build simple endpoints', 'I have deployed backend services'] },
    { key: 'backendDirection', eyebrow: 'Backend direction', question: 'Which backend outcome interests you most?', helper: 'This helps us select examples that feel useful from the beginning.', options: ['Build APIs', 'Design databases', 'Create secure services', 'Deploy reliable applications'] },
  ],
  'Full-Stack Development': [
    { key: 'fullstackExperience', eyebrow: 'Full-stack baseline', question: 'Which part of building an application feels most familiar?', helper: 'We will use this to balance your roadmap across frontend and backend work.', options: ['Neither yet', 'Frontend basics', 'Backend basics', 'I have connected both before'] },
    { key: 'fullstackDirection', eyebrow: 'Full-stack direction', question: 'What kind of product would you like to ship?', helper: 'A concrete product goal makes the full-stack path easier to practise.', options: ['A useful personal tool', 'A business web app', 'A community or marketplace product', 'An end-to-end portfolio project'] },
  ],
  'Data Analytics': [
    { key: 'excelLevel', eyebrow: 'Analytics baseline', question: "What's your spreadsheet experience?", helper: 'There is no wrong answer. Honest inputs create better practice.', options: ['No experience at all', 'Basic formatting only', 'Comfortable with formulas', 'Advanced pivot tables and macros'] },
    { key: 'sqlLevel', eyebrow: 'Analytics baseline', question: "What's your SQL experience?", helper: 'Your answer helps us set the right level of data work.', options: ['No experience at all', 'Basic SELECT queries', 'Comfortable with joins and subqueries', 'Advanced SQL'] },
    { key: 'analyticsDirection', eyebrow: 'Analytics direction', question: 'What would you most like to do with data?', helper: 'We will connect your missions to a practical outcome.', options: ['Build clear dashboards', 'Answer business questions', 'Automate recurring reports', 'Explore data and find patterns'] },
  ],
  'UI/UX Design': [
    { key: 'designExperience', eyebrow: 'Design baseline', question: 'How familiar are you with designing digital experiences?', helper: 'We will choose the right balance of principles, practice, and critique.', options: ['I am completely new', 'I have explored design tools', 'I have made a few screens', 'I have designed a complete flow'] },
    { key: 'designDirection', eyebrow: 'Design direction', question: 'Which part of product design interests you most?', helper: 'Your answer helps us choose relevant projects and examples.', options: ['User research', 'Wireframes and prototypes', 'Visual interface design', 'Usability and product strategy'] },
  ],
  'Cybersecurity': [
    { key: 'securityExperience', eyebrow: 'Security baseline', question: 'How familiar are you with computers, networks, or security?', helper: 'Cybersecurity is a deep path, so we will start at the level that fits you.', options: ['New to all of these', 'Comfortable using computers', 'I understand basic networks', 'I have studied or practised security'] },
    { key: 'securityDirection', eyebrow: 'Security direction', question: 'Which cybersecurity area would you like to explore first?', helper: 'This helps us make the first labs focused and realistic.', options: ['Security fundamentals', 'Defensive monitoring', 'Web and application security', 'Risk, governance, and compliance'] },
  ],
  'Cloud & DevOps': [
    { key: 'cloudExperience', eyebrow: 'Cloud baseline', question: 'How familiar are you with Linux, cloud, or deployment?', helper: 'We will build from the systems knowledge you already have.', options: ['New to all of these', 'I can use a terminal', 'I have deployed an application', 'I have managed cloud or CI/CD tools'] },
    { key: 'cloudDirection', eyebrow: 'Cloud direction', question: 'What would you most like to become confident operating?', helper: 'Your answer helps us choose practical infrastructure missions.', options: ['Deploying applications', 'Cloud foundations', 'Automation and CI/CD', 'Reliability and monitoring'] },
  ],
  'AI & Automation': [
    { key: 'aiExperience', eyebrow: 'AI baseline', question: 'How have you used AI or automation so far?', helper: 'We will meet you at your current level and focus on useful workflows.', options: ['I have not used them yet', 'I use chat tools occasionally', 'I have built simple automations', 'I create repeatable AI workflows'] },
    { key: 'aiDirection', eyebrow: 'AI direction', question: 'What would you most like AI to help you do?', helper: 'A clear outcome keeps experimentation connected to real value.', options: ['Learn faster', 'Automate repetitive work', 'Build AI-powered features', 'Analyse and communicate information'] },
  ],
  'Digital Marketing': [
    { key: 'marketingExperience', eyebrow: 'Marketing baseline', question: 'How familiar are you with digital marketing?', helper: 'We will choose practical examples for your current level.', options: ['Completely new', 'I have created content', 'I have managed campaigns', 'I have used analytics to optimise results'] },
    { key: 'marketingDirection', eyebrow: 'Marketing direction', question: 'Which marketing outcome interests you most?', helper: 'Your answer helps us make projects measurable and relevant.', options: ['Content and social media', 'SEO and discoverability', 'Paid campaigns', 'Marketing analytics and growth'] },
  ],
  'Business & Productivity': [
    { key: 'productivityExperience', eyebrow: 'Productivity baseline', question: 'Which digital work tools do you already use confidently?', helper: 'We will focus on the systems that can improve your everyday work.', options: ['I am still building confidence', 'Documents and spreadsheets', 'Project and collaboration tools', 'Automation and reporting tools'] },
    { key: 'productivityDirection', eyebrow: 'Productivity direction', question: 'What would you most like to improve?', helper: 'We will turn this outcome into practical missions.', options: ['Organising work', 'Communicating clearly', 'Automating repetitive tasks', 'Making better decisions with information'] },
  ],
}

const finalSteps = [
  { key: 'targetIndustry', eyebrow: 'Career context', question: 'Any specific industry you want to target?', helper: 'We will make examples feel closer to the work you want to do.', options: ['General business (open)', 'Finance', 'Tech', 'Healthcare', 'Marketing'] },
  { key: 'learningStyle', eyebrow: 'Your learning style', question: 'How do you like to learn?', helper: 'Your roadmap balances explanation, practice, and reflection around this preference.', options: ['Theory + practice together', 'Practice-first, theory later', 'Visual and diagram-heavy explanations', 'Reading and documentation'] },
  { key: 'device', eyebrow: 'Your access', question: 'What device will you mainly use?', helper: 'We use this to keep your experience practical and bandwidth-aware.', options: ['Windows PC', 'Mac', 'Linux', 'Mobile phone only (no PC)'] },
]

const optionDescriptions = {
  'Student, no work experience': 'Start with foundations and build evidence step by step.',
  'Working professional': 'Turn existing context into a focused career advantage.',
  'Career switcher': 'Bridge your experience into a credible digital pathway.',
  'Recent graduate': 'Move from academic momentum to job-ready proof.',
  'Start a career in digital skills': 'Build a practical foundation across the digital skills employers value.',
  'Level up for my current role': 'Apply new digital skills to the work you already do.',
  'Build projects and a portfolio': 'Turn practice into visible proof of what you can do.',
  'Explore a new digital path': 'Try a new direction with a low-pressure first mission.',
}

function getSteps(targetSkill) {
  const skillStep = targetSkill ? skillQuestions[targetSkill] || [] : []
  return [
    { key: 'targetSkill', eyebrow: 'Choose your direction', question: 'What do you want to learn?', helper: 'Your choice determines the baseline questions, examples, projects, and pace we recommend.', options: skillOptions.map(([label]) => label) },
    ...commonSteps,
    ...skillStep,
    ...finalSteps,
  ]
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [otherText, setOtherText] = useState('')

  const steps = useMemo(() => getSteps(answers.targetSkill), [answers.targetSkill])
  const step = steps[Math.min(stepIndex, steps.length - 1)]
  const isLastStep = stepIndex === steps.length - 1
  const progress = ((stepIndex + 1) / steps.length) * 100
  const selectedAnswer = answers[step.key]

  async function handleSelect(value) {
    setError('')
    const updatedAnswers = { ...answers, [step.key]: value }
    setAnswers(updatedAnswers)
    setShowOtherInput(false)
    setOtherText('')
    if (isLastStep) await generateRoadmap(updatedAnswers)
    else setStepIndex(stepIndex + 1)
  }

  function handleOtherSubmit() {
    if (otherText.trim()) handleSelect(otherText.trim())
  }

  function handleBack() {
    setError('')
    setShowOtherInput(false)
    setOtherText('')
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  async function generateRoadmap(finalAnswers) {
    setGenerating(true)
    setError('')
    try {
      if (!user) throw new Error('No authenticated user found. Please log in again.')
      const { data, error: fnError } = await supabase.functions.invoke('smart-task', { body: { assessment: finalAnswers } })
      if (fnError) throw fnError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      const { error: upsertError } = await supabase.from('profiles').upsert({ id: user.id, email: user.email, assessment: finalAnswers, roadmap: data.roadmap, onboarding_completed: true })
      if (upsertError) throw upsertError
      logEvent(user.id, 'onboarding_completed', { background: finalAnswers.background, goal: finalAnswers.goal, targetSkill: finalAnswers.targetSkill })
      navigate('/dashboard')
    } catch (err) {
      console.error('Onboarding error:', err)
      setError("We couldn't build your roadmap right now. Your answers are still here—try again.")
      setGenerating(false)
    }
  }

  if (generating) return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: '#F4F7FB' }}><div className="w-full max-w-4xl grid lg:grid-cols-[0.8fr_1.2fr] overflow-hidden rounded-[2rem]" style={{ background: 'white', boxShadow: '0 24px 80px rgba(10,35,66,0.14)' }}><div className="hidden lg:flex flex-col justify-between p-10" style={{ background: '#0A2342' }}><div><img src="/datakwest_logo_lockup.png" alt="DataKwest logo" className="h-12 w-52 object-contain object-left" /><p className="mt-8 text-xs font-bold uppercase tracking-[0.24em]" style={{ color: '#D4AF37' }}>Datakwest AI</p><h2 className="mt-3 text-3xl font-bold leading-tight text-white">Your next chapter is taking shape.</h2></div><p className="text-sm leading-6" style={{ color: 'rgba(255,255,255,0.68)' }}>We are turning your goals, time, and experience into a practical path you can follow.</p></div><div className="flex min-h-[440px] flex-col items-center justify-center p-8 sm:p-12 text-center"><div className="relative mb-7 h-20 w-20"><div className="absolute inset-0 rounded-full border-4" style={{ borderColor: '#E6ECF4' }} /><div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent" style={{ borderTopColor: '#D4AF37' }} /><div className="absolute inset-3 rounded-full flex items-center justify-center" style={{ background: '#FFF8E1', color: '#9A7610' }}>AI</div></div><p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#9A7610' }}>Personalising your path</p><h1 className="mt-3 text-2xl sm:text-3xl font-bold" style={{ color: '#0A2342' }}>Building your roadmap</h1><p className="mt-3 max-w-sm text-sm leading-6" style={{ color: '#6B7A99' }}>We are matching your chosen skill, time, and experience to a practical path you can follow.</p><div className="mt-8 h-2 w-full max-w-xs overflow-hidden rounded-full" style={{ background: '#E6ECF4' }}><div className="h-full w-2/3 rounded-full" style={{ background: '#D4AF37' }} /></div></div></div></div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#F4F7FB' }}>
      <header className="flex items-center justify-between px-6 py-5 sm:px-10"><div className="flex items-center gap-3"><img src="/datakwest_logo_lockup.png" alt="DataKwest logo" className="h-12 w-52 object-contain object-left" /><div><p className="text-sm font-black tracking-tight" style={{ color: '#0A2342' }}>DATAKWEST</p><p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8391A7' }}>Career operating system</p></div></div><div className="hidden sm:flex items-center gap-3 text-xs font-semibold" style={{ color: '#6B7A99' }}><span className="h-2 w-2 rounded-full" style={{ background: '#37A169' }} />Saved automatically <span className="mx-1" style={{ color: '#D6DEE9' }}>|</span><span>{stepIndex + 1} / {steps.length}</span></div></header>
      <main className="mx-auto grid max-w-6xl gap-8 px-6 pb-12 pt-4 lg:grid-cols-[0.75fr_1.25fr] lg:items-start lg:px-10 lg:pt-10">
        <aside className="hidden self-start lg:mt-[104px] lg:flex flex-col justify-between rounded-[2rem] p-10" style={{ background: '#0A2342', boxShadow: '0 18px 60px rgba(10,35,66,0.16)' }}><div><p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: '#D4AF37' }}>Build your advantage</p><h1 className="mt-5 text-4xl font-bold leading-[1.08] text-white">Start with where you want to go.</h1><p className="mt-5 text-sm leading-7" style={{ color: 'rgba(255,255,255,0.68)' }}>Choose a direction first. Then we will ask only the questions that help make that direction more relevant to you.</p></div><div className="space-y-5"><div className="h-px" style={{ background: 'rgba(255,255,255,0.14)' }} /><div className="flex gap-3"><div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(212,175,55,0.16)', color: '#D4AF37' }}>01</div><div><p className="text-sm font-bold text-white">Choose your direction</p><p className="mt-1 text-xs leading-5" style={{ color: 'rgba(255,255,255,0.55)' }}>Your skill choice shapes what comes next.</p></div></div><div className="flex gap-3"><div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>02</div><div><p className="text-sm font-bold text-white">Shape your path</p><p className="mt-1 text-xs leading-5" style={{ color: 'rgba(255,255,255,0.55)' }}>Your goals become missions you can actually complete.</p></div></div></div></aside>
        <section className="mx-auto w-full max-w-2xl">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#9A7610' }}>{step.eyebrow}</p><p className="mt-2 text-sm" style={{ color: '#6B7A99' }}>Your answers shape a more relevant learning experience.</p></div><button type="button" onClick={handleBack} disabled={stepIndex === 0} className="rounded-lg px-3 py-2 text-sm font-bold disabled:invisible" style={{ color: '#0A2342' }}>← Back</button></div>
          <div className="mb-6 flex items-center gap-4"><div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: '#E1E8F1' }}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #D4AF37, #E6C65C)' }} /></div><span className="text-xs font-bold" style={{ color: '#6B7A99' }}>{Math.round(progress)}%</span></div>
          <div className="rounded-[2rem] p-6 sm:p-10" style={{ background: 'white', boxShadow: '0 18px 60px rgba(10,35,66,0.10)' }}><div className="mb-8"><span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ background: '#EEF3FA', color: '#416181' }}>Question {stepIndex + 1} of {steps.length}</span><h2 className="mt-5 text-3xl font-bold leading-tight sm:text-[2.15rem]" style={{ color: '#0A2342' }}>{step.question}</h2><p className="mt-3 max-w-xl text-sm leading-6" style={{ color: '#6B7A99' }}>{step.helper}</p></div>
            {error && <div role="alert" className="mb-5 flex gap-3 rounded-xl p-4 text-sm" style={{ background: '#FFF4F2', color: '#9C3F31' }}><span className="font-bold">!</span><span>{error}</span></div>}
            {!showOtherInput ? <div className="grid auto-rows-[minmax(156px,1fr)] gap-3 sm:grid-cols-2" role="listbox" aria-label={step.question}>{step.options.map((option, index) => <button type="button" key={option} onClick={() => handleSelect(option)} aria-selected={selectedAnswer === option} className="group flex h-full min-h-[156px] items-start rounded-2xl border-2 p-4 text-left transition-all hover:-translate-y-0.5" style={{ borderColor: selectedAnswer === option ? '#D4AF37' : '#E6ECF4', background: selectedAnswer === option ? '#FFF9E8' : '#FBFCFE', color: '#0A2342', boxShadow: selectedAnswer === option ? '0 8px 22px rgba(212,175,55,0.14)' : 'none' }}><span className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: selectedAnswer === option ? '#D4AF37' : '#EAF0F7', color: selectedAnswer === option ? '#0A2342' : '#416181' }}>{String.fromCharCode(65 + index)}</span><span><span className="block text-sm font-bold leading-5">{option}</span><span className="mt-2 block text-xs leading-5" style={{ color: '#7B8AA0' }}>{optionDescriptions[option] || skillOptions.find(([label]) => label === option)?.[1] || 'We will use this to tailor your learning experience.'}</span></span></span></button>)}<button type="button" onClick={() => setShowOtherInput(true)} className="flex h-full min-h-[156px] items-start rounded-2xl border-2 border-dashed p-4 text-left text-sm font-bold" style={{ borderColor: '#D8E1EC', color: '#6B7A99', background: '#FCFDFE' }}><span className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: '#EEF3FA', color: '#416181' }}>＋</span><span>Something else<span className="mt-1 block text-xs font-normal" style={{ color: '#8A98AA' }}>Tell us in your own words</span></span></span></button></div> : <div className="rounded-2xl p-5" style={{ background: '#F7F9FC' }}><label className="text-sm font-bold" style={{ color: '#0A2342' }} htmlFor="other-answer">Your answer</label><input id="other-answer" type="text" value={otherText} onChange={(event) => setOtherText(event.target.value)} placeholder="Type your answer…" autoFocus className="mt-3 w-full rounded-xl border-2 bg-white px-4 py-3 text-sm outline-none" style={{ borderColor: '#D8E1EC', color: '#0A2342' }} onKeyDown={(event) => { if (event.key === 'Enter') handleOtherSubmit() }} /><div className="mt-4 flex gap-3"><button type="button" onClick={handleOtherSubmit} disabled={!otherText.trim()} className="rounded-xl px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50" style={{ background: '#D4AF37', color: '#0A2342' }}>Continue</button><button type="button" onClick={() => { setShowOtherInput(false); setOtherText('') }} className="rounded-xl px-5 py-3 text-sm font-bold" style={{ color: '#6B7A99' }}>Cancel</button></div></div>}
            <div className="mt-8 flex items-center justify-between border-t pt-5" style={{ borderColor: '#EDF1F6' }}><p className="text-xs" style={{ color: '#8A98AA' }}>You can go back and change any answer.</p><span className="text-xs font-bold" style={{ color: '#9A7610' }}>{isLastStep ? 'Ready to build your path' : 'Choose one to continue'}</span></div>
          </div>
        </section>
      </main>
    </div>
  )
}
