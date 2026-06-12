import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
// Use gemini-1.5-flash as the standard fast conversational model
const MODEL_NAME = 'gemini-1.5-flash';
/**
 * Ask Emma to generate the opening question
 */
export async function askInitialQuestion(role, focusAreas, resumeContext) {
    const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: `You are Emma, a professional, friendly, and expert AI Interviewer conducting a mock interview. You speak directly to the candidate in a warm, encouraging, and clear tone. Always keep your responses concise (1 to 3 sentences max) so that they can be easily spoken out loud by a text-to-speech engine. Introduce yourself and ask a single introductory or warm-up question related to the job role.`
    });
    let prompt = `Job Role: ${role}\n`;
    if (focusAreas && focusAreas.length > 0) {
        prompt += `Focus Areas: ${focusAreas.join(', ')}\n`;
    }
    if (resumeContext && resumeContext.trim().length > 0) {
        prompt += `Candidate Background Context: ${resumeContext}\n`;
    }
    prompt += `\nPlease introduce yourself, greet the candidate, and ask the first technical or situational question.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}
/**
 * Ask Emma to generate the next question based on history
 */
export async function askNextQuestion(history, role, focusAreas, resumeContext) {
    const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: `You are Emma, a professional, friendly, and expert AI Interviewer conducting a mock interview for a ${role} position. Focus areas include: ${focusAreas.join(', ')}. Keep your responses concise (1 to 3 sentences max) and speak directly to the candidate. Ask only ONE question at a time. You can follow up on their previous answer to test depth, or transition to a new topic from the focus areas, or ask a standard behavioral question (e.g. conflict, failure, or teamwork).`
    });
    // Format the conversation history for context
    let prompt = `Candidate Role: ${role}\n`;
    prompt += `Focus Areas: ${focusAreas.join(', ')}\n`;
    if (resumeContext && resumeContext.trim().length > 0) {
        prompt += `Notes: ${resumeContext}\n`;
    }
    prompt += `\nConversation History:\n`;
    history.forEach((msg) => {
        const name = msg.speaker === 'assistant' ? 'Emma (AI Interviewer)' : 'Candidate';
        prompt += `${name}: ${msg.content}\n`;
    });
    prompt += `\nEmma (AI Interviewer):`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}
/**
 * Evaluate the completed interview transcript and return structured JSON
 */
export async function evaluateInterview(history, role, focusAreas) {
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
    });
    let prompt = `Transcript of Interview for ${role}:\n\n`;
    history.forEach((msg) => {
        const name = msg.speaker === 'assistant' ? 'Emma (AI Interviewer)' : 'Candidate';
        prompt += `${name}: ${msg.content}\n`;
    });
    prompt += `\nEvaluate this transcript and output the JSON scorecard.`;
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    try {
        return JSON.parse(textResponse);
    }
    catch (err) {
        console.error('Failed to parse Gemini evaluation JSON:', textResponse, err);
        throw new Error('Evaluation result was not in valid JSON format');
    }
}
