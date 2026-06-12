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
import { mockSessions, mockUser } from '../utils/mockData'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../utils/cn'

function getScoreClass(score: number) {
  if (score >= 8) {
    return 'text-success'
  }

  if (score >= 6) {
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

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    const saved = localStorage.getItem('userSessions')
    const localSessions = saved ? JSON.parse(saved) : []
    const formattedLocal = localSessions.map((arch: any) => ({
      id: arch.sessionId,
      candidateId: arch.metadata.candidateId,
      jobRole: arch.metadata.jobRole,
      difficulty: 'Medium',
      totalQuestions: arch.candidateResponses.length,
      answerMode: arch.metadata.answerMode,
      status: arch.metadata.status,
      overallScore: arch.evaluation?.overallScore,
      createdAt: arch.metadata.createdAt || arch.completedAt,
    }))

    setSessions([...formattedLocal, ...mockSessions])

    return () => window.clearTimeout(timeoutId)
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

  const firstName =
    user.fullName.split(' ').find((part) => part.length > 0) ?? mockUser.fullName

  const completedSessions = sessions.filter(s => s.status === 'completed')
  const completedCount = completedSessions.length
  
  const scoredSessions = sessions.filter(s => typeof s.overallScore === 'number')
  const averageScore = scoredSessions.length > 0
    ? (scoredSessions.reduce((sum, s) => sum + (s.overallScore || 0), 0) / scoredSessions.length).toFixed(1)
    : '7.8'

  const pendingCount = sessions.filter(s => s.status === 'active' || s.status === 'pending').length

  const renderCandidateView = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {firstName}! 👋</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Ready for your next interview practice?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: 'Sessions Completed',
            value: String(completedCount),
            icon: Video,
            iconClass: 'text-primary',
          },
          {
            label: 'Average Score',
            value: `${averageScore}/10`,
            icon: Trophy,
            iconClass: 'text-success',
          },
          {
            label: 'Day Streak',
            value: '5 days',
            icon: Flame,
            iconClass: 'text-orange-500',
          },
          {
            label: 'Pending Feedback',
            value: String(pendingCount),
            icon: MessageSquare,
            iconClass: 'text-accent',
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
      <h1 className="text-2xl font-bold">Coach Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { label: 'Pending Reviews', value: '4', icon: Clock },
          { label: 'Completed Reviews', value: '18', icon: Trophy },
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

      <div className="grid grid-cols-1 gap-4">
        {[
          {
            candidate: 'Aarav Sharma',
            jobRole: 'Frontend Developer',
            date: 'Jun 11, 2026',
          },
          {
            candidate: 'Meera Patel',
            jobRole: 'Full Stack Developer',
            date: 'Jun 10, 2026',
          },
          {
            candidate: 'Ishaan Verma',
            jobRole: 'Data Scientist',
            date: 'Jun 09, 2026',
          },
        ].map((session) => (
          <Card key={`${session.candidate}-${session.date}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {session.candidate}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {session.jobRole} • {session.date}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge label="Pending Review" variant="warning" />
                <Button type="button">Review Now</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderPlacementOfficerView = () => (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Placement Overview</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total Candidates', value: '42' },
          { label: 'Average Score', value: '7.2' },
          { label: 'Top Performers', value: '8' },
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

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium">Sessions</th>
                <th className="py-3 pr-4 font-medium">Avg Score</th>
                <th className="py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Aarav Sharma', sessions: 12, score: 8.8, status: 'Top Performer' },
                { name: 'Meera Patel', sessions: 10, score: 8.2, status: 'Strong' },
                { name: 'Ishaan Verma', sessions: 9, score: 7.9, status: 'Strong' },
                { name: 'Ananya Gupta', sessions: 8, score: 7.5, status: 'Improving' },
                { name: 'Rohan Singh', sessions: 7, score: 7.1, status: 'Improving' },
              ].map((candidate) => (
                <tr
                  key={candidate.name}
                  className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                >
                  <td className="py-4 pr-4 text-gray-600 dark:text-gray-300">
                    {candidate.name}
                  </td>
                  <td className="py-4 pr-4 text-gray-600 dark:text-gray-300">
                    {candidate.sessions}
                  </td>
                  <td className="py-4 pr-4 text-gray-600 dark:text-gray-300">
                    {candidate.score}
                  </td>
                  <td className="py-4">
                    <Badge label={candidate.status} variant="info" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Button type="button" variant="secondary">
        Export Report
      </Button>
    </div>
  )

  const renderAdminView = () => (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin Overview</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Users', value: '156' },
          { label: 'Sessions Today', value: '23' },
          { label: 'Questions in Bank', value: '89' },
          { label: 'Avg Platform Score', value: '7.4' },
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={() => navigate('/admin')}>
          Manage Users
        </Button>
        <Button type="button" variant="secondary" onClick={() => navigate('/questions')}>
          Question Bank
        </Button>
      </div>
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
