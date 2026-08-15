import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { logEvent } from '../lib/analytics'
import { createSkillEnrolment, discoverUniversalSkill, findPublishedSkillForTarget, updateLearnerPreferences } from '../lib/learningIntelligence'
import OwlLoading from '../components/OwlLoading'

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

const skillOrientations = {
  'Frontend Development': { eyebrow: 'Understand the field', question: 'Frontend development has more than one starting point.', helper: 'Before you choose a project direction, here is what the main areas mean in everyday work.', areas: [['Responsive websites', 'Create pages that work clearly across phones, tablets, and computers.'], ['React applications', 'Build interactive products with reusable components, state, and user flows.'], ['Design systems and UI components', 'Create consistent buttons, layouts, and interface patterns that teams can reuse.'], ['Interactive web experiences', 'Use motion, interaction, and richer browser capabilities to make experiences feel alive.']] },
  'Backend Development': { eyebrow: 'Understand the field', question: 'Backend development powers what users do not always see.', helper: 'Learn the main areas before choosing which type of service you want to build.', areas: [['APIs and services', 'Create the reliable connections that let apps send, receive, and process information.'], ['Databases', 'Organise data so it can be stored safely, found quickly, and changed correctly.'], ['Secure systems', 'Protect accounts, data, permissions, and services from misuse.'], ['Deployment and reliability', 'Run backend software in production and keep it available as usage grows.']] },
  'Full-Stack Development': { eyebrow: 'Understand the field', question: 'Full-stack development connects the whole product.', helper: 'See the major parts of an end-to-end product before choosing what you want to make.', areas: [['User interfaces', 'Shape what people see, click, read, and experience in the browser.'], ['APIs and application logic', 'Define the rules that make a product behave correctly behind the interface.'], ['Data and persistence', 'Store user and business information in a way the product can trust.'], ['Shipping and operations', 'Connect the pieces, deploy them, and keep the working product healthy.']] },
  'Data Analytics': { eyebrow: 'Understand the field', question: 'Data analytics turns information into better decisions.', helper: 'Here are the main ways analysts work with data before you choose a direction.', areas: [['Dashboards and reporting', 'Make important trends and measures easy for people to understand and monitor.'], ['Business questions', 'Use evidence to explain what is happening and support better decisions.'], ['Data preparation', 'Clean, combine, and organise information so the analysis can be trusted.'], ['Patterns and forecasting', 'Explore relationships and changes to help teams plan what may happen next.']] },
  'UI/UX Design': { eyebrow: 'Understand the field', question: 'Product design combines empathy, structure, and visual clarity.', helper: 'Learn what designers do across the product journey before choosing where to begin.', areas: [['User research', 'Understand people, their needs, and the problems a product should solve.'], ['Wireframes and prototypes', 'Sketch and test possible flows before building the final interface.'], ['Visual interface design', 'Use layout, type, colour, and components to make products clear and usable.'], ['Usability and product strategy', 'Improve the experience by testing decisions and connecting them to outcomes.']] },
  'Cybersecurity': { eyebrow: 'Understand the field', question: 'Cybersecurity is broader than one job title.', helper: 'Before you choose a direction, here is what the main areas mean in everyday work.', areas: [['Security fundamentals', 'Learn how devices, networks, accounts, and threats fit together.'], ['Defensive monitoring', 'Watch systems for suspicious activity, investigate alerts, and help respond to incidents.'], ['Web and application security', 'Find and prevent weaknesses in websites, APIs, and software.'], ['Risk, governance, and compliance', 'Help organisations understand risk, create controls, and meet responsibilities.']] },
  'Cloud & DevOps': { eyebrow: 'Understand the field', question: 'Cloud and DevOps is about shipping and operating software well.', helper: 'Understand the major parts of the work before choosing the area you want to practise.', areas: [['Cloud foundations', 'Understand the services, networks, storage, and permissions that modern apps use.'], ['Deployment and CI/CD', 'Move tested code into production through repeatable delivery pipelines.'], ['Automation', 'Replace repetitive manual work with scripts, configuration, and reliable workflows.'], ['Reliability and monitoring', 'Observe systems, find problems, and keep services dependable for users.']] },
  'AI & Automation': { eyebrow: 'Understand the field', question: 'AI and automation can improve many kinds of work.', helper: 'See the main ways people use AI before choosing the kind of workflow you want to build.', areas: [['AI-assisted learning and work', 'Use AI to understand information, draft ideas, and learn more effectively.'], ['Business automation', 'Connect tools and remove repetitive steps from everyday processes.'], ['AI-powered products', 'Build features that use models to help people search, decide, create, or communicate.'], ['Data and insight workflows', 'Use AI to organise, analyse, and explain information while checking its quality.']] },
  'Digital Marketing': { eyebrow: 'Understand the field', question: 'Digital marketing connects messages to measurable outcomes.', helper: 'Understand the main channels before choosing the kind of growth work you want to explore.', areas: [['Content and social media', 'Create useful messages and conversations that earn attention over time.'], ['SEO and discoverability', 'Help the right people find useful information through search and clear content.'], ['Paid campaigns', 'Use targeted advertising, budgets, and experiments to reach specific audiences.'], ['Marketing analytics and growth', 'Measure what is working and improve the journey from attention to action.']] },
  'Business & Productivity': { eyebrow: 'Understand the field', question: 'Digital productivity is more than using a collection of tools.', helper: 'See the main ways digital skills can improve how work gets organised and delivered.', areas: [['Organising work', 'Create clear systems for priorities, tasks, time, and follow-through.'], ['Communication and collaboration', 'Use digital tools to share context, make decisions, and work well with others.'], ['Automation', 'Reduce repetitive work by connecting tools and creating dependable routines.'], ['Information and decisions', 'Turn scattered information into useful summaries, reports, and actions.']] },
}

const beginnerQuizzes = {
  'Frontend Development': { key: 'frontendBeginnerQuiz', eyebrow: 'Find your fit', question: 'Which kind of work sounds most satisfying?', helper: 'There is no wrong answer. Choose the situation that makes you curious.', options: ['Making a page look great on every screen', 'Building a tool that responds when people click and type', 'Creating a consistent set of interface pieces', 'Making a rich, playful interaction'], results: { 'Making a page look great on every screen': 'Responsive websites', 'Building a tool that responds when people click and type': 'React applications', 'Creating a consistent set of interface pieces': 'Design systems and UI components', 'Making a rich, playful interaction': 'Interactive web experiences' } },
  'Backend Development': { key: 'backendBeginnerQuiz', eyebrow: 'Find your fit', question: 'Which behind-the-scenes problem would you enjoy solving?', helper: 'Pick the situation that sounds most interesting, even if it is new to you.', options: ['Helping different apps communicate', 'Keeping information organised and easy to find', 'Protecting accounts and sensitive information', 'Making a service dependable when many people use it'], results: { 'Helping different apps communicate': 'APIs and services', 'Keeping information organised and easy to find': 'Databases', 'Protecting accounts and sensitive information': 'Secure systems', 'Making a service dependable when many people use it': 'Deployment and reliability' } },
  'Full-Stack Development': { key: 'fullstackBeginnerQuiz', eyebrow: 'Find your fit', question: 'Which part of making a complete product attracts you first?', helper: 'Your answer gives us a useful starting point, not a permanent label.', options: ['Designing what people see and use', 'Making the product rules work', 'Storing information safely', 'Connecting everything and putting it online'], results: { 'Designing what people see and use': 'User interfaces', 'Making the product rules work': 'APIs and application logic', 'Storing information safely': 'Data and persistence', 'Connecting everything and putting it online': 'Shipping and operations' } },
  'Data Analytics': { key: 'analyticsBeginnerQuiz', eyebrow: 'Find your fit', question: 'Which data task sounds most rewarding?', helper: 'Choose the outcome you would most like to practise first.', options: ['Making a clear visual summary', 'Answering an important business question', 'Cleaning up a messy spreadsheet', 'Finding a pattern that helps people plan'], results: { 'Making a clear visual summary': 'Dashboards and reporting', 'Answering an important business question': 'Business questions', 'Cleaning up a messy spreadsheet': 'Data preparation', 'Finding a pattern that helps people plan': 'Patterns and forecasting' } },
  'UI/UX Design': { key: 'designBeginnerQuiz', eyebrow: 'Find your fit', question: 'Which design moment sounds most like you?', helper: 'You can explore the others later. This only helps choose a first mission.', options: ['Talking to people to understand their needs', 'Sketching a few ways a product could work', 'Making the interface feel clear and beautiful', 'Testing an experience and improving it'], results: { 'Talking to people to understand their needs': 'User research', 'Sketching a few ways a product could work': 'Wireframes and prototypes', 'Making the interface feel clear and beautiful': 'Visual interface design', 'Testing an experience and improving it': 'Usability and product strategy' } },
  'Cybersecurity': { key: 'securityBeginnerQuiz', eyebrow: 'Find your fit', question: 'Which cybersecurity situation would you be curious to learn about?', helper: 'You do not need technical experience. Choose the situation that sparks the most interest.', options: ['Understanding how devices and threats fit together', 'Spotting suspicious activity in a system', 'Finding weaknesses in a website or app', 'Helping an organisation manage security risk'], results: { 'Understanding how devices and threats fit together': 'Security fundamentals', 'Spotting suspicious activity in a system': 'Defensive monitoring', 'Finding weaknesses in a website or app': 'Web and application security', 'Helping an organisation manage security risk': 'Risk, governance, and compliance' } },
  'Cloud & DevOps': { key: 'cloudBeginnerQuiz', eyebrow: 'Find your fit', question: 'Which systems challenge sounds most interesting?', helper: 'Pick the outcome you would enjoy seeing yourself accomplish.', options: ['Understanding where an app runs online', 'Moving tested changes into production', 'Removing repetitive technical work', 'Keeping a service healthy and available'], results: { 'Understanding where an app runs online': 'Cloud foundations', 'Moving tested changes into production': 'Deployment and CI/CD', 'Removing repetitive technical work': 'Automation', 'Keeping a service healthy and available': 'Reliability and monitoring' } },
  'AI & Automation': { key: 'aiBeginnerQuiz', eyebrow: 'Find your fit', question: 'What would you most like to use AI to improve?', helper: 'Choose the outcome that feels useful in your life or work right now.', options: ['Understanding and creating things faster', 'Removing repetitive steps from a process', 'Building a product feature', 'Making information easier to analyse'], results: { 'Understanding and creating things faster': 'AI-assisted learning and work', 'Removing repetitive steps from a process': 'Business automation', 'Building a product feature': 'AI-powered products', 'Making information easier to analyse': 'Data and insight workflows' } },
  'Digital Marketing': { key: 'marketingBeginnerQuiz', eyebrow: 'Find your fit', question: 'Which growth challenge sounds most interesting?', helper: 'Choose the kind of result you would like to learn how to create.', options: ['Creating messages people want to follow', 'Helping people discover useful information', 'Reaching a specific audience with a campaign', 'Measuring what turns attention into action'], results: { 'Creating messages people want to follow': 'Content and social media', 'Helping people discover useful information': 'SEO and discoverability', 'Reaching a specific audience with a campaign': 'Paid campaigns', 'Measuring what turns attention into action': 'Marketing analytics and growth' } },
  'Business & Productivity': { key: 'productivityBeginnerQuiz', eyebrow: 'Find your fit', question: 'Which improvement would make the biggest difference to your day?', helper: 'Choose the outcome you would most like to practise first.', options: ['Knowing what to do and when', 'Helping a team share information clearly', 'Making repetitive tasks happen automatically', 'Turning scattered information into a useful decision'], results: { 'Knowing what to do and when': 'Organising work', 'Helping a team share information clearly': 'Communication and collaboration', 'Making repetitive tasks happen automatically': 'Automation', 'Turning scattered information into a useful decision': 'Information and decisions' } },
}

const customDiscoveryOrientation = { type: 'orientation', key: 'custom-orientation', eyebrow: 'Discover your direction', question: 'Let’s make your new skill easier to understand.', helper: 'We will map the skill you entered into a practical starting point before asking you to choose a direction.', areas: [['What the skill is', 'We will define the core ideas in plain language and connect them to everyday work.'], ['How people use it', 'We will show the common tasks, tools, and outcomes people practise in this area.'], ['Where beginners start', 'We will identify the foundations worth learning before advanced topics.'], ['What you can build', 'We will turn your interest into a small project or useful first result.']] }
const customDiscoveryQuiz = { type: 'quiz', key: 'custom-discovery-quiz', eyebrow: 'Find your fit', question: 'What would you most like this skill to help you do?', helper: 'Choose the outcome that feels most useful. This gives your first roadmap a clear direction.', options: ['Understand the foundations', 'Solve practical problems', 'Build projects or create things', 'Use the skill in my current work'], results: { 'Understand the foundations': 'Foundations and core concepts', 'Solve practical problems': 'Practical problem solving', 'Build projects or create things': 'Projects and creation', 'Use the skill in my current work': 'Workplace application' } }

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

function getSteps(targetSkill, currentAnswers = {}) {
  const skillStep = targetSkill ? skillQuestions[targetSkill] || [] : []
  const supportedSkill = Boolean(skillQuestions[targetSkill])
  const experienceStep = skillStep[0]
  const beginner = experienceStep && currentAnswers[experienceStep.key] === experienceStep.options[0]
  const orientation = skillOrientations[targetSkill]
  const quiz = beginnerQuizzes[targetSkill]
  const adaptiveSkillSteps = !supportedSkill && targetSkill
    ? [customDiscoveryOrientation, { ...customDiscoveryQuiz, key: `${targetSkill}-custom-quiz` }]
    : beginner && orientation && quiz
      ? [skillStep[0], { ...orientation, type: 'orientation', key: `${targetSkill}-orientation` }, { ...quiz, type: 'quiz' }]
      : skillStep
  return [
    { key: 'targetSkill', eyebrow: 'Choose your direction', question: 'What do you want to learn?', helper: 'Your choice determines the baseline questions, examples, projects, and pace we recommend.', options: skillOptions.map(([label]) => label) },
    ...commonSteps,
    ...adaptiveSkillSteps,
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

  const steps = useMemo(() => getSteps(answers.targetSkill, answers), [answers])
  const step = steps[Math.min(stepIndex, steps.length - 1)]
  const isLastStep = stepIndex === steps.length - 1
  const progress = ((stepIndex + 1) / steps.length) * 100
  const selectedAnswer = answers[step.key]
  const quizRecommendation = step.type === 'quiz' && selectedAnswer ? step.results[selectedAnswer] : ''

  async function handleSelect(value) {
    setError('')
    const updatedAnswers = { ...answers, [step.key]: value }
    setAnswers(updatedAnswers)
    setShowOtherInput(false)
    setOtherText('')
    if (isLastStep) await generateRoadmap(updatedAnswers)
    else setStepIndex(stepIndex + 1)
  }

  function handleContinue() {
    setError('')
    setStepIndex(stepIndex + 1)
  }

  function handleQuizSelect(value) {
    setError('')
    setAnswers((current) => ({ ...current, [step.key]: value, recommendedSubdomain: step.results[value] }))
  }

  function handleQuizContinue() {
    if (!selectedAnswer) return
    setError('')
    setStepIndex(stepIndex + 1)
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
      const weeklyMinutesByAnswer = {
        'Less than 5 hrs/week': 180,
        '5–10 hrs/week': 450,
        '10–20 hrs/week': 900,
        '20+ hrs/week (full-time)': 1800,
      }
      const isCuratedSkill = skillOptions.some(([label]) => label.toLowerCase() === String(finalAnswers.targetSkill || '').toLowerCase())
      let universalDiscovery = null
      if (!isCuratedSkill) {
        universalDiscovery = await discoverUniversalSkill({
          requestedSkill: finalAnswers.targetSkill,
          goal: finalAnswers.goal || '',
          currentLevel: finalAnswers.background === 'Student, no work experience' ? 'beginner' : 'unknown',
          weeklyMinutes: weeklyMinutesByAnswer[finalAnswers.availability] || null,
          locale: 'en',
        })
        if (universalDiscovery?.error) throw new Error(universalDiscovery.error)
        finalAnswers.universalSkillRequestId = universalDiscovery?.requestId || null
        finalAnswers.universalSkillGraphVersionId = universalDiscovery?.skillGraphVersionId || null
        finalAnswers.universalSkillStatus = universalDiscovery?.status || 'review'
      }
      const { data, error: fnError } = await supabase.functions.invoke('smart-task', { body: { assessment: finalAnswers } })
      if (fnError) throw fnError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      const { error: upsertError } = await supabase.from('profiles').upsert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name || null, username: user.user_metadata?.username || null, assessment: finalAnswers, roadmap: data.roadmap, onboarding_completed: true })
      if (upsertError) throw upsertError

      await updateLearnerPreferences({
        weeklyMinutes: weeklyMinutesByAnswer[finalAnswers.availability] || null,
        explanationStyle: finalAnswers.learningStyle || null,
      })

      const publishedSkill = await findPublishedSkillForTarget(finalAnswers.targetSkill)
      if (publishedSkill?.skills?.id) {
        const enrolment = await createSkillEnrolment({
          skillId: publishedSkill.skills.id,
          skillGraphVersionId: publishedSkill.id,
          weeklyMinutes: weeklyMinutesByAnswer[finalAnswers.availability] || null,
          targetOutcome: finalAnswers.goal || '',
        })
        logEvent(user.id, 'skill_enrolment_created', { skillId: publishedSkill.skills.id, enrolmentId: enrolment?.id, source: 'onboarding' })
      } else {
        logEvent(user.id, 'custom_skill_discovery_completed', { targetSkill: finalAnswers.targetSkill, requestId: universalDiscovery?.requestId || null, status: universalDiscovery?.status || 'review', source: 'onboarding' })
      }

      logEvent(user.id, 'onboarding_completed', { background: finalAnswers.background, goal: finalAnswers.goal, targetSkill: finalAnswers.targetSkill })
      navigate('/dashboard?welcome=first-mission')
    } catch (err) {
      console.error('Onboarding error:', err)
      setError("We couldn't build your roadmap right now. Your answers are still here—try again.")
      setGenerating(false)
    }
  }

  if (generating) return <OwlLoading message="Building your roadmap from your chosen skill, goals, and pace…" />

  return (
    <div className="min-h-screen" style={{ background: '#F4F7FB' }}>
      <header className="flex items-center justify-between px-6 py-5 sm:px-10"><div className="flex items-center gap-3"><img src="/datakwest_logo_lockup.png" alt="DataKwest logo" className="h-12 w-52 object-contain object-left" /><div><p className="text-sm font-black tracking-tight" style={{ color: '#0A2342' }}>DATAKWEST</p><p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8391A7' }}>Career operating system</p></div></div><div className="hidden sm:flex items-center gap-3 text-xs font-semibold" style={{ color: '#6B7A99' }}><span className="h-2 w-2 rounded-full" style={{ background: '#37A169' }} />Saved automatically <span className="mx-1" style={{ color: '#D6DEE9' }}>|</span><span>{stepIndex + 1} / {steps.length}</span></div></header>
      <main className="mx-auto grid max-w-6xl gap-8 px-6 pb-12 pt-4 lg:grid-cols-[0.75fr_1.25fr] lg:items-start lg:px-10 lg:pt-10">
        <aside className="hidden self-start lg:mt-[104px] lg:flex flex-col justify-between rounded-[2rem] p-10" style={{ background: '#0A2342', boxShadow: '0 18px 60px rgba(10,35,66,0.16)' }}><div><p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: '#D4AF37' }}>Build your advantage</p><h1 className="mt-5 text-4xl font-bold leading-[1.08] text-white">Start with where you want to go.</h1><p className="mt-5 text-sm leading-7" style={{ color: 'rgba(255,255,255,0.68)' }}>Choose a direction first. Then we will ask only the questions that help make that direction more relevant to you.</p></div><div className="space-y-5"><div className="h-px" style={{ background: 'rgba(255,255,255,0.14)' }} /><div className="flex gap-3"><div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(212,175,55,0.16)', color: '#D4AF37' }}>01</div><div><p className="text-sm font-bold text-white">Choose your direction</p><p className="mt-1 text-xs leading-5" style={{ color: 'rgba(255,255,255,0.55)' }}>Your skill choice shapes what comes next.</p></div></div><div className="flex gap-3"><div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>02</div><div><p className="text-sm font-bold text-white">Shape your path</p><p className="mt-1 text-xs leading-5" style={{ color: 'rgba(255,255,255,0.55)' }}>Your goals become missions you can actually complete.</p></div></div></div></aside>
        <section className="mx-auto w-full max-w-2xl">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#9A7610' }}>{step.eyebrow}</p><p className="mt-2 text-sm" style={{ color: '#6B7A99' }}>Your answers shape a more relevant learning experience.</p></div><button type="button" onClick={handleBack} disabled={stepIndex === 0} className="rounded-lg px-3 py-2 text-sm font-bold disabled:invisible" style={{ color: '#0A2342' }}>← Back</button></div>
          <div className="mb-6 flex items-center gap-4"><div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: '#E1E8F1' }}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #D4AF37, #E6C65C)' }} /></div><span className="text-xs font-bold" style={{ color: '#6B7A99' }}>{Math.round(progress)}%</span></div>
          <div key={step.key} data-onboarding-step={step.key} className="relative overflow-hidden rounded-[2rem] p-6 pt-7 sm:p-10 sm:pt-11" style={{ background: 'white', boxShadow: '0 18px 60px rgba(10,35,66,0.10)', borderTop: `5px solid ${step.type === 'orientation' ? '#8BC6B5' : step.type === 'quiz' ? '#8FB4E8' : '#D4AF37'}` }}><div className="mb-8"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ background: step.type === 'orientation' ? '#EAF7F1' : step.type === 'quiz' ? '#EEF4FF' : '#FFF5D8', color: step.type === 'orientation' ? '#2D8A5A' : step.type === 'quiz' ? '#2456A6' : '#967414' }}>{step.type === 'orientation' ? 'Learn the landscape' : step.type === 'quiz' ? 'Quick fit check' : `Question ${stepIndex + 1} of ${steps.length}`}</span><span className="text-[11px] font-semibold" style={{ color: '#8290A5' }}>{step.eyebrow}</span></div><h2 className="mt-5 text-3xl font-bold leading-tight sm:text-[2.15rem]" style={{ color: '#0A2342' }}>{step.question}</h2><p className="mt-3 max-w-xl text-sm leading-6" style={{ color: '#6B7A99' }}>{step.helper}</p></div>
            {error && <div role="alert" className="mb-5 flex gap-3 rounded-xl p-4 text-sm" style={{ background: '#FFF4F2', color: '#9C3F31' }}><span className="font-bold">!</span><span>{error}</span></div>}
            {step.type === 'quiz' ? <div><div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={step.question}>{step.options.map((option, index) => <button type="button" key={option} onClick={() => handleQuizSelect(option)} aria-checked={selectedAnswer === option} role="radio" className="flex min-h-[132px] items-start rounded-2xl border-2 p-4 text-left" style={{ borderColor: selectedAnswer === option ? '#D4AF37' : '#E6ECF4', background: selectedAnswer === option ? '#FFF9E8' : '#FBFCFE', color: '#0A2342' }}><span className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: selectedAnswer === option ? '#D4AF37' : '#EAF0F7', color: selectedAnswer === option ? '#0A2342' : '#416181' }}>{String.fromCharCode(65 + index)}</span><span className="text-sm font-bold leading-5">{option}</span></span></button>)}</div>{quizRecommendation && <div className="mt-6 rounded-2xl p-5" style={{ background: '#FFF9E8' }}><p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: '#967414' }}>Your suggested starting area</p><p className="mt-2 text-xl font-bold" style={{ color: '#0A2342' }}>{quizRecommendation}</p><p className="mt-2 text-sm leading-6" style={{ color: '#6B7A99' }}>This is a helpful first direction, not a permanent label. You can explore the other areas later.</p><button type="button" onClick={handleQuizContinue} className="mt-5 rounded-xl px-5 py-3 text-sm font-bold" style={{ background: '#D4AF37', color: '#0A2342' }}>Use this as my starting area</button></div>}</div> : step.type === 'orientation' ? <div><div className="grid gap-3 sm:grid-cols-2">{step.areas.map(([title, description], index) => <article key={title} className="rounded-2xl border p-5" style={{ borderColor: '#E2EAF3', background: '#FBFCFE' }}><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: '#EEF3FA', color: '#416181' }}>{String.fromCharCode(65 + index)}</span><div><h3 className="text-sm font-bold" style={{ color: '#0A2342' }}>{title}</h3><p className="mt-2 text-xs leading-5" style={{ color: '#6B7A99' }}>{description}</p></div></div></article>)}</div><div className="mt-6 rounded-2xl p-5" style={{ background: '#FFF9E8' }}><p className="text-sm font-bold" style={{ color: '#0A2342' }}>You do not need to choose a specialism yet.</p><p className="mt-2 text-sm leading-6" style={{ color: '#6B7A99' }}>Use this overview to notice what sounds interesting. Your first missions will still cover the fundamentals before moving deeper.</p></div><button type="button" onClick={handleContinue} className="mt-6 rounded-xl px-5 py-3 text-sm font-bold" style={{ background: '#D4AF37', color: '#0A2342' }}>Continue to discover your best starting area</button></div> : !showOtherInput ? <div className="grid auto-rows-[minmax(156px,1fr)] gap-3 sm:grid-cols-2" role="listbox" aria-label={step.question}>{step.options.map((option, index) => <button type="button" key={option} onClick={() => handleSelect(option)} aria-selected={selectedAnswer === option} className="group flex h-full min-h-[156px] items-start rounded-2xl border-2 p-4 text-left transition-all hover:-translate-y-0.5" style={{ borderColor: selectedAnswer === option ? '#D4AF37' : '#E6ECF4', background: selectedAnswer === option ? '#FFF9E8' : '#FBFCFE', color: '#0A2342', boxShadow: selectedAnswer === option ? '0 8px 22px rgba(212,175,55,0.14)' : 'none' }}><span className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: selectedAnswer === option ? '#D4AF37' : '#EAF0F7', color: selectedAnswer === option ? '#0A2342' : '#416181' }}>{String.fromCharCode(65 + index)}</span><span><span className="block text-sm font-bold leading-5">{option}</span><span className="mt-2 block text-xs leading-5" style={{ color: '#7B8AA0' }}>{optionDescriptions[option] || skillOptions.find(([label]) => label === option)?.[1] || 'We will use this to tailor your learning experience.'}</span></span></span></button>)}<button type="button" onClick={() => setShowOtherInput(true)} className="flex h-full min-h-[156px] items-start rounded-2xl border-2 border-dashed p-4 text-left text-sm font-bold" style={{ borderColor: '#D8E1EC', color: '#6B7A99', background: '#FCFDFE' }}><span className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: '#EEF3FA', color: '#416181' }}>＋</span><span>Something else<span className="mt-1 block text-xs font-normal" style={{ color: '#8A98AA' }}>Tell us in your own words</span></span></span></button></div> : <div className="rounded-2xl p-5" style={{ background: '#F7F9FC' }}><label className="text-sm font-bold" style={{ color: '#0A2342' }} htmlFor="other-answer">Your answer</label><input id="other-answer" type="text" value={otherText} onChange={(event) => setOtherText(event.target.value)} placeholder="Type your answer…" autoFocus className="mt-3 w-full rounded-xl border-2 bg-white px-4 py-3 text-sm outline-none" style={{ borderColor: '#D8E1EC', color: '#0A2342' }} onKeyDown={(event) => { if (event.key === 'Enter') handleOtherSubmit() }} /><div className="mt-4 flex gap-3"><button type="button" onClick={handleOtherSubmit} disabled={!otherText.trim()} className="rounded-xl px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50" style={{ background: '#D4AF37', color: '#0A2342' }}>Continue</button><button type="button" onClick={() => { setShowOtherInput(false); setOtherText('') }} className="rounded-xl px-5 py-3 text-sm font-bold" style={{ color: '#6B7A99' }}>Cancel</button></div></div>}
            <div className="mt-8 flex items-center justify-between border-t pt-5" style={{ borderColor: '#EDF1F6' }}><p className="text-xs" style={{ color: '#8A98AA' }}>You can go back and change any answer.</p><span className="text-xs font-bold" style={{ color: '#9A7610' }}>{isLastStep ? 'Ready to build your path' : 'Choose one to continue'}</span></div>
          </div>
        </section>
      </main>
    </div>
  )
}
