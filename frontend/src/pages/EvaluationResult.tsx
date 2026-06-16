import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Copy,
  MessageSquareText,
  Sparkles,
  Trophy,
  Activity,
  Check,
  Zap,
  Star
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../utils/cn'
import type { InterviewArchive } from '../types'

function readInterviewArchive(sessionId?: string): InterviewArchive | null {
  // First check userSessions list
  const saved = localStorage.getItem('userSessions')
  if (saved) {
    try {
      const list = JSON.parse(saved) as InterviewArchive[]
      const found = list.find(s => s.sessionId === sessionId)
      if (found) return found
    } catch (e) {
      console.error(e)
    }
  }

  // Fallback to lastSession
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

function getScoreColorClass(score: number) {
  if (score >= 8.5) return 'text-emerald-500'
  if (score >= 7.0) return 'text-indigo-500'
  if (score >= 5.5) return 'text-yellow-500'
  return 'text-rose-500'
}

function getDimensionColorBar(dimension: string) {
  if (dimension.includes('Technical')) return 'bg-primary'
  if (dimension.includes('Communication')) return 'bg-success'
  return 'bg-accent'
}

export function EvaluationResult() {
  const { id } = useParams()
  const navigate = useNavigate()

  const archive = useMemo(() => readInterviewArchive(id), [id])

  if (!archive) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={MessageSquareText}
          title="No interview archive found"
          message="Complete an interview session first so the conversational transcript can be reviewed here."
          actionLabel="Start Interview"
          onAction={() => navigate('/interview')}
        />
      </div>
    )
  }

  const evaluation = archive.evaluation

  const copyTranscript = async () => {
    await navigator.clipboard.writeText(archive.transcript || '')
    toast.success('Transcript copied to clipboard')
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-4">
      {/* Header section */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge label={archive.metadata.jobRole} variant="info" />
            <Badge label={`${archive.metadata.durationMinutes} min`} variant="warning" />
            <Badge label={archive.metadata.answerMode.toUpperCase()} variant="default" />
            <Badge label={archive.metadata.status} variant="success" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Interview Scorecard
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Conversational analysis compiled by Vox, your AI Coach. Structured for seamless backend turn streaming.
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

      {evaluation ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          
          {/* Left Side: Score Summary and Question List */}
          <div className="space-y-6">
            
            {/* AI Summary Card */}
            <Card className="p-6 border border-gray-100 shadow-sm dark:border-gray-800">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  AI Evaluation Synthesis
                </h2>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {evaluation.summary}
              </p>

              {/* Strengths and Opportunities grid */}
              <div className="grid gap-4 md:grid-cols-2 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-100/30">
                  <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                    <Check className="h-4 w-4 stroke-[3]" />
                    Key Strengths
                  </h3>
                  <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                    {evaluation.strengths.map((item, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-100/30">
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                    <Zap className="h-4 w-4" />
                    Areas to Improve
                  </h3>
                  <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                    {evaluation.opportunities.map((item, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Turn-by-Turn Questions & Answers Scores */}
            {evaluation.responses && evaluation.responses.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 px-1">
                  Question-by-Question Analytics
                </h2>

                {evaluation.responses.map((resp, index) => (
                  <Card key={resp.id} className="p-6 border border-gray-150 shadow-sm dark:border-gray-850 hover:shadow-md transition">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Turn Feedback
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-500">Score: </span>
                        <span className={cn('text-lg font-extrabold', getScoreColorClass(resp.score))}>
                          {resp.score}/10
                        </span>
                      </div>
                    </div>

                    {/* Question text */}
                    <div className="bg-gray-50 dark:bg-gray-950 p-3.5 rounded-xl border border-gray-100 dark:border-gray-900 mb-4">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Vox asked:</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        {index === 0 ? archive.messages.find(m => m.speaker === 'assistant')?.content || 'Tell me about yourself.' : archive.messages.filter(m => m.speaker === 'assistant')[index]?.content || 'Follow-up question.'}
                      </p>
                    </div>

                    {/* Candidate Answer */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Your response:</p>
                      <p className="text-sm text-gray-750 dark:text-gray-300 italic">
                        "{resp.answerText}"
                      </p>
                    </div>

                    {/* Feedback and highlights */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-bold text-gray-700 dark:text-gray-300">Vox's analysis: </span>
                        {resp.feedback}
                      </p>

                      <div className="grid gap-3 md:grid-cols-2 text-xs pt-1">
                        <div>
                          <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                            <span className="h-1 w-1 bg-emerald-500 rounded-full" />
                            Good Points
                          </p>
                          <ul className="space-y-1 pl-2 text-gray-500">
                            {resp.goodPoints.map((gp, i) => (
                              <li key={i}>• {gp}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                            <span className="h-1 w-1 bg-amber-500 rounded-full" />
                            Suggestions
                          </p>
                          <ul className="space-y-1 pl-2 text-gray-500">
                            {resp.improvements.map((imp, i) => (
                              <li key={i}>• {imp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Overall Score & Dimension Meters */}
          <div className="space-y-6">
            
            {/* Overall Score Dials */}
            <Card className="p-6 text-center border border-gray-100 shadow-sm dark:border-gray-800 flex flex-col items-center">
              <Trophy className="h-10 w-10 text-amber-500 mb-2" />
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider">Overall Rating</h3>
              
              <div className="relative flex items-center justify-center my-4">
                {/* Visual circle representation */}
                <div className="absolute inset-0 rounded-full border-4 border-gray-100 dark:border-gray-850" />
                <div className="h-28 w-28 rounded-full border-4 border-primary border-t-transparent animate-spin-slow opacity-15 absolute" />
                
                <div className="z-10 flex flex-col items-center justify-center">
                  <span className={cn('text-4xl font-extrabold tracking-tight', getScoreColorClass(evaluation.overallScore ?? 0))}>
                    {evaluation.overallScore}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Scale 1-10</span>
                </div>
              </div>

              <div className="w-full bg-gray-50 dark:bg-gray-950 p-2.5 rounded-xl text-xs text-gray-500 mt-2">
                Confidence rating: <span className="font-bold text-gray-800 dark:text-gray-250">{evaluation.confidence}%</span>
              </div>
            </Card>

            {/* Core Dimensions Card */}
            {evaluation.dimensions && evaluation.dimensions.length > 0 && (
              <Card className="p-6 border border-gray-100 shadow-sm dark:border-gray-800">
                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-primary" />
                  Dimension Metrics
                </h3>

                <div className="space-y-4">
                  {evaluation.dimensions.map((dim) => (
                    <div key={dim.dimension} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-600 dark:text-gray-400">{dim.dimension}</span>
                        <span className="text-gray-900 dark:text-gray-100">{dim.score}/10</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', getDimensionColorBar(dim.dimension))}
                          style={{ width: `${dim.score * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Follow-up Study Themes */}
            <Card className="p-6 border border-gray-100 shadow-sm dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                Recommended Focus
              </h3>
              
              <ul className="space-y-3 text-xs text-gray-650 dark:text-gray-350">
                {evaluation.followUpThemes.map((theme, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="mt-0.5 leading-relaxed">{theme}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Quick Session Details */}
            <Card className="p-5 text-xs border border-gray-100 dark:border-gray-800 space-y-2 bg-gray-50/50 dark:bg-gray-900/40">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Turn Count:</span>
                <span className="font-bold text-gray-850 dark:text-gray-250">{archive.messages.length} messages</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Completed On:</span>
                <span className="font-bold text-gray-850 dark:text-gray-250">{new Date(archive.completedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Session Identifier:</span>
                <span className="font-bold text-gray-500 font-mono text-[10px] break-all max-w-[150px]">{archive.sessionId}</span>
              </div>
            </Card>

          </div>
        </div>
      ) : (
        <Card className="border border-dashed border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Backend evaluation not connected yet
              </h2>
              <p className="mt-1 text-sm text-gray-650 dark:text-gray-350">
                The conversation archive is ready, but no synthetic score or feedback is shown. Hook Gemini or OpenAI into the archive to populate this section.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Raw Transcript Card */}
      <Card className="p-6 border border-gray-100 shadow-sm dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Conversational Feed
            </h2>
          </div>
          <span className="bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full text-xs font-semibold text-gray-500">
            {archive.messages.length} messages
          </span>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 bg-gray-50 dark:bg-gray-950 p-4 rounded-2xl border border-gray-100 dark:border-gray-900">
          {archive.messages.map((message) => {
            const isCandidate = message.speaker === 'candidate'
            const isAssistant = message.speaker === 'assistant'

            return (
              <div key={message.id} className={isCandidate ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                    isCandidate
                      ? 'bg-primary text-white'
                      : isAssistant
                        ? 'border border-indigo-50 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100'
                        : 'bg-transparent text-gray-500',
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide opacity-75">
                    <span>{isCandidate ? 'Candidate' : isAssistant ? 'AI interviewer' : 'System'}</span>
                    <span>-</span>
                    <span>{formatTimestamp(message.createdAt)}</span>
                  </div>
                  <p className="leading-relaxed">{message.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
