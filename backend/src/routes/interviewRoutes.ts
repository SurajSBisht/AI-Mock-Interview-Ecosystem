import { Router } from 'express'
import { startSession, nextQuestion, evaluateSession } from '../controllers/interviewController.js'

const router = Router()

router.post('/start', startSession)
router.post('/next', nextQuestion)
router.post('/evaluate', evaluateSession)

export default router
