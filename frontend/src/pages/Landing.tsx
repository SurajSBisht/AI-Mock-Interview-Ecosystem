import { BarChart2, Brain, Mic } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { ThemeToggle } from '../components/shared/ThemeToggle'
import { cn } from '../utils/cn'

const features = [
  {
    icon: Brain,
    iconClassName: 'text-primary',
    title: 'Adaptive AI Questions',
    description:
      'Questions adapt to your role, difficulty, and past performance',
  },
  {
    icon: Mic,
    iconClassName: 'text-accent',
    title: 'Voice or Text Answers',
    description: 'Answer by speaking or typing - just like a real interview',
  },
  {
    icon: BarChart2,
    iconClassName: 'text-success',
    title: 'Instant Feedback & Scores',
    description:
      'Get scored immediately with detailed feedback on every answer',
  },
]

const steps = [
  {
    number: '1',
    title: 'Configure',
    description:
      'Choose your job role, difficulty and number of questions',
  },
  {
    number: '2',
    title: 'Practice',
    description: 'Answer questions by voice or text with a live timer',
  },
  {
    number: '3',
    title: 'Improve',
    description: 'Review your scores, feedback and practice plan',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-violet-50 text-gray-900 dark:from-gray-900 dark:to-gray-950 dark:text-gray-100">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5">
        <Link to="/" className="text-2xl font-bold text-primary">
          AMIE
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/login"
            className={cn(
              'inline-flex items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:hover:bg-gray-800',
            )}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className={cn(
              'inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            )}
          >
            Get Started
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl items-center px-4 py-16">
          <div className="w-full text-center animate-fadeIn">
            <h1
              className={cn(
                'mx-auto max-w-5xl bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-4xl font-bold text-transparent md:text-6xl',
              )}
            >
              Practice Interviews. Get AI Feedback. Land Your Dream Job.
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-500 dark:text-gray-400">
              AMIE is your personal AI interview coach. Practice anytime, get
              instant feedback, and track your improvement.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className={cn(
                  'inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                )}
              >
                Register
              </Link>
              <Link
                to="/login"
                className={cn(
                  'inline-flex items-center justify-center rounded-lg bg-gray-100 px-6 py-3 text-base font-medium text-gray-800 transition-all duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
                )}
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-20">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <Card key={feature.title} className="h-full">
                  <Icon className={cn('mb-4 h-8 w-8', feature.iconClassName)} />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {feature.description}
                  </p>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-20">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
            How It Works
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <Card key={step.title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-gray-400">
        © 2026 AMIE — AI Mock Interview Ecosystem
      </footer>
    </div>
  )
}
