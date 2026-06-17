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

export type ConversationSpeaker = 'system' | 'assistant' | 'candidate'

export type InterviewPhase = 'config' | 'live' | 'review' | 'complete'

export type InterviewMessageSource = 'system' | 'voice' | 'text' | 'backend'

export interface ConversationMessage {
  id: string
  sessionId: string
  speaker: ConversationSpeaker
  content: string
  createdAt: string
  source: InterviewMessageSource
  isPartial?: boolean
  metadata?: Record<string, string | number | boolean | null>
}

export interface CandidateResponse {
  id: string
  sessionId: string
  messageId: string
  content: string
  source: 'voice' | 'text'
  startedAt: string
  completedAt: string
  silenceDetected: boolean
}

export interface AIResponse {
  id: string
  sessionId: string
  messageId: string
  content: string
  createdAt: string
  voiceName?: string
  source: 'backend' | 'tts'
  metadata?: Record<string, string | number | boolean | null>
}

export interface SessionMetadata {
  sessionId: string
  candidateId: string
  candidateName: string
  jobRole: string
  techStacks: string[]
durationMinutes: 15 | 30 | 45
  answerMode: AnswerMode
  resumeContext?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  status: 'draft' | 'live' | 'completed' | 'abandoned'
}

export interface InterviewState {
  sessionId: string
  phase: InterviewPhase
  isListening: boolean
  isSpeaking: boolean
  isAwaitingAI: boolean
  transcript: string
  draftAnswer: string
  remainingSeconds: number
  messageCount: number
}

export interface AIEvaluationResult {
  sessionId: string
  summary: string
  strengths: string[]
  opportunities: string[]
  recommendedTopics?: string[]
  followUpThemes: string[]
  communicationScore?: number
  confidenceScore?: number
  leadershipScore?: number
  technicalScore?: number
  problemSolvingScore?: number
  overallScore?: number
  confidence?: number
  radarChart?: {
    communication: number
    confidence: number
    leadership: number
    technical: number
    problemSolving: number
  }
  scoreJustification?: {
    communication: string
    confidence: string
    leadership: string
    technical: string
    problemSolving: string
  }
  dimensions?: ScoreDimension[]
  responses?: Response[]
}

export interface InterviewArchive {
  sessionId: string
  metadata: SessionMetadata
  messages: ConversationMessage[]
  candidateResponses: CandidateResponse[]
  aiResponses: AIResponse[]
  completedAt: string
  transcript: string
  evaluation?: AIEvaluationResult
}
