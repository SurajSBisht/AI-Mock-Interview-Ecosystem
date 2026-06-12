import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import interviewRouter from './routes/interviewRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// Enable CORS for frontend requests
app.use(cors())

// Parse JSON request bodies
app.use(express.json())

// Register api endpoints
app.use('/api/interview', interviewRouter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'AI Mock Interview Backend' })
})

app.listen(port, () => {
  console.log(`[Server] AI Interviewer backend is running on http://localhost:${port}`)
})
