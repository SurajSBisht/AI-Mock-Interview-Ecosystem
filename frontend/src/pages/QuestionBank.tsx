import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import {
  Database,
  Edit2,
  Lock,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { mockQuestions } from '../utils/mockData'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { Input } from '../components/ui/Input'
import { cn } from '../utils/cn'
import { z } from 'zod'

const addQuestionSchema = z.object({
  text: z.string().min(10, 'Min 10 characters'),
  category: z.enum(['Technical', 'Behavioral', 'HR']),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  tags: z.string(),
})

type AddQuestionFormData = z.infer<typeof addQuestionSchema>

export function QuestionBank() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState(mockQuestions)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [difficultyFilter, setDifficultyFilter] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddQuestionFormData>({
    resolver: zodResolver(addQuestionSchema),
    defaultValues: {
      category: 'Technical',
      difficulty: 'Easy',
      tags: '',
      text: '',
    },
  })

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const matchesSearch = question.text
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesCategory =
        categoryFilter === 'All' || question.category === categoryFilter
      const matchesDifficulty =
        difficultyFilter === 'All' || question.difficulty === difficultyFilter

      return matchesSearch && matchesCategory && matchesDifficulty
    })
  }, [categoryFilter, difficultyFilter, questions, search])

  const handleAddQuestion = async (data: AddQuestionFormData) => {
    const nextQuestion = {
      id: `q-${questions.length + 1}-${questions[0]?.id ?? 'new'}`,
      text: data.text,
      category: data.category,
      difficulty: data.difficulty,
      tags: data.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      createdBy: user?.fullName ?? 'Anonymous',
      createdAt: new Date().toISOString(),
    }

    setQuestions((current) => [nextQuestion, ...current])
    toast.success('Question added!')
    setIsModalOpen(false)
    reset()
  }

  const handleDeleteQuestion = () => {
    if (!deleteConfirmId) {
      return
    }

    setQuestions((current) =>
      current.filter((question) => question.id !== deleteConfirmId),
    )
    toast.success('Question deleted')
    setDeleteConfirmId(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
    return (
      <EmptyState
        icon={Lock}
        title="Access Denied"
        message="You do not have permission to view the question bank."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Question Bank
          </h1>
          <Badge label={String(questions.length)} variant="info" />
        </div>
        <Button type="button" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions..."
            className={cn(
              'w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
            )}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className={cn(
            'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
          )}
        >
          <option value="All">All</option>
          <option value="Technical">Technical</option>
          <option value="Behavioral">Behavioral</option>
          <option value="HR">HR</option>
        </select>

        <select
          value={difficultyFilter}
          onChange={(event) => setDifficultyFilter(event.target.value)}
          className={cn(
            'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
          )}
        >
          <option value="All">All</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      {filteredQuestions.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuestions.map((question) => (
            <Card key={question.id} className="flex h-full flex-col justify-between">
              <div className="space-y-3">
                <p className="line-clamp-2 text-sm text-gray-700 dark:text-gray-200">
                  {question.text}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge label={question.category} variant="info" />
                  <Badge label={question.difficulty} variant="warning" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400">By {question.createdBy}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    aria-label="Edit question"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(question.id)}
                    className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-danger dark:hover:bg-gray-700"
                    aria-label="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Database}
          title="No questions found"
          message="Try adjusting your filters or search"
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Question"
      >
        <form className="space-y-4" onSubmit={handleSubmit(handleAddQuestion)}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Question Text
            </label>
            <textarea
              rows={4}
              className={cn(
                'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
              )}
              {...register('text')}
            />
            {errors.text ? (
              <p className="mt-1 text-xs text-danger">{errors.text.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category
            </label>
            <select
              className={cn(
                'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
              )}
              {...register('category')}
            >
              <option value="Technical">Technical</option>
              <option value="Behavioral">Behavioral</option>
              <option value="HR">HR</option>
            </select>
            {errors.category ? (
              <p className="mt-1 text-xs text-danger">{errors.category.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Difficulty
            </label>
            <select
              className={cn(
                'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
              )}
              {...register('difficulty')}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            {errors.difficulty ? (
              <p className="mt-1 text-xs text-danger">
                {errors.difficulty.message}
              </p>
            ) : null}
          </div>

          <Input
            label="Tags"
            placeholder="comma separated"
            error={errors.tags?.message}
            {...register('tags')}
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add Question
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Question"
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this question? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteQuestion}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
