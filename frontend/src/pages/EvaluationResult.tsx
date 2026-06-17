import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Copy,
  Lightbulb,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { toast } from 'react-hot-toast'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../utils/cn'
import { getMetricTone, getScoreBadgeClass, getScoreColorClass, normalizeEvaluation } from '../utils/evaluationReport'
import type { InterviewArchive } from '../types'

function readInterviewArchive(sessionId?: string): InterviewArchive | null {
  const saved = localStorage.getItem('userSessions')
  if (saved) {
    try {
      const list = JSON.parse(saved) as InterviewArchive[]
      const found = list.find((s) => s.sessionId === sessionId)
      if (found) return found
    } catch (error) {
      console.error(error)
    }
  }

  const raw = localStorage.getItem('lastSession')
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as InterviewArchive
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    if (sessionId && parsed.sessionId !== sessionId) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function MetricCard({
  label,
  score,
  description,
}: {
  label: string
  score: number
  description: string
}) {
  const tone = getMetricTone(score)

  return (
    <Card className="border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{score}</p>
        </div>
        <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide', getScoreBadgeClass(score))}>
          {tone}
        </span>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500" style={{ width: `${score}%` }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </Card>
  )
}

export function EvaluationResult() {
  const { id } = useParams()
  const navigate = useNavigate()

  const archive = useMemo(() => readInterviewArchive(id), [id])
  const evaluation = useMemo(() => normalizeEvaluation(archive?.evaluation ?? null), [archive?.evaluation])

  if (!archive) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={MessageSquareText}
          title="No interview archive found"
          message="Complete an interview session first so the transcript and evaluation can be reviewed here."
          actionLabel="Start Interview"
          onAction={() => navigate('/interview')}
        />
      </div>
    )
  }

  const copyTranscript = async () => {
    await navigator.clipboard.writeText(archive.transcript || '')
    toast.success('Transcript copied to clipboard')
  }

  if (!evaluation) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto px-4 py-4">
        <Card className="border border-dashed border-slate-300 bg-slate-50/70 p-6 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Evaluation not available yet</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                The session archive is present, but there is no evaluation payload to render.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const radarData = [
    { metric: 'Communication', score: evaluation.radarChart.communication },
    { metric: 'Confidence', score: evaluation.radarChart.confidence },
    { metric: 'Leadership', score: evaluation.radarChart.leadership },
    { metric: 'Technical', score: evaluation.radarChart.technical },
    { metric: 'Problem Solving', score: evaluation.radarChart.problemSolving },
  ]

  const metricCards = [
    {
      label: 'Communication',
      score: evaluation.communicationScore,
      description: evaluation.scoreJustification.communication,
    },
    {
      label: 'Confidence',
      score: evaluation.confidenceScore,
      description: evaluation.scoreJustification.confidence,
    },
    {
      label: 'Leadership',
      score: evaluation.leadershipScore,
      description: evaluation.scoreJustification.leadership,
    },
    {
      label: 'Technical',
      score: evaluation.technicalScore,
      description: evaluation.scoreJustification.technical,
    },
    {
      label: 'Problem Solving',
      score: evaluation.problemSolvingScore,
      description: evaluation.scoreJustification.problemSolving,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.10),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge label={archive.metadata.jobRole} variant="info" />
              <Badge label={`${archive.metadata.durationMinutes} min`} variant="warning" />
              <Badge label={archive.metadata.answerMode.toUpperCase()} variant="default" />
              <Badge label={archive.metadata.status} variant="success" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Evaluation Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Evidence-backed scoring for communication, confidence, leadership, technical depth, and problem solving.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button type="button" onClick={copyTranscript}>
              <Copy className="h-4 w-4" />
              Copy Transcript
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border border-slate-200 bg-slate-950 p-6 text-white shadow-lg dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            <Trophy className="h-4 w-4 text-amber-400" />
            Overall Score
          </div>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-end gap-4">
              <span className={cn('text-6xl font-black tracking-tight sm:text-7xl', getScoreColorClass(evaluation.overallScore))}>
                {evaluation.overallScore}
              </span>
              <div className="pb-3 text-sm text-slate-400">
                <p className="font-semibold text-slate-200">Out of 100</p>
                <p className="mt-1">Balanced across all five dimensions.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:min-w-[220px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-100">{evaluation.summary}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Report confidence</p>
                <p className="mt-2 text-lg font-bold text-white">{evaluation.confidence}%</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Radar View</h2>
          </div>

          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(148, 163, 184, 0.22)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => [String(value ?? 0), 'Score'] as [string, string]}
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '16px',
                    color: '#fff',
                  }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="url(#radarGradient)"
                  fillOpacity={0.25}
                  strokeWidth={3}
                />
                <defs>
                  <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} score={metric.score} description={metric.description} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Interview Summary</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{evaluation.summary}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Strengths
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {evaluation.strengths.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                <Zap className="h-4 w-4" />
                Improvement Areas
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {evaluation.opportunities.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Recommended Topics</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {evaluation.recommendedTopics.map((topic, index) => (
              <li
                key={topic}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                  {index + 1}
                </span>
                <span className="leading-6">{topic}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Object.entries(evaluation.scoreJustification).map(([key, text]) => (
          <Card key={key} className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              <h3 className="text-lg font-bold capitalize text-slate-950 dark:text-white">{key} Justification</h3>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{text}</p>
          </Card>
        ))}
      </div>

      {evaluation.responses.length > 0 && (
        <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Question-by-Question Review</h2>
          </div>

          <div className="mt-5 space-y-4">
            {evaluation.responses.map((response, index) => (
              <div
                key={response.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:text-indigo-300">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Response review</p>
                  </div>
                  <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', getScoreBadgeClass(response.score))}>
                    Score {response.score}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 dark:bg-slate-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Candidate answer</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">{response.answerText}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 dark:bg-slate-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Feedback</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">{response.feedback}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Good points</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      {response.goodPoints.map((point, pointIndex) => (
                        <li key={pointIndex} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">Improvements</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      {response.improvements.map((point, pointIndex) => (
                        <li key={pointIndex} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Conversation Transcript</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {archive.messages.length} messages
          </span>
        </div>

        <div className="mt-5 max-h-[420px] space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          {archive.messages.map((message) => {
            const isCandidate = message.speaker === 'candidate'
            const isAssistant = message.speaker === 'assistant'

            return (
              <div key={message.id} className={isCandidate ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={cn(
                    'max-w-[82%] rounded-3xl px-4 py-3 text-sm shadow-sm',
                    isCandidate
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white'
                      : isAssistant
                        ? 'border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
                        : 'bg-transparent text-slate-500',
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">
                    <span>{isCandidate ? 'Candidate' : isAssistant ? 'Vox' : 'System'}</span>
                    <span>•</span>
                    <span>{formatTimestamp(message.createdAt)}</span>
                  </div>
                  <p className="leading-7">{message.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
