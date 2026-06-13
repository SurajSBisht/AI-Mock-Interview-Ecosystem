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

/**
 * Ask Emma to generate the opening question
 */
export async function askInitialQuestion(
role: string,
focusAreas: string[],
resumeContext?: string
): Promise<string> {

let prompt = `Job Role: ${role}\n`

if (focusAreas && focusAreas.length > 0) {
prompt += `Focus Areas: ${focusAreas.join(', ')}\n`
}

if (resumeContext && resumeContext.trim().length > 0) {
prompt += `Candidate Background Context: ${resumeContext}\n`
}

prompt += `

You are Emma, a professional, friendly, and expert AI Interviewer.

Your job is to:

* Greet the candidate.
* Introduce yourself.
* Start a realistic interview.
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
 * Ask Emma to generate the next question based on history
 */
export async function askNextQuestion(
history: ChatMessage[],
role: string,
focusAreas: string[],
resumeContext?: string
): Promise<string> {

let prompt = `You are Emma, a professional, friendly, and intelligent AI Interviewer conducting a mock interview for a ${role} position.

Focus Areas:
${focusAreas.join(', ')}

Rules:

* Ask ONLY ONE question at a time.

* Keep responses concise (1-3 sentences).

* Behave like a real interviewer.

* Maintain conversation memory.

* Avoid repeating questions.

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

* Sometimes ask a deeper follow-up question.
* Other times move to a new topic naturally.
* Do not stay on the same topic for more than 2 consecutive questions unless the candidate is giving highly detailed answers.

E) NORMAL ANSWER

If the answer is relevant but not very detailed:

* Ask one clarification question OR continue naturally.
Never assume a topic has been answered if the candidate's response is shorter than a complete sentence or appears unfinished.


`

history.forEach((msg) => {
const speaker =
msg.speaker === 'assistant'
? 'Emma'
: msg.speaker === 'candidate'
? 'Candidate'
: 'System'


prompt += `${speaker}: ${msg.content}\n`


})

if (resumeContext && resumeContext.trim()) {
prompt += `\nCandidate Resume Context:\n${resumeContext}\n`
}

prompt += `\nEmma:`

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

/**
 * Evaluate the completed interview transcript and return structured JSON
 */
export async function evaluateInterview(
history: ChatMessage[],
role: string,
focusAreas: string[]
): Promise<any> {

let transcript = ''

history.forEach((msg) => {
const speaker =
msg.speaker === 'assistant'
? 'Emma'
: msg.speaker === 'candidate'
? 'Candidate'
: 'System'


transcript += `${speaker}: ${msg.content}\n`


})

const prompt = `
You are an expert interviewer and talent coach.

Role:
${role}

Focus Areas:
${focusAreas.join(', ')}

Interview Transcript:
${transcript}

Return ONLY valid JSON.

Required JSON format:

{
"summary": "",
"strengths": [],
"opportunities": [],
"followUpThemes": [],
"confidence": 0,
"overallScore": 0,
"dimensions": [
{
"dimension": "",
"score": 0
}
],
"responses": [
{
"questionId": "",
"answerText": "",
"score": 0,
"feedback": "",
"goodPoints": [],
"improvements": []
}
]
}
`

const completion = await groq.chat.completions.create({
model: MODEL_NAME,
messages: [
{
role: 'user',
content: prompt
}
],
temperature: 0.3,
response_format: {
type: 'json_object'
}
})

const content =
completion.choices[0]?.message?.content || '{}'

try {
return JSON.parse(content)
} catch (err) {
console.error('Failed to parse Groq evaluation JSON:', content, err)
throw new Error('Evaluation result was not valid JSON')
}
}
