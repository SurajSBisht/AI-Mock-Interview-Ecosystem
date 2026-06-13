import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config()

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

// Use gemini-1.5-flash as the standard fast conversational model
const MODEL_NAME = 'gemini-2.5-flash'

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
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: `You are Emma, a professional, friendly, and expert AI Interviewer conducting a mock interview. You speak directly to the candidate in a warm, encouraging, and clear tone. Always keep your responses concise (1 to 3 sentences max) so that they can be easily spoken out loud by a text-to-speech engine. Introduce yourself and ask a single introductory or warm-up question related to the job role.`
  })

  let prompt = `Job Role: ${role}\n`
  if (focusAreas && focusAreas.length > 0) {
    prompt += `Focus Areas: ${focusAreas.join(', ')}\n`
  }
  if (resumeContext && resumeContext.trim().length > 0) {
    prompt += `Candidate Background Context: ${resumeContext}\n`
  }
  prompt += `\nPlease introduce yourself, greet the candidate, and ask the first technical or situational question.`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
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
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: `You are Emma, a professional, friendly, and intelligent HR Interviewer conducting a mock interview for a ${role} position.

Focus areas include: ${focusAreas.join(', ')}.

Rules:

1. Ask only ONE question at a time.

2. Keep responses concise (1-3 sentences).

3. Maintain a natural interview conversation.

4. If the candidate gives a strong answer:

   * Ask a deeper follow-up question.

5. If the candidate gives a weak or incomplete answer:

   * Ask a simpler clarifying question OR briefly guide them.

6. If the candidate says:

   * "I don't know"
   * "Not sure"
   * "Skip"
   * "Change topic"
   * "Next question"

   Then DO NOT create a follow-up question based on that answer.

   Instead:

   * Move to another relevant topic, OR
   * Ask an easier question.

7. If the candidate gives irrelevant or nonsensical text:

   * Politely point out that the answer does not address the question.
   * Ask the question again in a simpler way.

8. Avoid repeating the same question.

9. Remember previous discussion topics and gradually cover different focus areas.

10. Behave like a real HR interviewer, not a quiz application.

Speak naturally and professionally.
`
  })

  // Format the conversation history for context
  let prompt = `Candidate Role: ${role}\n`
  prompt += `Focus Areas: ${focusAreas.join(', ')}\n`
  if (resumeContext && resumeContext.trim().length > 0) {
    prompt += `Notes: ${resumeContext}\n`
  }
  prompt += `\nConversation History:\n`

  history.forEach((msg) => {
    const name = msg.speaker === 'assistant' ? 'Emma (AI Interviewer)' : 'Candidate'
    prompt += `${name}: ${msg.content}\n`
  })

  prompt += `\nEmma (AI Interviewer):`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

/**
 * Evaluate the completed interview transcript and return structured JSON
 */
export async function evaluateInterview(
  history: ChatMessage[],
  role: string,
  focusAreas: string[]
): Promise<any> {
  // We use responseMimeType: "application/json" to force Gemini to return parseable JSON matching our exact scorecard schema
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json'
    },
    systemInstruction: `You are an expert technical interviewer and talent coach. You are evaluating a mock interview for the role of ${role} with focus areas: ${focusAreas.join(', ')}. Analyze the interview history and generate a detailed, constructive scorecard.
    
    You must output a single JSON object conforming exactly to this structure:
    {
      "summary": "Overall summary of the candidate's performance, communication style, and technical preparedness.",
      "strengths": ["list of 2-4 key technical or soft skill strengths demonstrated"],
      "opportunities": ["list of 2-4 areas of improvement or specific gaps identified"],
      "followUpThemes": ["list of 2-3 specific topics or engineering areas the candidate should study next"],
      "confidence": 85, // number representing confidence index between 1 and 100
      "overallScore": 8.0, // overall score out of 10.0 (e.g., 7.5)
      "dimensions": [
        { "dimension": "Technical Knowledge", "score": 8.5 },
        { "dimension": "Communication", "score": 8.0 },
        { "dimension": "Confidence", "score": 7.5 }
      ],
      "responses": [
        {
          "questionId": "q-0",
          "answerText": "candidate response text...",
          "score": 8, // score for this answer out of 10
          "feedback": "specific helpful feedback for this turn...",
          "goodPoints": ["what they did well in this answer"],
          "improvements": ["how they can improve this specific answer"]
        }
      ]
    }
    
    Ensure you generate a response item inside the "responses" list for each answer the candidate gave in the history. Assess their answers honestly but constructively.`
  })

  let prompt = `Transcript of Interview for ${role}:\n\n`
  history.forEach((msg) => {
    const name = msg.speaker === 'assistant' ? 'Emma (AI Interviewer)' : 'Candidate'
    prompt += `${name}: ${msg.content}\n`
  })

  prompt += `\nEvaluate this transcript and output the JSON scorecard.`

  const result = await model.generateContent(prompt)
  const textResponse = result.response.text()

  try {
    return JSON.parse(textResponse)
  } catch (err) {
    console.error('Failed to parse Gemini evaluation JSON:', textResponse, err)
    throw new Error('Evaluation result was not in valid JSON format')
  }
}
