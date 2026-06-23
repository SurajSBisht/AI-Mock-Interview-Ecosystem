import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../utils/httpError.js'
import { getInterviewReport, listInterviewReports, saveInterviewReport } from '../services/reportService.js'

export async function createReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) {
      throw new HttpError(401, 'Authentication required')
    }

    const result = await saveInterviewReport(req.auth.userId, req.body)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getReports(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) {
      throw new HttpError(401, 'Authentication required')
    }

    const result = await listInterviewReports(req.auth.userId)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function getReportById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) {
      throw new HttpError(401, 'Authentication required')
    }

    const { id } = req.params
    const reportId = Array.isArray(id) ? id[0] : id

    if (!reportId) {
      throw new HttpError(400, 'Missing report id')
    }

    const result = await getInterviewReport(req.auth.userId, reportId)
    res.json(result)
  } catch (error) {
    next(error)
  }
}
