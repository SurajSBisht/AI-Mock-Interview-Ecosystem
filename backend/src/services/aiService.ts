import Groq from 'groq-sdk'
import dotenv from 'dotenv'

dotenv.config()

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

const MODEL_NAME = 'llama-3.3-70b-versatile'

export interface ChatMessage {
  speaker: 'assistant' | 'candidate' | 'system'
  content: string
}

interface EvaluationScoreJustification {
  communication: string
  confidence: string
  leadership: string
  technical: string
  problemSolving: string
}

interface RadarChartScores {
  communication: number
  confidence: number
  leadership: number
  technical: number
  problemSolving: number
}

interface InterviewEvaluationResult {
  summary: string
  strengths: string[]
  opportunities: string[]
  recommendedTopics: string[]
  scoreJustification: EvaluationScoreJustification
  radarChart: RadarChartScores
  communicationScore: number
  confidenceScore: number
  leadershipScore: number
  technicalScore: number
  problemSolvingScore: number
  overallScore: number
  confidence: number
  followUpThemes?: string[]
  dimensions?: { dimension: string; score: number }[]
  responses?: Array<{
    questionId: string
    answerText: string
    score: number
    feedback: string
    goodPoints: string[]
    improvements: string[]
  }>
}

/**
 * Ask Vox to generate the opening question
 */
export async function askInitialQuestion(
  role: string,
  focusAreas: string[],
  resumeContext?: string,
  durationMinutes?: number
): Promise<string> {

let prompt = `Job Role: ${role}\n`

if (focusAreas && focusAreas.length > 0) {
prompt += `Focus Areas: ${focusAreas.join(', ')}\n`
}

if (resumeContext && resumeContext.trim().length > 0) {
prompt += `Candidate Background Context: ${resumeContext}\n`
}
if (durationMinutes) {
  prompt += `Interview Duration: ${durationMinutes} minutes\n`
}
prompt += `

You are Vox, a professional, friendly, and expert AI Interviewer.

Your job is to:

* Greet the candidate.
* Introduce yourself.
* Start a realistic interview.
* Interview Style Rules:

* If duration is 15 minutes:
  - Conduct a quick practice interview.
  - Focus on fundamentals.
  - Keep questions concise.
  - Limit follow-up questions.

* If duration is 30 minutes:
  - Conduct a balanced interview.
  - Mix fundamentals, projects, resume-based questions, and behavioral questions.

* If duration is 45 minutes:
  - Conduct a deep interview.
  - Explore projects and resume experience in greater detail.
  - Use more follow-up questions when appropriate.
  - Include advanced role-specific questions.
* Ask ONLY ONE opening question.
* Keep response concise (1-3 sentences).
* Speak naturally like a human interviewer.

Do not provide feedback yet.

Begin the interview now.
`

const completion = await groq.chat.completions.create({
model: MODEL_NAME,
messages: [
{
role: 'user',
content: prompt
}
],
temperature: 0.8
})

return completion.choices[0]?.message?.content?.trim() || 'Hello, welcome to the interview.'
}


/**
 * Ask Vox to generate the next question based on history
 */
export async function askNextQuestion(
  history: ChatMessage[],
  role: string,
  focusAreas: string[],
  resumeContext?: string,
  durationMinutes?: number
): Promise<string> {

let prompt = `You are Vox, a professional, friendly, and intelligent AI Interviewer conducting a mock interview for a ${role} position.

Focus Areas:
${focusAreas.join(', ')}

Interview Duration:
${durationMinutes ?? 30} minutes

Rules:

* Ask ONLY ONE question at a time.

* Keep responses concise (1-3 sentences).

* Behave like a real interviewer.

* Maintain conversation memory.
* Interview Intelligence Rules:

  * If a candidate repeatedly says they do not know a topic, cannot remember it, have no experience with it, or cannot answer it:

    * Treat that topic as a known weak area.
    * Do not repeatedly ask questions from the same topic.
    * Do not keep rephrasing the same concept.

  * After two unsuccessful attempts on the same topic:

    * Move to a different topic.
    * Explore projects, databases, programming languages, academics, teamwork, leadership, internships, problem solving, or other skills from the resume.

  * The goal is to evaluate the candidate, not trap them in one weak area.

  * If the candidate struggles with the selected technology stack:

    * Evaluate transferable skills.
    * Evaluate programming fundamentals.
    * Evaluate projects.
    * Evaluate databases.
    * Evaluate problem solving ability.
    * Evaluate teamwork and leadership.
    * Evaluate learning ability.

  * Do not force every question to connect back to the selected role or technology stack.

  * If the candidate fails three consecutive technical questions:

    * Reduce difficulty.
    * Move to easier concepts.
    * Discuss practical projects.
    * Explore strengths instead of repeatedly focusing on weaknesses.

  * Remember topics the candidate answered well and topics they repeatedly failed to answer.

  * Spend more time evaluating strengths after weaknesses have been identified.

* Interview Length Guidelines:

  * 15 Minute Mode (Quick Practice):
    - Fast-paced interview.
    - Focus on fundamentals and core concepts.
    - Keep follow-up questions limited.
    - Resume questions should be occasional.

  * 30 Minute Mode (Standard Interview):
    - Balanced interview.
    - Mix role-based, project-based, behavioral, and resume-based questions.
    - Moderate follow-up questioning.

  * 45 Minute Mode (Deep Interview):
    - Conduct a comprehensive interview.
    - Explore projects and resume experience in greater depth.
    - Use more follow-up questions when valuable.
    - Include advanced role-specific questions.

* Question Distribution:

  * 15 Minutes:
    - 20% resume-based
    - 80% role-based

  * 30 Minutes:
    - 30% resume-based
    - 70% role-based

  * 45 Minutes:
    - 40% resume-based
    - 60% role-based

* Avoid repeating questions.

* Resume Usage Guidelines:

  * The candidate's resume is available and should be used as one source of context, not the entire interview.

  * Around 30-40% of questions may reference projects, skills, technologies, internships, certifications, or experiences mentioned in the resume.

  * Around 60-70% of questions should be normal role-based interview questions that any candidate for this role should be able to answer.

  * Use resume information naturally and only when relevant.

  * Do not repeatedly summarize the resume.

  * Do not repeatedly mention the same skills, technologies, projects, or experiences.

  * After discussing a resume item once or twice, move the conversation to a different topic.

  * Do not force connections between every resume skill and the selected job role.

  * If the candidate struggles with a resume-related topic, switch to another relevant topic instead of repeatedly asking similar questions.

  * Ask questions as a human interviewer would, not as a resume analyzer.

  * Vary your conversation style:

    * Sometimes ask direct questions.
    * Sometimes ask follow-up questions.
    * Sometimes switch topics naturally.

  * Avoid repetitive interviewer phrases such as:

    * "It seems like..."
    * "I notice that..."
    * "Let's review your technical skills..."
    * "You have a strong foundation in..."

  * Speak naturally and conversationally.

  * Do not repeat information that has already been discussed unless it is necessary for a follow-up question.

* If the candidate says:
  "I don't know"
  "Not sure"
  "Skip"
  "Change topic"
  "Next question"

  Then:

  * Do NOT ask them to elaborate.
  * Move to another topic.
  * Or ask an easier question.
* If resume information is available:

  * Use resume-based questions only occasionally.
  * Around 30-40% of questions may reference the resume.
  * Around 60-70% of questions should be normal role-based interview questions.

* Do NOT repeatedly summarize the candidate's resume.

* Do NOT repeatedly say phrases such as:

  * "It seems like you have a strong foundation..."
  * "I notice that you have experience..."
  * "Let's review your technical skills..."

* Mention resume details naturally and only when relevant.

* After discussing a resume project or skill once, move the conversation forward instead of repeating the same resume information.

* If the candidate asks to change a topic:

  * Respect the request.
  * Choose a different topic.
  * Do not ask the same concept again in a different wording.

* Avoid repetitive interviewer phrases.

* Vary your responses naturally like a human interviewer.

* Sometimes ask direct questions without any introduction.

Examples:

Good:
"What was the most challenging part of building that project?"

Good:
"Let's switch gears. How do you usually debug frontend issues?"

Good:
"Can you explain event bubbling in JavaScript?"

Bad:
"It seems like you have a strong foundation in..."
"It seems like..."
"I notice that..."
"Let's review your technical skills..."

* If the role is HR:

  * Focus on communication, leadership, teamwork, hiring, conflict resolution, culture, stakeholder management and decision making.
  * Do NOT switch into software engineering interviews.

Conversation History:
Before asking the next question, first evaluate the quality of the candidate's most recent answer.

Answer Categories:

A) INCOMPLETE ANSWER
Examples:

* "my name is"
* "I am"
* "because"
* "not sure"
  (without further explanation)

If the answer appears unfinished, cut off, or incomplete:

* Do NOT move to a new topic.
* Do NOT ask a new interview question.
* Politely ask the candidate to continue.
* Encourage them to provide more detail.

Example:
Candidate: "my name is"

AI:
"It seems your introduction is incomplete. Please tell me a little more about yourself, your background, education, or experience."

B) REFUSAL / SKIP ANSWER
Examples:

* "I don't know"
* "Skip"
* "Next question"
* "Change topic"

In this case:

* Do NOT ask for elaboration.
* Move to a different topic or ask an easier question.

C) IRRELEVANT ANSWER

If the answer does not address the question:

* Briefly explain that the answer did not address the question.
* Rephrase the original question in a simpler way.
D) STRONG ANSWER

If the answer is detailed and relevant:

* Either ask a deeper follow-up question OR move naturally to a different topic.
* Do not stay on the same topic for more than 2 consecutive questions unless the discussion is highly valuable.

E) NORMAL ANSWER

If the answer is relevant but not very detailed:

* Ask one clarification question OR continue naturally.
Never assume a topic has been answered if the candidate's response is shorter than a complete sentence or appears unfinished.


`

history.forEach((msg) => {
const speaker =
msg.speaker === 'assistant'
? 'Vox'
: msg.speaker === 'candidate'
? 'Candidate'
: 'System'


prompt += `${speaker}: ${msg.content}\n`


})

if (resumeContext && resumeContext.trim()) {
prompt += `\nCandidate Resume Context:\n${resumeContext}\n`
}

prompt += `\nVox:`

const completion = await groq.chat.completions.create({
model: MODEL_NAME,
messages: [
{
role: 'user',
content: prompt
}
],
temperature: 0.8
})

return completion.choices[0]?.message?.content?.trim() || 'Can you tell me more about your experience?'
}

const UNCERTAINTY_PHRASES = [
  "i don't know",
  'not sure',
  "can't remember",
  'cant remember',
  'skip',
  'change topic',
  'maybe',
]

const COMMUNICATION_MARKERS = [
  'first',
  'second',
  'third',
  'finally',
  'for example',
  'in summary',
  'to be specific',
  'because',
]

const LEADERSHIP_MARKERS = [
  'led',
  'owned',
  'owned the',
  'coordinated',
  'collaborated',
  'partnered',
  'mentored',
  'responsible',
  'initiated',
  'decided',
  'drove',
  'aligned',
  'resolved',
]

const PROBLEM_SOLVING_MARKERS = [
  'debug',
  'root cause',
  'trade-off',
  'trade off',
  'analy',
  'hypothesi',
  'optimiz',
  'measure',
  'test',
  'iterate',
  'instrument',
  'performance',
  'latency',
  'scal',
  'decision',
]

const TECH_KEYWORDS_BY_ROLE: Record<string, string[]> = {
  frontend: ['react', 'typescript', 'javascript', 'css', 'html', 'accessibility', 'component', 'state', 'render', 'performance', 'architecture'],
  backend: ['api', 'apis', 'database', 'databases', 'system design', 'performance', 'auth', 'authentication', 'cache', 'scalability', 'node', 'express'],
  hr: ['communication', 'hiring', 'stakeholder', 'conflict', 'culture', 'teamwork', 'feedback', 'leadership'],
  generic: ['project', 'implementation', 'architecture', 'workflow', 'testing', 'design'],
}

function clampScore(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) {
    return min
  }

  return Math.max(min, Math.min(max, Math.round(value)))
}

function normalizeScore(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampScore(value)
  }

  return clampScore(fallback)
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function countOccurrences(text: string, phrases: string[]): number {
  const lowerText = text.toLowerCase()

  return phrases.reduce((total, phrase) => {
    const needle = phrase.toLowerCase()
    if (!needle) {
      return total
    }

    let index = 0
    let count = 0
    while ((index = lowerText.indexOf(needle, index)) !== -1) {
      count += 1
      index += needle.length
    }

    return total + count
  }, 0)
}

function extractTranscript(history: ChatMessage[]): { transcript: string; candidateAnswers: string[] } {
  const candidateAnswers: string[] = []
  let transcript = ''

  history.forEach((msg) => {
    const speaker =
      msg.speaker === 'assistant'
        ? 'Vox'
        : msg.speaker === 'candidate'
          ? 'Candidate'
          : 'System'

    transcript += `${speaker}: ${msg.content}\n`

    if (msg.speaker === 'candidate') {
      candidateAnswers.push(msg.content)
    }
  })

  return { transcript, candidateAnswers }
}

function buildRoleKeywords(role: string, focusAreas: string[]): string[] {
  const lowerRole = role.toLowerCase()

  if (lowerRole.includes('frontend')) return TECH_KEYWORDS_BY_ROLE.frontend
  if (lowerRole.includes('backend')) return TECH_KEYWORDS_BY_ROLE.backend
  if (lowerRole.includes('hr') || lowerRole.includes('recruit') || lowerRole.includes('talent')) return TECH_KEYWORDS_BY_ROLE.hr

  const focusKeywords = focusAreas
    .map((item) => item.toLowerCase())
    .filter(Boolean)

  return [...TECH_KEYWORDS_BY_ROLE.generic, ...focusKeywords]
}

function analyzeTranscript(history: ChatMessage[], role: string, focusAreas: string[]) {
  const { transcript, candidateAnswers } = extractTranscript(history)
  const lowerTranscript = transcript.toLowerCase()
  const totalWords = candidateAnswers.reduce((sum, answer) => sum + answer.trim().split(/\s+/).filter(Boolean).length, 0)
  const averageWords = candidateAnswers.length > 0 ? totalWords / candidateAnswers.length : 0

  const uncertaintyCount = countOccurrences(lowerTranscript, UNCERTAINTY_PHRASES)
  const communicationCount = countOccurrences(lowerTranscript, COMMUNICATION_MARKERS)
  const leadershipCount = countOccurrences(lowerTranscript, LEADERSHIP_MARKERS)
  const problemSolvingCount = countOccurrences(lowerTranscript, PROBLEM_SOLVING_MARKERS)

  const roleKeywords = buildRoleKeywords(role, focusAreas)
  const technicalCount = roleKeywords.reduce((count, keyword) => {
    if (!keyword) {
      return count
    }

    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const matches = lowerTranscript.match(regex)
    return count + (matches?.length || 0)
  }, 0)

  const shortAnswers = candidateAnswers.filter((answer) => answer.trim().split(/\s+/).filter(Boolean).length < 8).length
  const detailedAnswers = candidateAnswers.filter((answer) => answer.trim().split(/\s+/).filter(Boolean).length >= 25).length

  const communicationScore = clampScore(
    42 + averageWords * 0.55 + communicationCount * 5 + detailedAnswers * 4 - shortAnswers * 5 - uncertaintyCount * 3,
  )
  const confidenceScore = clampScore(
    48 + leadershipCount * 3 + detailedAnswers * 3 - uncertaintyCount * 7 - shortAnswers * 2,
  )
  const leadershipScore = clampScore(
    56 + leadershipCount * 5 + detailedAnswers * 2 - uncertaintyCount * 2,
  )
  const technicalScore = clampScore(
    44 + technicalCount * 4 + focusAreas.length * 2 + averageWords * 0.15,
  )
  const problemSolvingScore = clampScore(
    45 + problemSolvingCount * 5 + technicalCount * 1.5 + communicationCount * 1.5 - uncertaintyCount * 2,
  )

  return {
    transcript,
    candidateAnswers,
    averageWords,
    uncertaintyCount,
    communicationCount,
    leadershipCount,
    problemSolvingCount,
    technicalCount,
    shortAnswers,
    detailedAnswers,
    communicationScore,
    confidenceScore,
    leadershipScore,
    technicalScore,
    problemSolvingScore,
  }
}

function buildRecommendedTopics(role: string, focusAreas: string[], scores: RadarChartScores): string[] {
  const topics: string[] = []
  const lowerRole = role.toLowerCase()

  if (scores.technical < 80) {
    if (lowerRole.includes('frontend')) {
      topics.push('React component design and rendering performance')
      topics.push('TypeScript typing strategies for complex UI states')
    } else if (lowerRole.includes('backend')) {
      topics.push('API design, database trade-offs, and caching')
      topics.push('System design for reliability and performance')
    } else if (lowerRole.includes('hr')) {
      topics.push('Stakeholder communication and conflict resolution')
      topics.push('Hiring process calibration and structured interviewing')
    } else {
      topics.push('Role-specific technical depth and project implementation details')
    }
  }

  if (scores.problemSolving < 80) {
    topics.push('Debugging approach and trade-off explanation')
  }

  if (scores.confidence < 80) {
    topics.push('Answering with clearer ownership and more decisive language')
  }

  if (focusAreas.length > 0) {
    topics.push(`Deepen coverage of ${focusAreas[0]}`)
  }

  return Array.from(new Set(topics)).slice(0, 5)
}

function buildJustification(label: string, score: number, evidence: string, reduction: string): string {
  return `${label}: ${score}. Evidence: ${evidence} Reduction: ${reduction}.`
}

function buildFallbackEvaluation(history: ChatMessage[], role: string, focusAreas: string[]): InterviewEvaluationResult {
  const analysis = analyzeTranscript(history, role, focusAreas)
  const radarChart: RadarChartScores = {
    communication: analysis.communicationScore,
    confidence: analysis.confidenceScore,
    leadership: analysis.leadershipScore,
    technical: analysis.technicalScore,
    problemSolving: analysis.problemSolvingScore,
  }

  const overallScore = clampScore(
    (radarChart.communication + radarChart.confidence + radarChart.leadership + radarChart.technical + radarChart.problemSolving) / 5,
  )

  const candidateCount = analysis.candidateAnswers.length
  const uncertaintyExample = UNCERTAINTY_PHRASES.find((phrase) => analysis.transcript.toLowerCase().includes(phrase))
  const summaryTone = overallScore >= 80 ? 'strong' : overallScore >= 65 ? 'solid' : 'developing'

  const strengths = [
    analysis.detailedAnswers > 0
      ? 'Provided at least one detailed answer with useful context and explanation.'
      : 'Stayed engaged throughout the interview and responded to prompts.',
  ]

  if (radarChart.communication >= 75) {
    strengths.push('Communicated ideas in a generally structured and understandable way.')
  }

  if (radarChart.technical >= 75) {
    strengths.push('Demonstrated relevant role-specific technical awareness.')
  }

  if (radarChart.confidence >= 75) {
    strengths.push('Showed ownership and confidence in several responses.')
  }

  const opportunities = [
    analysis.shortAnswers > 0
      ? 'Expand shorter responses with more context, trade-offs, and concrete examples.'
      : 'Continue strengthening answer depth and precision in higher-pressure questions.',
  ]

  if (analysis.uncertaintyCount > 0) {
    opportunities.push('Reduce uncertainty language such as "not sure" or "I do not know" by sharing partial reasoning when possible.')
  }

  if (radarChart.problemSolving < 75) {
    opportunities.push('Explain debugging steps, alternatives, and trade-offs more explicitly.')
  }

  const scoreJustification: EvaluationScoreJustification = {
    communication: buildJustification(
      'Communication score',
      radarChart.communication,
      `${analysis.communicationCount} structure markers were present across ${candidateCount} candidate answers, with an average answer length of ${analysis.averageWords.toFixed(1)} words.`,
      `${analysis.shortAnswers} short answers and ${analysis.uncertaintyCount} uncertainty phrases lowered clarity and completeness.`,
    ),
    confidence: buildJustification(
      'Confidence score',
      radarChart.confidence,
      `${analysis.leadershipCount} ownership and action-oriented markers appeared in the transcript.`,
      `${analysis.uncertaintyCount} uncertainty phrases${uncertaintyExample ? ` including "${uncertaintyExample}"` : ''} reduced decisiveness.`,
    ),
    leadership: buildJustification(
      'Leadership score',
      radarChart.leadership,
      `${analysis.leadershipCount} leadership or collaboration signals were detected, including ownership language where the candidate described work.`,
      'A limited number of explicit leadership stories kept the score at a baseline rather than a top-band result.',
    ),
    technical: buildJustification(
      'Technical score',
      radarChart.technical,
      `${analysis.technicalCount} role-relevant technical terms matched the selected role and focus areas.`,
      'The score was capped because the transcript did not consistently show deep implementation detail on every answer.',
    ),
    problemSolving: buildJustification(
      'Problem solving score',
      radarChart.problemSolving,
      `${analysis.problemSolvingCount} reasoning markers such as debugging, trade-off, and optimization language were observed.`,
      'More explicit step-by-step reasoning would make the approach easier to evaluate.',
    ),
  }

  const recommendedTopics = buildRecommendedTopics(role, focusAreas, radarChart)

  return {
    summary: `This ${summaryTone} interview for the ${role} role showed ${overallScore >= 80 ? 'strong' : 'moderate'} performance across communication, technical depth, and reasoning. The candidate answered ${candidateCount} questions with the clearest evidence in ${focusAreas.length > 0 ? focusAreas.join(', ') : 'role fundamentals'}.`,
    strengths,
    opportunities,
    recommendedTopics,
    scoreJustification,
    radarChart,
    communicationScore: radarChart.communication,
    confidenceScore: radarChart.confidence,
    leadershipScore: radarChart.leadership,
    technicalScore: radarChart.technical,
    problemSolvingScore: radarChart.problemSolving,
    overallScore,
    confidence: clampScore(72 + analysis.detailedAnswers * 4 - analysis.uncertaintyCount * 5, 55, 95),
    followUpThemes: recommendedTopics,
    dimensions: [
      { dimension: 'Communication', score: radarChart.communication / 10 },
      { dimension: 'Confidence', score: radarChart.confidence / 10 },
      { dimension: 'Leadership', score: radarChart.leadership / 10 },
      { dimension: 'Technical', score: radarChart.technical / 10 },
      { dimension: 'Problem Solving', score: radarChart.problemSolving / 10 },
    ],
  }
}

function normalizeEvaluation(raw: unknown, fallback: InterviewEvaluationResult): InterviewEvaluationResult {
  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const source = raw as Record<string, unknown>
  const communicationScore = normalizeScore(source.communicationScore, fallback.communicationScore)
  const confidenceScore = normalizeScore(source.confidenceScore, fallback.confidenceScore)
  const leadershipScore = normalizeScore(source.leadershipScore, fallback.leadershipScore)
  const technicalScore = normalizeScore(source.technicalScore, fallback.technicalScore)
  const problemSolvingScore = normalizeScore(source.problemSolvingScore, fallback.problemSolvingScore)
  const radarSource = source.radarChart && typeof source.radarChart === 'object' ? (source.radarChart as Record<string, unknown>) : {}
  const radarChart: RadarChartScores = {
    communication: normalizeScore(radarSource.communication, communicationScore),
    confidence: normalizeScore(radarSource.confidence, confidenceScore),
    leadership: normalizeScore(radarSource.leadership, leadershipScore),
    technical: normalizeScore(radarSource.technical, technicalScore),
    problemSolving: normalizeScore(radarSource.problemSolving, problemSolvingScore),
  }

  const scoreJustificationSource =
    source.scoreJustification && typeof source.scoreJustification === 'object'
      ? (source.scoreJustification as Record<string, unknown>)
      : {}

  const recommendedTopics = normalizeStringArray(source.recommendedTopics, fallback.recommendedTopics)
  const strengths = normalizeStringArray(source.strengths, fallback.strengths)
  const opportunities = normalizeStringArray(source.opportunities, fallback.opportunities)

  const dimensions = Array.isArray(source.dimensions)
    ? source.dimensions
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null
          }

          const itemRecord = item as Record<string, unknown>
          const dimension = typeof itemRecord.dimension === 'string' ? itemRecord.dimension : ''
          const score = normalizeScore(itemRecord.score, 0) / 10

          if (!dimension) {
            return null
          }

          return { dimension, score }
        })
        .filter(Boolean) as { dimension: string; score: number }[]
    : fallback.dimensions

  const responses = Array.isArray(source.responses)
    ? (source.responses as InterviewEvaluationResult['responses'])
    : fallback.responses

  return {
    summary: typeof source.summary === 'string' && source.summary.trim() ? source.summary : fallback.summary,
    strengths,
    opportunities,
    recommendedTopics,
    scoreJustification: {
      communication:
        typeof scoreJustificationSource.communication === 'string' && scoreJustificationSource.communication.trim()
          ? scoreJustificationSource.communication
          : fallback.scoreJustification.communication,
      confidence:
        typeof scoreJustificationSource.confidence === 'string' && scoreJustificationSource.confidence.trim()
          ? scoreJustificationSource.confidence
          : fallback.scoreJustification.confidence,
      leadership:
        typeof scoreJustificationSource.leadership === 'string' && scoreJustificationSource.leadership.trim()
          ? scoreJustificationSource.leadership
          : fallback.scoreJustification.leadership,
      technical:
        typeof scoreJustificationSource.technical === 'string' && scoreJustificationSource.technical.trim()
          ? scoreJustificationSource.technical
          : fallback.scoreJustification.technical,
      problemSolving:
        typeof scoreJustificationSource.problemSolving === 'string' && scoreJustificationSource.problemSolving.trim()
          ? scoreJustificationSource.problemSolving
          : fallback.scoreJustification.problemSolving,
    },
    radarChart,
    communicationScore,
    confidenceScore,
    leadershipScore,
    technicalScore,
    problemSolvingScore,
    overallScore: normalizeScore(source.overallScore, fallback.overallScore),
    confidence: normalizeScore(source.confidence, fallback.confidence),
    followUpThemes: normalizeStringArray(source.followUpThemes, fallback.followUpThemes || recommendedTopics),
    dimensions,
    responses,
  }
}

/**
 * Evaluate the completed interview transcript and return structured JSON
 */
export async function evaluateInterview(
history: ChatMessage[],
role: string,
focusAreas: string[]
): Promise<InterviewEvaluationResult> {
  const { transcript, candidateAnswers } = extractTranscript(history)
  const analysis = analyzeTranscript(history, role, focusAreas)
  const fallback = buildFallbackEvaluation(history, role, focusAreas)
  const roleHint = role.toLowerCase().includes('frontend')
    ? 'frontend engineering'
    : role.toLowerCase().includes('backend')
      ? 'backend engineering'
      : role.toLowerCase().includes('hr')
        ? 'HR and talent'
        : 'the selected role'

  const prompt = `
You are a senior interviewer and evidence-based talent evaluator.

Analyze the full interview transcript and score the candidate using only evidence from the conversation.
Do not invent strengths or weaknesses that are not supported by the transcript.

Role:
${role}

Role focus:
${roleHint}

Selected focus areas:
${focusAreas.join(', ') || 'None provided'}

Transcript evidence:
${transcript}

Observed transcript signals:
- Candidate answers: ${candidateAnswers.length}
- Average answer length: ${analysis.averageWords.toFixed(1)} words
- Short answers (<8 words): ${analysis.shortAnswers}
- Detailed answers (>=25 words): ${analysis.detailedAnswers}
- Uncertainty phrases: ${analysis.uncertaintyCount}
- Communication markers: ${analysis.communicationCount}
- Leadership markers: ${analysis.leadershipCount}
- Problem-solving markers: ${analysis.problemSolvingCount}
- Technical keyword matches: ${analysis.technicalCount}

Scoring rules:
1. Return scores from 0 to 100 for communicationScore, confidenceScore, leadershipScore, technicalScore, and problemSolvingScore.
2. Use baselines instead of zeros when evidence is sparse, especially for leadership.
3. Penalize repeated uncertainty language such as "I don't know", "not sure", "can't remember", "skip", "change topic", and "maybe".
4. Reward detailed answers, clear structure, project explanations, ownership language, trade-off reasoning, and role-specific depth.
5. The technical score must reflect ${roleHint} expectations and the selected focus areas.
6. Every score must have a direct justification that cites the evidence used and what reduced the score.
7. Provide 3-5 strengths, 3-5 opportunities, and 3-5 recommendedTopics.
8. radarChart values must exactly mirror the five score fields.
9. Return valid JSON only.

Required JSON format:
{
  "summary": "",
  "strengths": [],
  "opportunities": [],
  "recommendedTopics": [],
  "scoreJustification": {
    "communication": "",
    "confidence": "",
    "leadership": "",
    "technical": "",
    "problemSolving": ""
  },
  "radarChart": {
    "communication": 0,
    "confidence": 0,
    "leadership": 0,
    "technical": 0,
    "problemSolving": 0
  },
  "communicationScore": 0,
  "confidenceScore": 0,
  "leadershipScore": 0,
  "technicalScore": 0,
  "problemSolvingScore": 0,
  "overallScore": 0,
  "confidence": 0,
  "followUpThemes": [],
  "dimensions": [
    {
      "dimension": "",
      "score": 0
    }
  ],
  "responses": []
}
`

  const completion = await groq.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
    response_format: {
      type: 'json_object',
    },
  })

  const content = completion.choices[0]?.message?.content || '{}'

  try {
    const parsed = JSON.parse(content)
    const normalized = normalizeEvaluation(parsed, fallback)
    normalized.followUpThemes = normalized.followUpThemes?.length ? normalized.followUpThemes : normalized.recommendedTopics
    return normalized
  } catch (err) {
    console.error('Failed to parse Groq evaluation JSON:', content, err)
    return fallback
  }
}
