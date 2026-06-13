import { Router } from 'express'
import {
  startSession,
  nextQuestion,
  evaluateSession,
  upload,
  uploadResume,
} from '../controllers/interviewController.js'
const router = Router()

router.post('/start', startSession)
router.post('/next', nextQuestion)
router.post('/evaluate', evaluateSession)
router.post('/upload-resume', upload.single('resume'), uploadResume)

export default router
