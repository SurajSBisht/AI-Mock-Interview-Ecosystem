import { askInitialQuestion, askNextQuestion, evaluateInterview } from '../services/geminiService.js';
export async function startSession(req, res) {
    try {
        const { role, focusAreas, resumeContext } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'Missing required field: role' });
        }
        const question = await askInitialQuestion(role, focusAreas || [], resumeContext);
        return res.json({ question });
    }
    catch (err) {
        console.error('Error starting session:', err);
        return res.status(500).json({ error: 'Failed to start interview session: ' + err.message });
    }
}
export async function nextQuestion(req, res) {
    try {
        const { history, role, focusAreas, resumeContext } = req.body;
        if (!history || !role) {
            return res.status(400).json({ error: 'Missing required fields: history and role' });
        }
        const question = await askNextQuestion(history, role, focusAreas || [], resumeContext);
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
