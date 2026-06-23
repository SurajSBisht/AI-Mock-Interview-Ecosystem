import { User } from '../models/User.js'
import { isValidObjectId } from 'mongoose'
import {
  InterviewReport,
  type AIResponseRecord,
  type CandidateResponseRecord,
  type ConversationMessageRecord,
  type InterviewEvaluationRecord,
  type InterviewReportRecord,
  type ReportDimensionRecord,
} from '../models/InterviewReport.js'
import { HttpError } from '../utils/httpError.js'

export interface InterviewArchivePayload {
  sessionId: string
  metadata: {
    candidateId: string
    candidateName?: string
    jobRole: string
    techStacks: string[]
    durationMinutes: 15 | 30 | 45
    answerMode: 'text' | 'voice'
    resumeContext?: string
    createdAt: string
    startedAt?: string
    completedAt?: string
    status: 'draft' | 'live' | 'completed' | 'abandoned'
  }
  messages: ConversationMessageRecord[]
  candidateResponses: CandidateResponseRecord[]
  aiResponses: AIResponseRecord[]
  completedAt: string
  transcript: string
  evaluation?: InterviewEvaluationRecord | null
}

export interface InterviewArchiveResponse extends InterviewArchivePayload {
  userId: string
  metadata: InterviewArchivePayload['metadata'] & {
    candidateName: string
  }
}

function toDate(value: string | Date | undefined, fallback: Date) {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function safeArray<T>(value: T[] | undefined | null) {
  return Array.isArray(value) ? value : []
}

function normalizeDimensions(dimensions?: ReportDimensionRecord[] | null) {
  return safeArray(dimensions).map((dimension) => ({
    dimension: dimension.dimension,
    score: dimension.score,
  }))
}

function toArchiveResponse(report: InterviewReportRecord): InterviewArchiveResponse {
  return {
    userId: report.userId,
    sessionId: report.sessionId,
    metadata: {
      candidateId: report.userId,
      candidateName: report.candidateName,
      jobRole: report.jobRole,
      techStacks: report.techStacks,
      durationMinutes: report.durationMinutes,
      answerMode: report.answerMode,
      createdAt: report.createdAt.toISOString(),
      startedAt: report.createdAt.toISOString(),
      completedAt: report.completedAt.toISOString(),
      status: report.status,
    },
    messages: report.messages,
    candidateResponses: report.candidateResponses,
    aiResponses: report.aiResponses,
    completedAt: report.completedAt.toISOString(),
    transcript: report.transcript,
    evaluation: report.evaluation ?? undefined,
  }
}

function buildReportDocument(userId: string, candidateName: string, payload: InterviewArchivePayload) {
  const createdAt = toDate(payload.metadata.createdAt ?? payload.metadata.startedAt, new Date())
  const completedAt = toDate(payload.completedAt ?? payload.metadata.completedAt, createdAt)
  const evaluation = payload.evaluation ?? null

  return {
    userId,
    candidateName,
    sessionId: payload.sessionId,
    jobRole: payload.metadata.jobRole,
    techStacks: payload.metadata.techStacks,
    durationMinutes: payload.metadata.durationMinutes,
    answerMode: payload.metadata.answerMode,
    status: payload.metadata.status,
    overallScore: evaluation?.overallScore,
    communicationScore: evaluation?.communicationScore,
    technicalScore: evaluation?.technicalScore,
    leadershipScore: evaluation?.leadershipScore,
    confidenceScore: evaluation?.confidenceScore,
    problemSolvingScore: evaluation?.problemSolvingScore,
    summary: evaluation?.summary,
    strengths: safeArray(evaluation?.strengths),
    opportunities: safeArray(evaluation?.opportunities),
    followUpThemes: safeArray(evaluation?.followUpThemes ?? evaluation?.recommendedTopics),
    dimensions: normalizeDimensions(evaluation?.dimensions),
    candidateResponses: payload.candidateResponses,
    aiResponses: payload.aiResponses,
    messages: payload.messages,
    evaluation,
    transcript: payload.transcript,
    createdAt,
    completedAt,
  }
}

export async function saveInterviewReport(userId: string, payload: InterviewArchivePayload) {
  if (!payload?.sessionId) {
    throw new HttpError(400, 'Missing required field: sessionId')
  }

  if (!payload.metadata?.jobRole) {
    throw new HttpError(400, 'Missing required field: metadata.jobRole')
  }

  const user = await User.findById(userId)

  if (!user) {
    throw new HttpError(404, 'User not found')
  }

  const document = buildReportDocument(userId, user.fullName, payload)

  const saved = await InterviewReport.findOneAndUpdate(
    { userId, sessionId: payload.sessionId },
    { $set: document },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    },
  )

  if (!saved) {
    throw new HttpError(500, 'Failed to save interview report')
  }

  return toArchiveResponse(saved.toObject() as InterviewReportRecord)
}

export async function listInterviewReports(userId: string) {
  const reports = await InterviewReport.find({ userId }).sort({ completedAt: -1, createdAt: -1 })
  return reports.map((report) => toArchiveResponse(report.toObject() as InterviewReportRecord))
}

export async function getInterviewReport(userId: string, sessionId: string) {
  const query = isValidObjectId(sessionId)
    ? { userId, _id: sessionId }
    : { userId, sessionId }

  const report = await InterviewReport.findOne(query)

  if (!report) {
    throw new HttpError(404, 'Interview report not found')
  }

  return toArchiveResponse(report.toObject() as InterviewReportRecord)
}
