import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ClipboardList,
  Lightbulb,
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

function MetricTile({
  label,
  score,
}: {
  label: string
  score: number
}) {
  const tone = getMetricTone(score)

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', getScoreBadgeClass(score))}>
          {tone}
        </span>
      </div>
      <p className={cn('mt-3 text-3xl font-black tracking-tight', getScoreColorClass(score))}>{score}</p>
    </div>
  )
}

export function FeedbackReport() {
  const { id } = useParams()
  const navigate = useNavigate()

  const archive = useMemo(() => readInterviewArchive(id), [id])
  const evaluation = useMemo(() => normalizeEvaluation(archive?.evaluation ?? null), [archive?.evaluation])

  if (!archive) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No feedback report yet"
        message="Complete a conversation session first so the report can be generated from the saved archive."
        actionLabel="Start Interview"
        onAction={() => navigate('/interview')}
      />
    )
  }

  if (!evaluation) {
    return (
      <Card className="border border-dashed border-slate-300 bg-slate-50/70 p-6 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Evaluation pending</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              The transcript is available, but there is no compiled evaluation payload to display yet.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const radarData = [
    { metric: 'Communication', score: evaluation.radarChart.communication },
    { metric: 'Confidence', score: evaluation.radarChart.confidence },
    { metric: 'Leadership', score: evaluation.radarChart.leadership },
    { metric: 'Technical', score: evaluation.radarChart.technical },
    { metric: 'Problem Solving', score: evaluation.radarChart.problemSolving },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-4">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge label={archive.metadata.jobRole} variant="info" />
              <Badge label={`${archive.metadata.durationMinutes} min`} variant="warning" />
              <Badge label={archive.metadata.answerMode.toUpperCase()} variant="default" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Detailed Feedback Report</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Clear, evidence-based feedback with dimension scores, justifications, and follow-up topics.
            </p>
          </div>

          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border border-slate-200 bg-slate-950 p-6 text-white shadow-lg dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            <Trophy className="h-4 w-4 text-amber-400" />
            Overall Score
          </div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className={cn('text-6xl font-black tracking-tight', getScoreColorClass(evaluation.overallScore))}>{evaluation.overallScore}</p>
              <p className="mt-2 text-sm text-slate-400">Evidence-backed score out of 100</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Report confidence</p>
              <p className="mt-1 text-lg font-bold text-white">{evaluation.confidence}%</p>
            </div>
          </div>
          <p className="mt-6 text-sm leading-7 text-slate-100">{evaluation.summary}</p>
        </Card>

        <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Radar Chart</h2>
          </div>
          <div className="mt-4 h-[300px]">
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
                  fill="url(#feedbackRadarGradient)"
                  fillOpacity={0.25}
                  strokeWidth={3}
                />
                <defs>
                  <linearGradient id="feedbackRadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
        <MetricTile label="Communication" score={evaluation.communicationScore} />
        <MetricTile label="Confidence" score={evaluation.confidenceScore} />
        <MetricTile label="Leadership" score={evaluation.leadershipScore} />
        <MetricTile label="Technical" score={evaluation.technicalScore} />
        <MetricTile label="Problem Solving" score={evaluation.problemSolvingScore} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Summary and Feedback</h2>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
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

            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
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

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Score Justification
            </div>
            <div className="mt-4 space-y-3">
              {Object.entries(evaluation.scoreJustification).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-white p-4 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{key}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Recommended Topics</h2>
            </div>
            <ul className="mt-4 space-y-3">
              {evaluation.recommendedTopics.map((topic, index) => (
                <li key={topic} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                    {index + 1}
                  </span>
                  <span className="leading-6">{topic}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Role Focus</h2>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">
                {evaluation.followUpThemes.length > 0
                  ? evaluation.followUpThemes.join(' | ')
                  : 'No follow-up topics were provided by the evaluator.'}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
