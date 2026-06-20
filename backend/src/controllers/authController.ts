import type { NextFunction, Request, Response } from 'express'
import {
  getCurrentUser,
  loginUser,
  registerUser,
  resendOtp,
  verifyOtp,
} from '../services/authService.js'
import { HttpError } from '../utils/httpError.js'

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await registerUser(req.body)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function verifyAccountOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await verifyOtp(req.body)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function resendAccountOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await resendOtp(req.body)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await loginUser(req.body)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) {
      throw new HttpError(401, 'Authentication required')
    }

    const result = await getCurrentUser(req.auth.userId)
    res.json(result)
  } catch (error) {
    next(error)
  }
}
