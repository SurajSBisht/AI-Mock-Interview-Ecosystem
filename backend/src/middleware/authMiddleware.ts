import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../utils/httpError.js'
import { verifyAccessToken } from '../utils/jwt.js'

export interface JwtPayload {
  userId: string
  email: string
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authentication required'))
  }

  const token = authHeader.slice('Bearer '.length).trim()

  try {
    req.auth = verifyAccessToken(token) as JwtPayload
    return next()
  } catch {
    return next(new HttpError(401, 'Your session has expired. Please sign in again.'))
  }
}
