import { Router } from 'express'
import {
  login,
  me,
  register,
  resendAccountOtp,
  verifyAccountOtp,
} from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const authRouter = Router()

authRouter.post('/register', register)
authRouter.post('/verify-otp', verifyAccountOtp)
authRouter.post('/resend-otp', resendAccountOtp)
authRouter.post('/login', login)
authRouter.get('/me', requireAuth, me)

export default authRouter
