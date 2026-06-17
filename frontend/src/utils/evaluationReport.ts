import type { AIEvaluationResult, Response } from '../types'

export interface NormalizedEvaluation {
  summary: string
  strengths: string[]
  opportunities: string[]
  recommendedTopics: string[]
  scoreJustification: {
    communication: string
    confidence: string
    leadership: string
    technical: string
    problemSolving: string
  }
  radarChart: {
    communication: number
    confidence: number
    leadership: number
    technical: number
    problemSolving: number
  }
  communicationScore: number
  confidenceScore: number
  leadershipScore: number
  technicalScore: number
  problemSolvingScore: number
  overallScore: number
  confidence: number
  dimensions: { dimension: string; score: number }[]
  responses: Response[]
  followUpThemes: string[]
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeScore(value: unknown, scale = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return clampScore(value * scale)
}

function listFrom(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function determineScale(evaluation?: AIEvaluationResult | null) {
  const rawValues: number[] = []

  const pushIfNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      rawValues.push(value)
    }
  }

  if (!evaluation || typeof evaluation !== 'object') {
    return 1
  }

  pushIfNumber(evaluation.overallScore)
  pushIfNumber(evaluation.communicationScore)
  pushIfNumber(evaluation.confidenceScore)
  pushIfNumber(evaluation.leadershipScore)
  pushIfNumber(evaluation.technicalScore)
  pushIfNumber(evaluation.problemSolvingScore)
  pushIfNumber(evaluation.confidence)

  if (evaluation.radarChart) {
    pushIfNumber(evaluation.radarChart.communication)
    pushIfNumber(evaluation.radarChart.confidence)
    pushIfNumber(evaluation.radarChart.leadership)
    pushIfNumber(evaluation.radarChart.technical)
    pushIfNumber(evaluation.radarChart.problemSolving)
  }

  if (Array.isArray(evaluation.dimensions)) {
    evaluation.dimensions.forEach((dimension) => pushIfNumber(dimension.score))
  }

  return rawValues.some((value) => value > 10) ? 1 : 10
}

export function normalizeEvaluation(evaluation?: AIEvaluationResult | null): NormalizedEvaluation | null {
  if (!evaluation) {
    return null
  }

  const scale = determineScale(evaluation)
  const scoreJustificationFallback = {
    communication: 'No explanation was provided for this score.',
    confidence: 'No explanation was provided for this score.',
    leadership: 'No explanation was provided for this score.',
    technical: 'No explanation was provided for this score.',
    problemSolving: 'No explanation was provided for this score.',
  }

  const recommendedTopics = listFrom(evaluation.recommendedTopics ?? evaluation.followUpThemes, [])
  const followUpThemes = listFrom(evaluation.followUpThemes ?? evaluation.recommendedTopics, recommendedTopics)
  const strengths = listFrom(evaluation.strengths, [])
  const opportunities = listFrom(evaluation.opportunities, [])
  const scoreJustification = evaluation.scoreJustification ?? scoreJustificationFallback

  const communicationScore = normalizeScore(evaluation.communicationScore ?? evaluation.radarChart?.communication, scale)
  const confidenceScore = normalizeScore(evaluation.confidenceScore ?? evaluation.radarChart?.confidence, scale)
  const leadershipScore = normalizeScore(evaluation.leadershipScore ?? evaluation.radarChart?.leadership, scale)
  const technicalScore = normalizeScore(evaluation.technicalScore ?? evaluation.radarChart?.technical, scale)
  const problemSolvingScore = normalizeScore(evaluation.problemSolvingScore ?? evaluation.radarChart?.problemSolving, scale)
  const overallFallback = Math.round(
    (communicationScore + confidenceScore + leadershipScore + technicalScore + problemSolvingScore) / 5,
  )
  const overallScore =
    typeof evaluation.overallScore === 'number'
      ? normalizeScore(evaluation.overallScore, scale)
      : overallFallback

  const radarChart = {
    communication: communicationScore,
    confidence: confidenceScore,
    leadership: leadershipScore,
    technical: technicalScore,
    problemSolving: problemSolvingScore,
  }

  const dimensions = Array.isArray(evaluation.dimensions) && evaluation.dimensions.length > 0
    ? evaluation.dimensions.map((dimension) => ({
        dimension: dimension.dimension,
        score: normalizeScore(dimension.score, scale),
      }))
    : [
        { dimension: 'Communication', score: communicationScore },
        { dimension: 'Confidence', score: confidenceScore },
        { dimension: 'Leadership', score: leadershipScore },
        { dimension: 'Technical', score: technicalScore },
        { dimension: 'Problem Solving', score: problemSolvingScore },
      ]

  const confidence = normalizeScore(evaluation.confidence, scale)

  return {
    summary: evaluation.summary,
    strengths,
    opportunities,
    recommendedTopics,
    scoreJustification: {
      communication: scoreJustification.communication ?? scoreJustificationFallback.communication,
      confidence: scoreJustification.confidence ?? scoreJustificationFallback.confidence,
      leadership: scoreJustification.leadership ?? scoreJustificationFallback.leadership,
      technical: scoreJustification.technical ?? scoreJustificationFallback.technical,
      problemSolving: scoreJustification.problemSolving ?? scoreJustificationFallback.problemSolving,
    },
    radarChart,
    communicationScore,
    confidenceScore,
    leadershipScore,
    technicalScore,
    problemSolvingScore,
    overallScore,
    confidence,
    dimensions,
    responses: evaluation.responses ?? [],
    followUpThemes,
  }
}

export function getScoreColorClass(score: number) {
  if (score >= 85) return 'text-emerald-500'
  if (score >= 70) return 'text-indigo-500'
  if (score >= 55) return 'text-amber-500'
  return 'text-rose-500'
}

export function getScoreBadgeClass(score: number) {
  if (score >= 85) return 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/60'
  if (score >= 70) return 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-900/60'
  if (score >= 55) return 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/60'
  return 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900/60'
}

export function getMetricTone(score: number) {
  if (score >= 85) return 'emerald'
  if (score >= 70) return 'indigo'
  if (score >= 55) return 'amber'
  return 'rose'
}
