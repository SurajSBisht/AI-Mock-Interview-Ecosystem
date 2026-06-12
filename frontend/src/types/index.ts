export type Role = 'candidate' | 'coach' | 'placement_officer' | 'admin'

export interface User {
  id: string
  fullName: string
  email: string
  role: Role
  avatarUrl?: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export type QuestionCategory = 'Technical' | 'Behavioral' | 'HR'

export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard'

export interface Question {
  id: string
  text: string
  category: QuestionCategory
  difficulty: QuestionDifficulty
  tags: string[]
  createdBy: string
  createdAt: string
}

export type AnswerMode = 'text' | 'voice'

export type SessionStatus = 'pending' | 'active' | 'completed' | 'abandoned'

export interface InterviewSession {
  id: string
  candidateId: string
  jobRole: string
  difficulty: QuestionDifficulty
  totalQuestions: number
  answerMode: AnswerMode
  status: SessionStatus
  overallScore?: number
  createdAt: string
  completedAt?: string
}

export interface ScoreDimension {
  dimension: string
  score: number
}

export interface Response {
  id: string
  sessionId: string
  questionId: string
  answerText: string
  score: number
  feedback: string
  goodPoints: string[]
  improvements: string[]
}

export interface Evaluation {
  id: string
  sessionId: string
  overallScore: number
  dimensions: ScoreDimension[]
  weakAreas: string[]
  responses: Response[]
}

export interface FeedbackReport {
  id: string
  sessionId: string
  coachComments?: string
  evaluation: Evaluation
}

export interface PracticeTask {
  id: string
  day: string
  topic: string
  questionCount: number
  status: 'pending' | 'completed'
}

export type NotificationStatus = 'read' | 'unread'

export interface Notification {
  id: string
  title: string
  description: string
  status: NotificationStatus
  category: 'session' | 'feedback' | 'system'
  createdAt: string
}
