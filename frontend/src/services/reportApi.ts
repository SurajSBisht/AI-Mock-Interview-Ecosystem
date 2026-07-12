import { authApi } from './authApi'
import type { InterviewArchive } from '../types'

export type ReportStatus = 'draft' | 'live' | 'completed' | 'abandoned'

export interface DashboardReportRow {
  id: string
  candidateId: string
  jobRole: string
  difficulty: 'Medium'
  totalQuestions: number
  answerMode: InterviewArchive['metadata']['answerMode']
  status: ReportStatus
  overallScore?: number
  createdAt: string
}

export async function fetchReports() {
  const response = await authApi.get<InterviewArchive[]>('/reports')
  return response.data
}

export async function fetchReportBySessionId(sessionId: string) {
  const reports = await fetchReports()
  const normalizedSessionId = sessionId.trim()
  const found = reports.find((report) => report.sessionId === normalizedSessionId)

  if (!found) {
    throw new Error(`Interview report not found for session ${normalizedSessionId}`)
  }

  return found
}

export async function saveReport(report: InterviewArchive) {
  const response = await authApi.post<InterviewArchive>('/reports', report)
  return response.data
}

export function toDashboardReport(report: InterviewArchive): DashboardReportRow {
  return {
    id: report.sessionId,
    candidateId: report.metadata.candidateId,
    jobRole: report.metadata.jobRole,
    difficulty: 'Medium',
    totalQuestions: report.candidateResponses.length,
    answerMode: report.metadata.answerMode,
    status: report.metadata.status,
    overallScore: report.evaluation?.overallScore,
    createdAt: report.metadata.createdAt || report.completedAt,
  }
}
