import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  Sparkles,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import type { InterviewArchive } from '../types'

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

export function FeedbackReport() {
  const { id } = useParams()
  const navigate = useNavigate()

  const archive = useMemo(() => readInterviewArchive(id), [id])

  if (!archive) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No feedback report yet"
        message="Complete a conversation session first so the archive can be attached here."
        actionLabel="Start Interview"
        onAction={() => navigate('/interview')}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge label={archive.metadata.jobRole} variant="info" />
            <Badge label={`${archive.metadata.durationMinutes} min`} variant="warning" />
            <Badge label={archive.metadata.answerMode.toUpperCase()} variant="default" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Feedback Report
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This report is structured for backend AI feedback. It does not fabricate scores or coach comments on the frontend.
          </p>
        </div>

        <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Report Status
          </h2>
        </div>

        {archive.evaluation ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Summary</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {archive.evaluation.summary}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Confidence</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {archive.evaluation.confidence ?? 'Not provided'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Backend feedback is pending
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                The interview archive is ready, but no synthetic evaluation is shown here. A real AI service can attach coach comments and scoring later.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Session Context
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs uppercase tracking-wide text-gray-400">Candidate</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {archive.metadata.candidateName}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs uppercase tracking-wide text-gray-400">Context</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {archive.metadata.techStacks.join(', ') || 'None'}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs uppercase tracking-wide text-gray-400">Conversation turns</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {archive.messages.length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
