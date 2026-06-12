import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Copy,
  MessageSquareText,
  Sparkles,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import type { ConversationMessage, InterviewArchive } from '../types'

function readInterviewArchive(sessionId?: string): InterviewArchive | null {
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

function renderMessageLabel(message: ConversationMessage) {
  if (message.speaker === 'candidate') {
    return 'Candidate'
  }

  if (message.speaker === 'assistant') {
    return 'AI interviewer'
  }

  return 'System'
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
    toast.success('Transcript copied')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge label={archive.metadata.jobRole} variant="info" />
            <Badge label={`${archive.metadata.durationMinutes} min`} variant="warning" />
            <Badge label={archive.metadata.answerMode.toUpperCase()} variant="default" />
            <Badge label={archive.metadata.status} variant="success" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Interview Review
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This page shows the saved conversation archive. Real evaluation data can be streamed in later by Gemini or OpenAI.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
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
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI Evaluation
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{evaluation.summary}</p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Strengths</p>
              <ul className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {evaluation.strengths.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-success" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Opportunities
              </p>
              <ul className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {evaluation.opportunities.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-warning" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Follow-up Themes
              </p>
              <ul className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {evaluation.followUpThemes.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border border-dashed border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Backend evaluation not connected yet
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                The conversation archive is ready, but no synthetic score or random feedback is shown. Hook Gemini or OpenAI into the archive to populate this section.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Conversation Archive
            </h2>
          </div>
          <p className="text-xs text-gray-400">
            {archive.messages.length} messages
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
          {archive.messages.length > 0 ? (
            archive.messages.map((message) => {
              const isCandidate = message.speaker === 'candidate'
              const isAssistant = message.speaker === 'assistant'

              return (
                <div key={message.id} className={isCandidate ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={[
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                      isCandidate
                        ? 'bg-primary text-white'
                        : isAssistant
                          ? 'border border-indigo-100 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
                          : 'bg-transparent text-gray-500',
                    ].join(' ')}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
                      <span>{renderMessageLabel(message)}</span>
                      <span>-</span>
                      <span>{formatTimestamp(message.createdAt)}</span>
                    </div>
                    <p>{message.content}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No conversation messages were saved for this session.
            </p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs uppercase tracking-wide text-gray-400">Candidate turns</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {archive.candidateResponses.length}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs uppercase tracking-wide text-gray-400">AI turns</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {archive.aiResponses.length}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs uppercase tracking-wide text-gray-400">Transcript length</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {archive.transcript.length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
