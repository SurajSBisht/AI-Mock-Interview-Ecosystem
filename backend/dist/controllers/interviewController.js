import { askInitialQuestion, askNextQuestion, evaluateInterview } from '../services/aiService.js';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
export const upload = multer({
    storage: multer.memoryStorage(),
});
export async function startSession(req, res) {
    try {
        const { role, focusAreas, resumeContext, durationMinutes } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'Missing required field: role' });
        }
        const question = await askInitialQuestion(role, focusAreas || [], resumeContext, durationMinutes);
        return res.json({ question });
    }
    catch (err) {
        console.error('Error starting session:', err);
        return res.status(500).json({ error: 'Failed to start interview session: ' + err.message });
    }
}
export async function nextQuestion(req, res) {
    try {
        const { history, role, focusAreas, resumeContext, durationMinutes } = req.body;
        if (!history || !role) {
            return res.status(400).json({ error: 'Missing required fields: history and role' });
        }
        const question = await askNextQuestion(history, role, focusAreas || [], resumeContext, durationMinutes);
        return res.json({ question });
    }
    catch (err) {
        console.error('Error fetching next question:', err);
        return res.status(500).json({ error: 'Failed to fetch next question: ' + err.message });
    }
}
export async function evaluateSession(req, res) {
    try {
        const { history, role, focusAreas } = req.body;
        if (!history || !role) {
            return res.status(400).json({ error: 'Missing required fields: history and role' });
        }
        const evaluation = await evaluateInterview(history, role, focusAreas || []);
        return res.json(evaluation);
    }
    catch (err) {
        console.error('Error evaluating session:', err);
        return res.status(500).json({ error: 'Failed to generate evaluation: ' + err.message });
    }
}
export async function uploadResume(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No resume file uploaded',
            });
        }
        const parser = new PDFParse({
            data: req.file.buffer,
        });
        const result = await parser.getText();
        return res.json({
            resumeText: result.text,
        });
    }
    catch (err) {
        console.error('Resume upload error:', err);
        return res.status(500).json({
            error: err.message,
        });
    }
}
