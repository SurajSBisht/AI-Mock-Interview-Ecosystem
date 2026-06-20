import type { JwtPayload } from '../middleware/authMiddleware.js'

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload
    }
  }
}

export {}
