import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  Flame,
  MessageSquare,
  Plus,
  Trophy,
  Video,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../utils/cn'
import { fetchReports, toDashboardReport, type DashboardReportRow } from '../services/reportApi'

function getScoreClass(score: number) {
  if (score >= 85) {
    return 'text-success'
  }

  if (score >= 70) {
    return 'text-yellow-600 dark:text-yellow-400'
  }

  return 'text-danger'
}

function formatDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatAverageScore(scores: number[]) {
  if (scores.length === 0) {
    return '0.0'
  }

  const total = scores.reduce((sum, score) => sum + score, 0)
  return (total / scores.length).toFixed(1)
}

function formatDayKey(dateValue: string) {
  const date = new Date(dateValue)
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    .toISOString()
    .slice(0, 10)
}

function calculateActivityStreak(dateValues: string[]) {
  const uniqueDays = Array.from(new Set(dateValues.map(formatDayKey))).sort((left, right) =>
    right.localeCompare(left),
  )

  if (uniqueDays.length === 0) {
    return 0
  }

  let streak = 1

  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previousDate = new Date(`${uniqueDays[index - 1]}T00:00:00.000Z`)
    const currentDate = new Date(`${uniqueDays[index]}T00:00:00.000Z`)
    const diffDays = Math.round((previousDate.getTime() - currentDate.getTime()) / 86_400_000)

    if (diffDays !== 1) {
      break
    }

    streak += 1
  }

  return streak
}

function NoDataNotice({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <Card>
      <EmptyState icon={MessageSquare} title={title} message={message} />
    </Card>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [sessions, setSessions] = useState<DashboardReportRow[]>([])

  useEffect(() => {
    let isMounted = true

    const loadReports = async () => {
      try {
        const reports = await fetchReports()

        if (!isMounted) {
          return
        }

        setSessions(reports.map(toDashboardReport))
      } catch (error) {
        console.error('Failed to load reports:', error)

        if (isMounted) {
          setSessions([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadReports()

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const firstName = user.fullName.split(' ').find((part) => part.length > 0) ?? user.fullName

  const completedSessions = sessions.filter((session) => session.status === 'completed')
  const completedCount = completedSessions.length
  const scoredSessions = completedSessions.filter((session) => typeof session.overallScore === 'number')
  const averageScore = formatAverageScore(scoredSessions.map((session) => session.overallScore ?? 0))
  const dayStreak = calculateActivityStreak(completedSessions.map((session) => session.createdAt))

  const renderCandidateView = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {firstName}!</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Ready for your next interview practice?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          {
            label: 'Sessions Completed',
            value: String(completedCount),
            icon: Video,
            iconClass: 'text-primary',
          },
          {
            label: 'Average Score',
            value: `${averageScore}/100`,
            icon: Trophy,
            iconClass: 'text-success',
          },
          {
            label: 'Day Streak',
            value: `${dayStreak} days`,
            icon: Flame,
            iconClass: 'text-orange-500',
          },
        ].map((stat) => {
          const Icon = stat.icon

          return (
            <Card key={stat.label}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <Icon className={cn('h-5 w-5', stat.iconClass)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Button type="button" onClick={() => navigate('/interview')}>
        <Plus className="h-4 w-4" />
        Start New Interview
      </Button>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Sessions
          </h2>
        </div>

        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Job Role</th>
                  <th className="py-3 pr-4 font-medium">Score</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    <td className="py-4 pr-4 text-gray-600 dark:text-gray-300">
                      {formatDate(session.createdAt)}
                    </td>
                    <td className="py-4 pr-4 text-gray-600 dark:text-gray-300">
                      {session.jobRole}
                    </td>
                    <td
                      className={cn(
                        'py-4 pr-4 font-semibold',
                        getScoreClass(session.overallScore ?? 0),
                      )}
                    >
                      {session.overallScore ?? '-'}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge label={session.status} />
                    </td>
                    <td className="py-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/interview/${session.id}/result`)}
                      >
                        View Report
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Video}
            title="No sessions yet"
            message="Start your first interview practice"
            actionLabel="Start Now"
            onAction={() => navigate('/interview')}
          />
        )}
      </Card>
    </div>
  )

  const renderCoachView = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Coach Dashboard</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          No coach analytics are connected yet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { label: 'Pending Reviews', value: '0', icon: Clock },
          { label: 'Completed Reviews', value: '0', icon: Trophy },
        ].map((stat) => {
          const Icon = stat.icon

          return (
            <Card key={stat.label}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <NoDataNotice
        title="No review queue"
        message="Once coach review data is connected, it will appear here."
      />
    </div>
  )

  const renderPlacementOfficerView = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Placement Overview</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          No placement analytics are connected yet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total Candidates', value: '0' },
          { label: 'Average Score', value: '0.0' },
          { label: 'Top Performers', value: '0' },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {stat.label}
            </p>
          </Card>
        ))}
      </div>

      <NoDataNotice
        title="No placement data"
        message="Candidate reports are shown on the candidate dashboard only."
      />
    </div>
  )

  const renderAdminView = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Overview</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          No admin analytics are connected yet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Users', value: '0' },
          { label: 'Sessions Today', value: '0' },
          { label: 'Questions in Bank', value: '0' },
          { label: 'Avg Platform Score', value: '0.0' },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {stat.label}
            </p>
          </Card>
        ))}
      </div>

      <NoDataNotice
        title="No admin data"
        message="Admin summary metrics are not wired to a data source yet."
      />
    </div>
  )

  if (user.role === 'candidate') {
    return renderCandidateView()
  }

  if (user.role === 'coach') {
    return renderCoachView()
  }

  if (user.role === 'placement_officer') {
    return renderPlacementOfficerView()
  }

  return renderAdminView()
}
