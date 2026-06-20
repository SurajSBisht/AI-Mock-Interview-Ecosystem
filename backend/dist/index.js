import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/authRoutes.js';
import interviewRouter from './routes/interviewRoutes.js';
import { connectDatabase } from './config/database.js';
import { HttpError } from './utils/httpError.js';
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
// Enable CORS for frontend requests
app.use(cors());
// Parse JSON request bodies
app.use(express.json());
// Register auth endpoints
app.use('/api/auth', authRouter);
// Register api endpoints
app.use('/api/interview', interviewRouter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'AI Mock Interview Backend' });
});
app.use((error, _req, res, _next) => {
    if (error instanceof HttpError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    if (error instanceof Error) {
        console.error('[Server] Unhandled error:', error.message);
    }
    else {
        console.error('[Server] Unhandled error:', error);
    }
    res.status(500).json({ message: 'Internal server error' });
});
async function bootstrap() {
    await connectDatabase();
    app.listen(port, () => {
        console.log(`[Server] AI Interviewer backend is running on http://localhost:${port}`);
    });
}
void bootstrap();
