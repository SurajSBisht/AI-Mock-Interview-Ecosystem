import { Schema, model, type HydratedDocument } from 'mongoose'

export type AnswerMode = 'text' | 'voice'
export type SessionStatus = 'draft' | 'live' | 'completed' | 'abandoned'
export type ConversationSpeaker = 'system' | 'assistant' | 'candidate'
export type InterviewMessageSource = 'system' | 'voice' | 'text' | 'backend'
export type CandidateResponseSource = 'voice' | 'text'
export type AIResponseSource = 'backend' | 'tts'

export interface ReportDimensionRecord {
  dimension: string
  score: number
}

export interface CandidateResponseRecord {
  id: string
  sessionId: string
  messageId: string
  content: string
  source: CandidateResponseSource
  startedAt: string
  completedAt: string
  silenceDetected: boolean
}

export interface AIResponseRecord {
  id: string
  sessionId: string
  messageId: string
  content: string
  createdAt: string
  voiceName?: string
  source: AIResponseSource
  metadata?: Record<string, string | number | boolean | null>
}

export interface ConversationMessageRecord {
  id: string
  sessionId: string
  speaker: ConversationSpeaker
  content: string
  createdAt: string
  source: InterviewMessageSource
  isPartial?: boolean
  metadata?: Record<string, string | number | boolean | null>
}

export interface InterviewEvaluationRecord {
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
  dimensions?: ReportDimensionRecord[]
  responses?: Array<{
    id: string
    sessionId: string
    questionId: string
    answerText: string
    score: number
    feedback: string
    goodPoints: string[]
    improvements: string[]
  }>
}

export interface InterviewReportRecord {
  userId: string
  candidateName: string
  sessionId: string
  jobRole: string
  techStacks: string[]
  durationMinutes: 15 | 30 | 45
  answerMode: AnswerMode
  status: SessionStatus
  overallScore?: number
  communicationScore?: number
  technicalScore?: number
  leadershipScore?: number
  confidenceScore?: number
  problemSolvingScore?: number
  summary?: string
  strengths: string[]
  opportunities: string[]
  followUpThemes: string[]
  dimensions: ReportDimensionRecord[]
  candidateResponses: CandidateResponseRecord[]
  aiResponses: AIResponseRecord[]
  messages: ConversationMessageRecord[]
  evaluation?: InterviewEvaluationRecord | null
  transcript: string
  createdAt: Date
  completedAt: Date
}

export type InterviewReportDocument = HydratedDocument<InterviewReportRecord>

const dimensionSchema = new Schema<ReportDimensionRecord>(
  {
    dimension: { type: String, required: true, trim: true },
    score: { type: Number, required: true },
  },
  { _id: false },
)

const candidateResponseSchema = new Schema<CandidateResponseRecord>(
  {
    id: { type: String, required: true },
    sessionId: { type: String, required: true, index: true },
    messageId: { type: String, required: true },
    content: { type: String, required: true },
    source: { type: String, required: true, enum: ['voice', 'text'] },
    startedAt: { type: String, required: true },
    completedAt: { type: String, required: true },
    silenceDetected: { type: Boolean, required: true },
  },
  { _id: false },
)

const aiResponseSchema = new Schema<AIResponseRecord>(
  {
    id: { type: String, required: true },
    sessionId: { type: String, required: true, index: true },
    messageId: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: String, required: true },
    voiceName: { type: String, required: false },
    source: { type: String, required: true, enum: ['backend', 'tts'] },
    metadata: { type: Schema.Types.Mixed, required: false },
  },
  { _id: false },
)

const conversationMessageSchema = new Schema<ConversationMessageRecord>(
  {
    id: { type: String, required: true },
    sessionId: { type: String, required: true, index: true },
    speaker: { type: String, required: true, enum: ['system', 'assistant', 'candidate'] },
    content: { type: String, required: true },
    createdAt: { type: String, required: true },
    source: { type: String, required: true, enum: ['system', 'voice', 'text', 'backend'] },
    isPartial: { type: Boolean, required: false },
    metadata: { type: Schema.Types.Mixed, required: false },
  },
  { _id: false },
)

const interviewEvaluationSchema = new Schema<InterviewEvaluationRecord>(
  {
    sessionId: { type: String, required: true },
    summary: { type: String, required: true },
    strengths: { type: [String], default: [] },
    opportunities: { type: [String], default: [] },
    recommendedTopics: { type: [String], default: [] },
    followUpThemes: { type: [String], default: [] },
    communicationScore: { type: Number, required: false },
    confidenceScore: { type: Number, required: false },
    leadershipScore: { type: Number, required: false },
    technicalScore: { type: Number, required: false },
    problemSolvingScore: { type: Number, required: false },
    overallScore: { type: Number, required: false },
    confidence: { type: Number, required: false },
    radarChart: {
      communication: { type: Number, required: false },
      confidence: { type: Number, required: false },
      leadership: { type: Number, required: false },
      technical: { type: Number, required: false },
      problemSolving: { type: Number, required: false },
    },
    scoreJustification: {
      communication: { type: String, required: false },
      confidence: { type: String, required: false },
      leadership: { type: String, required: false },
      technical: { type: String, required: false },
      problemSolving: { type: String, required: false },
    },
    dimensions: { type: [dimensionSchema], default: [] },
    responses: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false },
)

const interviewReportSchema = new Schema<InterviewReportRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
    },
    jobRole: {
      type: String,
      required: true,
      trim: true,
    },
    techStacks: {
      type: [String],
      default: [],
    },
    durationMinutes: {
      type: Number,
      required: true,
      enum: [15, 30, 45],
    },
    answerMode: {
      type: String,
      required: true,
      enum: ['text', 'voice'],
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'live', 'completed', 'abandoned'],
      default: 'completed',
    },
    overallScore: {
      type: Number,
      required: false,
    },
    communicationScore: {
      type: Number,
      required: false,
    },
    technicalScore: {
      type: Number,
      required: false,
    },
    leadershipScore: {
      type: Number,
      required: false,
    },
    confidenceScore: {
      type: Number,
      required: false,
    },
    problemSolvingScore: {
      type: Number,
      required: false,
    },
    summary: {
      type: String,
      required: false,
    },
    strengths: {
      type: [String],
      default: [],
    },
    opportunities: {
      type: [String],
      default: [],
    },
    followUpThemes: {
      type: [String],
      default: [],
    },
    dimensions: {
      type: [dimensionSchema],
      default: [],
    },
    candidateResponses: {
      type: [candidateResponseSchema],
      default: [],
    },
    aiResponses: {
      type: [aiResponseSchema],
      default: [],
    },
    messages: {
      type: [conversationMessageSchema],
      default: [],
    },
    evaluation: {
      type: interviewEvaluationSchema,
      required: false,
      default: null,
    },
    transcript: {
      type: String,
      required: true,
      default: '',
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
)

interviewReportSchema.index({ userId: 1, sessionId: 1 }, { unique: true })
interviewReportSchema.index({ userId: 1, completedAt: -1 })

export const InterviewReport = model<InterviewReportRecord>('InterviewReport', interviewReportSchema)
