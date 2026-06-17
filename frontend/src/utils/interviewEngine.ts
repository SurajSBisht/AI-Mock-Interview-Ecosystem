import type { AIEvaluationResult, ConversationMessage, Response } from '../types'

const BACKEND_URL = 'http://localhost:3000/api/interview'

// Helper function to simulate network latency in fallback mode
function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// Extract a keyword from the answer to make fallback follow-up questions feel context-aware
function extractKeyword(answer: string): string {
  const words = answer.toLowerCase().split(/\W+/)
  const stopWords = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
    'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
    'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
    'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because',
    'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
    'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should',
    'now', 'really', 'also', 'worked', 'project', 'used', 'using', 'build', 'built', 'created'
  ])

  const candidates = words
    .filter(w => w.length > 3 && !stopWords.has(w))
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))

  return candidates[0] || 'your experience'
}

const TECHNICAL_QUESTIONS: Record<string, Record<string, string[]>> = {
  'Frontend Developer': {
    'React': [
      "Explain the difference between `useMemo` and `useCallback` in React. When and why would you use one over the other?",
      "How does the Virtual DOM work in React, and how does React 18's concurrent rendering change the performance model?",
      "What is your strategy for state management in large-scale React apps? When would you choose Zustand or Redux over the Context API?",
      "Explain the lifecycle of a React component and the difference between `useEffect` and `useLayoutEffect` hooks."
    ],
    'TypeScript': [
      "What is the difference between `type` aliases and `interface` declarations in TypeScript? When should you use each?",
      "Explain how TypeScript's conditional types and utility types like `ReturnType` or `Omit` work under the hood.",
      "How do you implement type guarding and type assertions in TypeScript to ensure compile-time and runtime safety?"
    ],
    'Accessibility': [
      "What are the core principles of WCAG? How do you ensure your web applications are fully accessible to keyboard and screen reader users?",
      "How do semantic HTML elements, ARIA attributes, and roles help screen readers navigate a complex single page web application?"
    ],
    'Performance': [
      "How would you measure and optimize a slow web application? Tell me about Core Web Vitals, code splitting, and asset optimization.",
      "Explain the concepts of debouncing and throttling, and how you would implement them to optimize user interactions in search boxes or scroll handlers."
    ]
  },
  'Backend Developer': {
    'Node.js': [
      "How does the Node.js event loop work? Explain phases like microtasks, timers, and I/O polling.",
      "Explain how you handle CPU-intensive tasks in Node.js. When would you use worker threads or cluster modules?",
      "What is the difference between streams and buffers in Node.js, and how do you use streams to handle large files?"
    ],
    'APIs': [
      "Explain the differences between REST, GraphQL, and gRPC. When would you prefer one protocol over another?",
      "How do you design a robust rate limiter for a public API? What algorithms (like token bucket or sliding window) would you use?",
      "Describe how you design API versioning, error handling, and structured logging in a production backend."
    ],
    'Databases': [
      "Explain SQL transaction isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable). What anomalies does each level prevent?",
      "How do database indexes speed up queries? What are the write performance trade-offs of over-indexing a table?",
      "When would you choose a NoSQL database (like MongoDB or Redis) over a relational database (like PostgreSQL)?"
    ],
    'Authentication': [
      "Explain how JWT authentication works. How do you store access and refresh tokens securely in a web application?",
      "What is OAuth 2.0? Describe the authorization code flow with PKCE and why it is recommended for single-page applications."
    ]
  },
  'Full Stack Developer': {
    'React': [
      "Describe the render process of a React application when fetching data. How do you prevent layout shifts and API fetch waterfalls?",
      "How do you design a component library that is easily reusable across different parts of a full stack application?"
    ],
    'Node.js': [
      "How do you coordinate backend processing with client-side rendering? Explain Server-Side Rendering (SSR) versus Client-Side Rendering (CSR).",
      "Describe how Node.js handles database connection pooling and how to scale connection pools dynamically."
    ],
    'APIs': [
      "How do you handle real-time data sync between client and server? Compare WebSockets, Server-Sent Events (SSE), and Long Polling.",
      "How do you secure your APIs from common web vulnerabilities like CSRF, XSS, and SQL Injection?"
    ],
    'System Design': [
      "Design a URL shortening service like Bitly. Explain the database schema, redirection mechanism, and caching layer.",
      "How would you scale a web application to support millions of concurrent users? Talk about load balancing, CDNs, and database replication."
    ]
  },
  'Data Scientist': {
    'Python': [
      "What are generators and decorators in Python? Explain how they are used to write memory-efficient and modular code.",
      "How do libraries like Pandas and NumPy optimize calculations internally compared to standard Python loops?"
    ],
    'SQL': [
      "Explain SQL window functions. How would you calculate a running total or a moving average using SQL?",
      "What is the difference between a subquery and a CTE (Common Table Expression), and how do you optimize complex joins?"
    ],
    'Machine Learning': [
      "Explain the bias-variance trade-off. How do you diagnose high bias versus high variance, and what are the techniques to address them?",
      "What is the difference between bagging and boosting algorithms? Give examples of random forest versus gradient boosting.",
      "How do you handle imbalanced datasets when training a classification model? Talk about downsampling, SMOTE, and metrics selection."
    ],
    'Statistics': [
      "What is the Central Limit Theorem, and why is it fundamental to hypothesis testing?",
      "Explain p-values and confidence intervals. How do you design and evaluate an A/B test for a new product feature?"
    ]
  },
  'DevOps Engineer': {
    'Docker': [
      "How do Docker containers isolate applications? Explain namespace, cgroups, and union filesystem under the hood.",
      "How do you write a secure and optimized multi-stage Dockerfile to minimize image sizes?"
    ],
    'Kubernetes': [
      "Explain the architecture of a Kubernetes control plane. What are the roles of API Server, etcd, Scheduler, and Controller Manager?",
      "What is the difference between a Kubernetes Pod, Deployment, Service, and Ingress? How do they enable horizontal scaling?"
    ],
    'CI/CD': [
      "Describe your ideal CI/CD pipeline. How do you integrate security scans, linting, automated testing, and canary deployments?",
      "What is GitOps? Explain how tools like ArgoCD or Flux manage state discrepancies between Git and a live cluster."
    ],
    'Cloud': [
      "Explain the concept of Infrastructure as Code (IaC). Why would you use Terraform over cloud-native templates like CloudFormation?",
      "How do you design a highly available, multi-region architecture in AWS or GCP, ensuring data redundancy and low latency?"
    ]
  },
  'HR': {
    'Communication': [
      "Describe a time you had to explain a complex technical concept to a non-technical stakeholder. How did you structure your explanation?",
      "How do you ensure clear alignment and keep team members updated when working on a cross-functional project?"
    ],
    'Conflict Resolution': [
      "Tell me about a disagreement you had with a peer or manager about a technical design. How did you approach the conversation and reach a resolution?",
      "How do you handle situations where a team member is not delivering on their commitments?"
    ],
    'Hiring': [
      "What key traits do you look for when assessing candidates? How do you assess technical growth potential and collaboration styles?",
      "How do you structure an onboarding process to help new hires become productive and integrated quickly?"
    ],
    'Culture': [
      "How do you define a healthy engineering culture? What specific practices or ceremonies do you champion to foster collaboration and psychological safety?",
      "How do you maintain motivation and keep a team aligned during times of high pressure or company pivots?"
    ]
  }
}

const BEHAVIORAL_QUESTIONS = [
  "Can you tell me about a time you faced a significant technical challenge or bottleneck? What was the situation, what actions did you take, and what was the outcome?",
  "Describe a scenario where you had to make a trade-off between code quality, performance, and meeting a tight deadline. How did you make the decision?",
  "Tell me about a time you worked on a project that failed or didn't meet expectations. What did you learn, and how did you apply those learnings to future projects?",
  "Can you share an experience where you had to learn a completely new technology or domain very quickly to deliver a critical task?"
]

/**
 * Generates the initial interview intro and first question.
 * Calls backend if active, otherwise falls back to local client generator.
 */
export async function generateInitialQuestion(
  role: string,
  focusAreas: string[],
  resumeContext?: string,
  durationMinutes?: number
): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
body: JSON.stringify({
  role,
  focusAreas,
  resumeContext,
  durationMinutes,
}),
    })

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`)
    }

    const data = await response.json()
    return data.question
  } catch (err) {
console.error(
  '[AI Interviewer] Backend start session failed FULL ERROR:',
  err
)
    return generateInitialQuestionFallback(role, focusAreas, resumeContext)
  }
}

export async function uploadResume(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('resume', file)

  const response = await fetch(`${BACKEND_URL}/upload-resume`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`)
  }

  const data = await response.json()
  return data.resumeText
}
/**
 * Local fallback question generator (starts session)
 */
async function generateInitialQuestionFallback(
  role: string,
  focusAreas: string[],
  resumeContext?: string
): Promise<string> {
  await sleep(1000)

  let intro = `Hi, I am Vox, your AI Interviewer today. We will be conducting a mock interview for the ${role} position.`
  if (focusAreas && focusAreas.length > 0) {
    intro += ` We will focus on key areas including ${focusAreas.join(', ')}.`
  }
  if (resumeContext && resumeContext.trim().length > 0) {
    intro += ` I've also reviewed your background context and summary.`
  }

  let question = "Let's start by having you introduce yourself and tell me about a recent project you worked on, your role, and the technology stack."
  if (focusAreas && focusAreas.length > 0) {
    const firstArea = focusAreas[0]
    const pool = TECHNICAL_QUESTIONS[role]?.[firstArea]
    if (pool && pool.length > 0) {
      question = `Let's begin with a question about ${firstArea}. ${pool[0]}`
    }
  }

  return `${intro} ${question}`
}

/**
 * Generates the next question based on transcript history.
 * Calls backend if active, otherwise falls back to local client generator.
 */
export async function generateNextQuestion(
  history: ConversationMessage[],
  role: string,
  focusAreas: string[],
  resumeContext?: string,
  durationMinutes?: number
): Promise<string> {
  try {
    // Format history for backend ChatMessage specifications
    const formattedHistory = history
      .filter((m) => m.speaker === 'candidate' || m.speaker === 'assistant')
      .map((m) => ({
        speaker: m.speaker,
        content: m.content,
      }))

    const response = await fetch(`${BACKEND_URL}/next`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
     body: JSON.stringify({
  history: formattedHistory,
  role,
  focusAreas,
  resumeContext,
  durationMinutes,
}),
    })

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`)
    }

    const data = await response.json()
    return data.question
  } catch (err) {
console.error(
  '[AI Interviewer] Backend next question failed FULL ERROR:',
  err
)
  return generateNextQuestionFallback(history, role, focusAreas, resumeContext)
  }
}

/**
 * Local fallback question generator (next turn)
 */
async function generateNextQuestionFallback(
  history: ConversationMessage[],
  role: string,
  focusAreas: string[],
  resumeContext?: string
): Promise<string> {
  await sleep(1500)

  const candidateMessages = history.filter((m) => m.speaker === 'candidate')
  const turnIndex = candidateMessages.length

  if (turnIndex === 0) {
    return generateInitialQuestionFallback(role, focusAreas, resumeContext)
  }

  const lastAnswerText = candidateMessages[candidateMessages.length - 1]?.content || ''

  if (lastAnswerText.split(/\s+/).length < 8) {
    return "Thank you. Could you expand on that answer a bit? I'd like to hear more details about your specific approach or any concrete examples from your past projects."
  }

  if (turnIndex === 1) {
    const topic = focusAreas[0] || 'your experience'
    const keyword = extractKeyword(lastAnswerText) || topic
    return `That makes sense. Drilling down into what you said about "${keyword}", what are the main edge cases or performance bottlenecks you would watch out for in a production environment?`
  }

  if (turnIndex === 2 && focusAreas.length > 1) {
    const secondArea = focusAreas[1]
    const pool = TECHNICAL_QUESTIONS[role]?.[secondArea]
    if (pool && pool.length > 0) {
      const q = pool[Math.floor(Math.random() * pool.length)]
      return `Thank you for those details. Let's switch gears and talk about ${secondArea}. ${q}`
    }
  }

  if (turnIndex === 3) {
    if (focusAreas.length > 2) {
      const thirdArea = focusAreas[2]
      const pool = TECHNICAL_QUESTIONS[role]?.[thirdArea]
      if (pool && pool.length > 0) {
        const q = pool[Math.floor(Math.random() * pool.length)]
        return `Interesting points. Let's move on to ${thirdArea}. ${q}`
      }
    }
    return "Great. Let's talk about testing and deployment. How do you ensure your code is thoroughly tested and verified before releasing it to users?"
  }

  if (turnIndex === 4) {
    const q = BEHAVIORAL_QUESTIONS[Math.floor(Math.random() * BEHAVIORAL_QUESTIONS.length)]
    return `Excellent response. Now let's focus on a behavioral scenario. ${q}`
  }

  return "Thank you for sharing that. It has been a pleasure talking with you today. That concludes the structured portion of our mock interview. Do you have any final questions for me, or is there anything else you'd like to highlight about your background before we finish?"
}

/**
 * Synthesizes evaluation and score reports.
 * Calls backend if active, otherwise falls back to local generator.
 */
export async function generateEvaluation(
  history: ConversationMessage[],
  role: string,
  focusAreas: string[],
  resumeContext?: string
): Promise<AIEvaluationResult> {
  try {
    const formattedHistory = history
      .filter((m) => m.speaker === 'candidate' || m.speaker === 'assistant')
      .map((m) => ({
        speaker: m.speaker,
        content: m.content,
      }))

    const response = await fetch(`${BACKEND_URL}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history: formattedHistory,
        role,
        focusAreas,
        resumeContext,
      }),
    })

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (err) {
    console.warn('[AI Interviewer] Backend evaluation failed. Falling back to local scoring simulation.', err)
    return generateEvaluationFallback(history, role, focusAreas, resumeContext)
  }
}

/**
 * Local fallback evaluation synthesis generator
 */
async function generateEvaluationFallback(
  history: ConversationMessage[],
  role: string,
  focusAreas: string[],
  resumeContext?: string
): Promise<AIEvaluationResult> {
  void resumeContext
  await sleep(2000)

  const candidateMessages = history.filter((m) => m.speaker === 'candidate')
  const answerCount = candidateMessages.length

  const totalWords = candidateMessages.reduce((sum, message) => sum + message.content.split(/\s+/).filter(Boolean).length, 0)
  const avgLength = answerCount > 0 ? totalWords / answerCount : 0
  const transcript = candidateMessages.map((message) => message.content.toLowerCase()).join(' ')

  const uncertaintyMatches = ["i don't know", 'not sure', "can't remember", 'skip', 'change topic', 'maybe'].reduce(
    (count, phrase) => count + (transcript.split(phrase).length - 1),
    0,
  )
  const leadershipMatches = ['led', 'owned', 'collaborated', 'partnered', 'mentored', 'initiated', 'resolved'].reduce(
    (count, keyword) => count + (transcript.split(keyword).length - 1),
    0,
  )
  const problemSolvingMatches = ['debug', 'trade-off', 'trade off', 'optimiz', 'root cause', 'hypothesi', 'performance'].reduce(
    (count, keyword) => count + (transcript.split(keyword).length - 1),
    0,
  )

  const roleText = role.toLowerCase()
  const roleKeywords = roleText.includes('frontend')
    ? ['react', 'typescript', 'javascript', 'css', 'component', 'state', 'render']
    : roleText.includes('backend')
      ? ['api', 'database', 'system design', 'auth', 'performance', 'cache']
      : roleText.includes('hr')
        ? ['communication', 'hiring', 'stakeholder', 'conflict', 'leadership']
        : ['project', 'implementation', 'architecture', 'testing']

  const technicalMatches = roleKeywords.reduce((count, keyword) => count + (transcript.split(keyword).length - 1), 0)
  const structuredMarkers = ['first', 'second', 'finally', 'for example', 'because', 'in summary'].reduce(
    (count, keyword) => count + (transcript.split(keyword).length - 1),
    0,
  )

  const communicationScore = Math.max(0, Math.min(100, Math.round(45 + avgLength * 0.5 + structuredMarkers * 4 - uncertaintyMatches * 4)))
  const confidenceScore = Math.max(0, Math.min(100, Math.round(48 + leadershipMatches * 3 - uncertaintyMatches * 7 + Math.max(0, avgLength - 15) * 0.2)))
  const leadershipScore = Math.max(50, Math.min(100, Math.round(56 + leadershipMatches * 5 - uncertaintyMatches * 2)))
  const technicalScore = Math.max(0, Math.min(100, Math.round(44 + technicalMatches * 4 + focusAreas.length * 3 + avgLength * 0.1)))
  const problemSolvingScore = Math.max(0, Math.min(100, Math.round(46 + problemSolvingMatches * 5 + technicalMatches * 1.5 - uncertaintyMatches * 2)))
  const overallScore = Math.round((communicationScore + confidenceScore + leadershipScore + technicalScore + problemSolvingScore) / 5)

  const radarChart = {
    communication: communicationScore,
    confidence: confidenceScore,
    leadership: leadershipScore,
    technical: technicalScore,
    problemSolving: problemSolvingScore,
  }

  const strengths = [
    avgLength >= 25
      ? 'Provided detailed answers with enough context to evaluate reasoning.'
      : 'Stayed responsive and answered the interview prompts directly.',
    technicalMatches > 0
      ? `Referenced role-relevant concepts tied to ${role}.`
      : 'Stayed engaged with the interview flow and explained ideas as asked.',
  ]

  if (structuredMarkers > 0) {
    strengths.push('Used some structure in explanations, which improved clarity.')
  }

  const opportunities = [
    'Add more concrete examples and decision-making detail to longer answers.',
  ]

  if (uncertaintyMatches > 0) {
    opportunities.push('Reduce repeated uncertainty language and answer with partial reasoning when exact recall is difficult.')
  }

  if (problemSolvingScore < 75) {
    opportunities.push('Explain the debugging path, alternatives, and trade-offs more explicitly.')
  }

  if (focusAreas.length > 0) {
    opportunities.push(`Deepen coverage of ${focusAreas[0]} with real project evidence.`)
  }

  const recommendedTopics = [
    ...(roleText.includes('frontend')
      ? ['React component architecture', 'TypeScript typing for complex UI flows']
      : roleText.includes('backend')
        ? ['API design and database trade-offs', 'System design and caching strategies']
        : roleText.includes('hr')
          ? ['Stakeholder communication', 'Conflict resolution and hiring calibration']
          : ['Role-specific project depth', 'Implementation trade-offs']),
    'Debugging and trade-off explanation',
    ...(focusAreas.length > 0 ? [`Deepen coverage of ${focusAreas[0]}`] : []),
  ].slice(0, 5)

  const scoreJustification = {
    communication: `Communication score: ${communicationScore}. Evidence: average answer length was ${avgLength.toFixed(1)} words with ${structuredMarkers} structure markers. Reduction: ${uncertaintyMatches} uncertainty phrases and shorter answers reduced clarity.`,
    confidence: `Confidence score: ${confidenceScore}. Evidence: ${leadershipMatches} ownership markers appeared in the transcript. Reduction: repeated uncertainty language lowered decisiveness.`,
    leadership: `Leadership score: ${leadershipScore}. Evidence: ${leadershipMatches} leadership or collaboration signals were present. Reduction: the transcript had limited explicit leadership stories, so the score stayed at a baseline instead of zero.`,
    technical: `Technical score: ${technicalScore}. Evidence: ${technicalMatches} role-relevant terms matched ${role}. Reduction: the transcript did not always show deep implementation detail.`,
    problemSolving: `Problem solving score: ${problemSolvingScore}. Evidence: ${problemSolvingMatches} reasoning or debugging markers were detected. Reduction: the candidate could explain trade-offs more explicitly.`,
  }

  const responses: Response[] = candidateMessages.map((candidateMsg, index) => {
    const answerWords = candidateMsg.content.split(/\s+/).filter(Boolean).length
    const answerScore = Math.max(1, Math.min(100, Math.round(overallScore + (answerWords > 20 ? 5 : -8) - uncertaintyMatches * 2)))

    return {
      id: `resp-${index}-${Date.now()}`,
      sessionId: candidateMsg.sessionId,
      questionId: `q-${index}`,
      answerText: candidateMsg.content,
      score: answerScore,
      feedback:
        answerWords < 20
          ? 'The answer is understandable, but it would be stronger with more detail, a concrete example, and clearer reasoning.'
          : 'The answer is well developed and shows stronger structure and relevance.',
      goodPoints: [
        'Addressed the prompt directly.',
        answerWords >= 20 ? 'Provided supporting detail.' : 'Stayed concise.',
      ],
      improvements: [
        'Add a concrete example.',
        'Explain the trade-offs or reasoning behind your approach.',
      ],
    }
  })

  return {
    sessionId: history[0]?.sessionId || `session-${Date.now()}`,
    summary: `The candidate completed a ${overallScore >= 80 ? 'strong' : overallScore >= 65 ? 'solid' : 'developing'} mock interview for the ${role} position. The clearest evidence showed up in ${focusAreas.join(', ') || 'role fundamentals'}, with more room to deepen technical reasoning and answer structure.`,
    strengths,
    opportunities,
    recommendedTopics,
    followUpThemes: recommendedTopics,
    scoreJustification,
    radarChart,
    communicationScore,
    confidenceScore,
    leadershipScore,
    technicalScore,
    problemSolvingScore,
    overallScore,
    confidence: Math.max(55, Math.min(95, Math.round(70 + avgLength / 5 - uncertaintyMatches * 5))),
    dimensions: [
      { dimension: 'Communication', score: communicationScore / 10 },
      { dimension: 'Confidence', score: confidenceScore / 10 },
      { dimension: 'Leadership', score: leadershipScore / 10 },
      { dimension: 'Technical', score: technicalScore / 10 },
      { dimension: 'Problem Solving', score: problemSolvingScore / 10 },
    ],
    responses,
  }
}
