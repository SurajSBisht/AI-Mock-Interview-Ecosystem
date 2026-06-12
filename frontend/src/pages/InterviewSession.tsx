import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  Clock,
  Mic,
  MicOff,
  Video,
  Volume2,
  Type,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { cn } from '../utils/cn'

interface MockFeedback {
  score: number
  comment: string
  goodPoints: string[]
  improvements: string[]
}

interface SessionConfig {
  jobRole: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  sessionMinutes: 10 | 18
  answerMode: 'text' | 'voice'
  techStacks: string[]
}

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike
  isFinal: boolean
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface WindowWithSpeechApis extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

interface BuildQuestionArgs {
  role: string
  difficulty: SessionConfig['difficulty']
  techStacks: string[]
  previousAnswer: string
  turn: number
  wasNoise: boolean
}

const ROLE_FOCUS_OPTIONS: Record<string, string[]> = {
  'Frontend Developer': ['React', 'TypeScript', 'JavaScript', 'CSS', 'Performance'],
  'Backend Developer': ['Node.js', 'Express', 'Databases', 'APIs', 'Auth'],
  'Full Stack Developer': ['React', 'Node.js', 'APIs', 'Databases', 'System Design'],
  'Data Scientist': ['Python', 'SQL', 'Machine Learning', 'Statistics', 'Pandas'],
  'DevOps Engineer': ['Docker', 'Kubernetes', 'CI/CD', 'Cloud', 'Monitoring'],
  HR: ['Communication', 'Leadership', 'Conflict Resolution', 'Hiring', 'Growth'],
}

const ROLE_DEFAULT_DURATION: Record<string, SessionConfig['sessionMinutes']> = {
  'Frontend Developer': 18,
  'Backend Developer': 18,
  'Full Stack Developer': 18,
  'Data Scientist': 18,
  'DevOps Engineer': 18,
  HR: 10,
}

const DURATION_OPTIONS: SessionConfig['sessionMinutes'][] = [10, 18]
const VOICE_IDLE_MS = 6500
const TEXT_IDLE_MS = 9000

function generateMockFeedback(question: string, answer: string): MockFeedback {
  void question
  void answer
  const score = Math.floor(Math.random() * 4) + 6

  return {
    score,
    comment:
      score >= 8
        ? 'Excellent answer. You gave a strong, structured response.'
        : 'Good attempt. The answer is solid, but there is room for more depth.',
    goodPoints: [
      'Clear communication and structure',
      'Relevant reasoning',
      'Strong practical awareness',
    ].slice(0, score >= 8 ? 3 : 2),
    improvements:
      score >= 8
        ? ['Mention one edge case for even stronger coverage']
        : ['Add a concrete example', 'Explain the trade-offs more clearly'],
  }
}

function sanitizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isMeaningfulAnswer(answer: string) {
  const normalized = sanitizeText(answer)

  if (normalized.length < 18) {
    return false
  }

  const words = normalized.split(' ').filter(Boolean)

  if (words.length < 3) {
    return false
  }

  const vowelWords = words.filter((word) => /[aeiou]/i.test(word))

  if (vowelWords.length / words.length < 0.5) {
    return false
  }

  const compact = normalized.replace(/\s/g, '')

  if (/^(?:asdf|qwer|zxcv|hjkl|lkj|lol)+$/i.test(compact)) {
    return false
  }

  if (/([a-z])\1{4,}/i.test(compact)) {
    return false
  }

  if (/[^aeiou\s]{8,}/i.test(normalized)) {
    return false
  }

  return true
}

function pickFromList(items: string[], seed: number) {
  if (items.length === 0) {
    return ''
  }

  return items[seed % items.length]
}

function extractTopic(answer: string, techStacks: string[], role: string) {
  const normalized = answer.toLowerCase()
  const matchedTech = techStacks.find((stack) => normalized.includes(stack.toLowerCase()))

  if (matchedTech) {
    return matchedTech
  }

  const focusOptions = ROLE_FOCUS_OPTIONS[role] ?? []
  const matchedFocus = focusOptions.find((focus) =>
    normalized.includes(focus.toLowerCase()),
  )

  if (matchedFocus) {
    return matchedFocus
  }

  const tokens = normalized
    .split(/[^a-z0-9+.#-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 4)

  return tokens[0] ?? techStacks[0] ?? role
}

function buildInterviewQuestion({
  role,
  difficulty,
  techStacks,
  previousAnswer,
  turn,
  wasNoise,
}: BuildQuestionArgs) {
  const focus = techStacks[0] ?? ROLE_FOCUS_OPTIONS[role]?.[0] ?? role
  const topic = extractTopic(previousAnswer, techStacks, role)

  if (turn === 1) {
    return `Let's start broadly. Tell me about a recent project where you used ${focus} and the biggest choice you had to make.`
  }

  if (wasNoise) {
    return `I didn't catch a clear answer there. Let's reset the pace: give me one concrete example of how you used ${focus}.`
  }

  const followUps = [
    `You mentioned ${topic}. How would you take that one step deeper if I asked about scale or trade-offs?`,
    `If ${topic} started failing in production, how would you diagnose it without guessing?`,
    `What would change in your approach to ${topic} if the requirements became more strict?`,
    `How would you explain the ${topic} decision to a teammate who disagreed with you?`,
  ]

  const challengePrompts = [
    `Let's push on the edge cases. What might go wrong with your ${topic} approach?`,
    `If I asked for a simpler version of your ${topic} solution, what would you remove first?`,
    `What would you monitor to know your ${topic} decision is actually working?`,
  ]

  const roleSpecificOpeners: Record<string, string[]> = {
    'Frontend Developer': [
      'How do you keep a frontend experience fast and accessible at the same time?',
      'What is the most important thing you check before shipping a React feature?',
    ],
    'Backend Developer': [
      'How do you think about reliability when designing backend APIs?',
      'What would you watch closely if this service got 10x traffic overnight?',
    ],
    'Full Stack Developer': [
      'How do you keep frontend and backend changes aligned when a feature is moving quickly?',
      'Where have you found the biggest bottleneck in full stack work: UI, API, or data layer?',
    ],
    'Data Scientist': [
      'How do you decide whether a model is useful beyond the notebook?',
      'What is the first thing you do when data quality looks suspicious?',
    ],
    'DevOps Engineer': [
      'How do you make deployment pipelines safer without slowing the team down too much?',
      'What would you check first during an incident on a live system?',
    ],
    HR: [
      'What is the most valuable lesson you have learned from feedback?',
      'How do you stay effective when priorities keep changing?',
    ],
  }

  const deeperPrompt = pickFromList(followUps, turn + topic.length + difficulty.length)
  const challengePrompt = pickFromList(challengePrompts, turn + focus.length)
  const rolePrompt = pickFromList(roleSpecificOpeners[role] ?? [], turn)

  if (turn % 4 === 0) {
    return rolePrompt || challengePrompt || deeperPrompt
  }

  if (difficulty === 'Hard' && turn % 2 === 0) {
    return challengePrompt || deeperPrompt || rolePrompt
  }

  if (turn % 3 === 0) {
    return deeperPrompt || challengePrompt || rolePrompt
  }

  return rolePrompt || deeperPrompt || challengePrompt
}

function getScoreClass(score: number) {
  if (score >= 8) {
    return 'text-success'
  }

  if (score >= 6) {
    return 'text-yellow-600 dark:text-yellow-400'
  }

  return 'text-danger'
}

function getDurationLabel(minutes: number) {
  return `${minutes} min`
}

export function InterviewSession() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const isListeningRef = useRef(false)
  const isSessionActiveRef = useRef(false)
  const currentAnswerRef = useRef('')
  const transcriptRef = useRef('')
  const startListeningRef = useRef<() => void>(() => undefined)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [phase, setPhase] = useState<'config' | 'session' | 'finished'>('config')
  const [config, setConfig] = useState<SessionConfig>({
    jobRole: 'Frontend Developer',
    difficulty: 'Medium',
    sessionMinutes: 18,
    answerMode: 'voice',
    techStacks: ROLE_FOCUS_OPTIONS['Frontend Developer'].slice(0, 2),
  })
  const [sessionId, setSessionId] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [questionHistory, setQuestionHistory] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [feedbacks, setFeedbacks] = useState<MockFeedback[]>([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [transcript, setTranscript] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0)

  const sessionSeconds = config.sessionMinutes * 60
  const currentTurn = questionHistory.length + 1
  const currentAnswerLength = currentAnswer.trim().length
  const voiceSupported = Boolean(
    (window as WindowWithSpeechApis).SpeechRecognition ||
      (window as WindowWithSpeechApis).webkitSpeechRecognition,
  )

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    setIsListening(false)

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
  }, [])

  useEffect(() => {
    currentAnswerRef.current = currentAnswer
  }, [currentAnswer])

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  const startListening = useCallback(() => {
    const windowWithSpeech = window as WindowWithSpeechApis
    const SpeechRecognitionCtor =
      windowWithSpeech.SpeechRecognition ?? windowWithSpeech.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = transcriptRef.current || currentAnswerRef.current || ''

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interimTranscript = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const speechResult = event.results[index]
        const spokenText = speechResult[0].transcript

        if (speechResult.isFinal) {
          finalTranscript += spokenText
        } else {
          interimTranscript = spokenText
        }
      }

      const fullTranscript = finalTranscript + interimTranscript
      setTranscript(fullTranscript)
      setCurrentAnswer(fullTranscript)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      console.error('Speech error:', event.error)

      if (
        (event.error === 'no-speech' || event.error === 'audio-capture') &&
        isListeningRef.current
      ) {
        recognition.stop()
        window.setTimeout(() => {
          if (isListeningRef.current) {
            startListeningRef.current()
          }
        }, 300)
      }
    }

    recognition.onend = () => {
      if (isListeningRef.current) {
        window.setTimeout(() => {
          if (isListeningRef.current) {
            startListeningRef.current()
          }
        }, 300)
      }
    }

    recognition.start()
    isListeningRef.current = true
    setIsListening(true)
  }, [])

  useEffect(() => {
    startListeningRef.current = startListening
  }, [startListening])

  const speakQuestion = useCallback(
    (text: string) => {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      synthRef.current = utterance

      const voices = window.speechSynthesis.getVoices()
      const englishVoices = voices.filter((voice) => voice.lang.startsWith('en'))
      setAvailableVoices(englishVoices)

      if (englishVoices[selectedVoiceIndex]) {
        utterance.voice = englishVoices[selectedVoiceIndex]
      }

      utterance.rate = 0.92
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)

        if (config.answerMode === 'voice' && isSessionActiveRef.current) {
          window.setTimeout(() => {
            if (isSessionActiveRef.current && !isListeningRef.current) {
              startListeningRef.current()
            }
          }, 500)
        }
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
      }

      window.speechSynthesis.speak(utterance)
    },
    [config.answerMode, selectedVoiceIndex],
  )

  const askNextQuestion = useCallback(
    (previousAnswer: string, wasNoise: boolean) => {
      const nextQuestion = buildInterviewQuestion({
        role: config.jobRole,
        difficulty: config.difficulty,
        techStacks: config.techStacks,
        previousAnswer,
        turn: currentTurn,
        wasNoise,
      })

      setQuestionHistory((current) => [...current, nextQuestion])
      setCurrentQuestion(nextQuestion)
      setCurrentAnswer('')
      setTranscript('')
      currentAnswerRef.current = ''
      transcriptRef.current = ''
    },
    [config.difficulty, config.jobRole, config.techStacks, currentTurn],
  )

  const finishSession = useCallback(() => {
    isSessionActiveRef.current = false
    window.speechSynthesis.cancel()
    stopListening()
    setIsSpeaking(false)
    setPhase('finished')
  }, [stopListening])

  const processTurn = useCallback(
    async (isAutoAdvance: boolean) => {
      if (!isSessionActiveRef.current || !currentQuestion || isSpeaking) {
        return
      }

      const rawAnswer = (transcriptRef.current || currentAnswerRef.current).trim()
      const meaningful = isMeaningfulAnswer(rawAnswer)
      const wasNoise = rawAnswer.length > 0 && !meaningful

      window.speechSynthesis.cancel()
      stopListening()
      setTranscript('')
      setCurrentAnswer('')
      currentAnswerRef.current = ''
      transcriptRef.current = ''

      const shouldRecordNoResponse = !rawAnswer.length
      const shouldRecordMeaningful = meaningful

      if (shouldRecordMeaningful || shouldRecordNoResponse) {
        setAnswers((current) => [...current, rawAnswer || 'No response'])
        // TODO: Replace with AI evaluation API call
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 1200)
        })

        const feedback = generateMockFeedback(currentQuestion, rawAnswer || 'No response')
        setFeedbacks((current) => [...current, feedback])
      }

      if (timeLeft <= 1) {
        finishSession()
        return
      }

      const transitionDelay = isAutoAdvance ? 650 : 350
      window.setTimeout(() => {
        askNextQuestion(rawAnswer, wasNoise)
      }, transitionDelay)
    },
    [askNextQuestion, currentQuestion, finishSession, isSpeaking, stopListening, timeLeft],
  )

  useEffect(() => {
    if (phase !== 'session') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          window.setTimeout(() => finishSession(), 0)
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [finishSession, phase])

  useEffect(() => {
    if (phase !== 'session' || isSpeaking) {
      return undefined
    }

    const idleTimeoutMs =
      config.answerMode === 'voice'
        ? currentAnswerLength > 0
          ? VOICE_IDLE_MS
          : VOICE_IDLE_MS + 2500
        : currentAnswerLength > 0
          ? TEXT_IDLE_MS
          : TEXT_IDLE_MS + 4000

    const timeoutId = window.setTimeout(() => {
      if (isSessionActiveRef.current) {
        void processTurn(true)
      }
    }, idleTimeoutMs)

    return () => window.clearTimeout(timeoutId)
  }, [
    config.answerMode,
    currentAnswerLength,
    isSpeaking,
    phase,
    processTurn,
    transcript,
  ])

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      const englishVoices = voices.filter((voice) => voice.lang.startsWith('en'))
      setAvailableVoices(englishVoices)
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.cancel()
      window.speechSynthesis.onvoiceschanged = null
      stopListening()
      isSessionActiveRef.current = false
    }
  }, [stopListening])

  useEffect(() => {
    if (phase !== 'session' || !currentQuestion) {
      return undefined
    }

    if (config.answerMode !== 'voice') {
      return undefined
    }

    const speakTimeoutId = window.setTimeout(() => {
      speakQuestion(currentQuestion)
    }, 400)

    return () => window.clearTimeout(speakTimeoutId)
  }, [config.answerMode, currentQuestion, phase, speakQuestion])

  useEffect(() => {
    if (phase !== 'session') {
      return undefined
    }

    return () => {
      window.speechSynthesis.cancel()
      stopListening()
    }
  }, [phase, stopListening])

  const handleRoleChange = (role: string) => {
    const defaultStacks = ROLE_FOCUS_OPTIONS[role] ?? []

    setConfig((current) => ({
      ...current,
      jobRole: role,
      sessionMinutes: ROLE_DEFAULT_DURATION[role] ?? 18,
      techStacks: defaultStacks.slice(0, 2),
    }))
  }

  const toggleTechStack = (stack: string) => {
    setConfig((current) => {
      const hasStack = current.techStacks.includes(stack)

      return {
        ...current,
        techStacks: hasStack
          ? current.techStacks.filter((item) => item !== stack)
          : [...current.techStacks, stack],
      }
    })
  }

  const startInterview = () => {
    const sessionDurationSeconds = config.sessionMinutes * 60
    const firstQuestion = buildInterviewQuestion({
      role: config.jobRole,
      difficulty: config.difficulty,
      techStacks: config.techStacks,
      previousAnswer: '',
      turn: 1,
      wasNoise: false,
    })

    const nextSessionId = crypto.randomUUID()

    setSessionId(nextSessionId)
    setQuestionHistory([firstQuestion])
    setCurrentQuestion(firstQuestion)
    setAnswers([])
    setFeedbacks([])
    setCurrentAnswer('')
    setTranscript('')
    currentAnswerRef.current = ''
    transcriptRef.current = ''
    setTimeLeft(sessionDurationSeconds)
    setIsListening(false)
    setIsSpeaking(false)
    isSessionActiveRef.current = true
    setPhase('session')
  }

  const resetInterview = () => {
    isSessionActiveRef.current = false
    window.speechSynthesis.cancel()
    stopListening()
    setPhase('config')
    setSessionId('')
    setCurrentQuestion('')
    setQuestionHistory([])
    setAnswers([])
    setFeedbacks([])
    setCurrentAnswer('')
    setTranscript('')
    setTimeLeft(0)
    setIsListening(false)
    setIsSpeaking(false)
  }

  const saveSessionAndNavigate = () => {
    localStorage.setItem(
      'lastSession',
      JSON.stringify({
        sessionId,
        jobRole: config.jobRole,
        difficulty: config.difficulty,
        sessionMinutes: config.sessionMinutes,
        techStacks: config.techStacks,
        questions: questionHistory,
        answers,
        feedbacks,
        completedAt: new Date().toISOString(),
      }),
    )
    navigate(`/interview/${sessionId}/result`)
  }

  const averageScore =
    feedbacks.length > 0
      ? (
          feedbacks.reduce((sum, feedback) => sum + feedback.score, 0) / feedbacks.length
        ).toFixed(1)
      : '0.0'

  const totalMeaningfulAnswers = feedbacks.length

  if (phase === 'config') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-2xl items-center justify-center px-4 py-8">
        <Card className="w-full space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Video className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Configure Your Live Interview
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This feels like a live AI interviewer, not a fixed question quiz.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Job Role
              </label>
              <select
                value={config.jobRole}
                onChange={(event) => handleRoleChange(event.target.value)}
                className={cn(
                  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
                )}
              >
                {Object.keys(ROLE_FOCUS_OPTIONS).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Interview Length
              </label>
              <div className="grid grid-cols-2 gap-3">
                {DURATION_OPTIONS.map((minutes) => {
                  const isSelected = config.sessionMinutes === minutes

                  return (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() =>
                        setConfig((current) => ({
                          ...current,
                          sessionMinutes: minutes,
                        }))
                      }
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-medium transition',
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
                      )}
                    >
                      {getDurationLabel(minutes)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Difficulty
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Easy', 'Medium', 'Hard'].map((level) => {
                  const isSelected = config.difficulty === level

                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        setConfig((current) => ({
                          ...current,
                          difficulty: level as SessionConfig['difficulty'],
                        }))
                      }
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-medium transition',
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
                      )}
                    >
                      {level}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Answer Mode
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { key: 'voice', title: 'Voice Mode', description: 'Speak naturally', icon: Mic },
                  { key: 'text', title: 'Text Mode', description: 'Type if needed', icon: Type },
                ].map((mode) => {
                  const Icon = mode.icon
                  const isSelected = config.answerMode === mode.key

                  return (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() =>
                        setConfig((current) => ({
                          ...current,
                          answerMode: mode.key as SessionConfig['answerMode'],
                        }))
                      }
                      className={cn(
                        'rounded-2xl p-4 text-left transition',
                        isSelected
                          ? 'border-2 border-primary bg-primary/5'
                          : 'border border-gray-200 dark:border-gray-700',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-primary dark:bg-gray-800">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {mode.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {mode.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tech Stack Focus
              </label>
              <div className="flex flex-wrap gap-2">
                {(ROLE_FOCUS_OPTIONS[config.jobRole] ?? []).map((stack) => {
                  const selected = config.techStacks.includes(stack)

                  return (
                    <button
                      key={stack}
                      type="button"
                      onClick={() => toggleTechStack(stack)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm transition',
                        selected
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
                      )}
                    >
                      {stack}
                    </button>
                  )
                })}
              </div>
            </div>

            {availableVoices.length > 0 ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Interviewer Voice
                </label>
                <select
                  value={selectedVoiceIndex}
                  onChange={(event) => setSelectedVoiceIndex(Number(event.target.value))}
                  className={cn(
                    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
                  )}
                >
                  {availableVoices.map((voice, index) => (
                    <option key={`${voice.name}-${index}`} value={index}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <Button type="button" size="lg" className="w-full" onClick={startInterview}>
              Start Live Interview
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-md items-center justify-center px-4 py-8">
        <Card className="w-full text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-success" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Interview Complete! 🎉
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Great job completing your live interview session.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Questions Asked</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                {questionHistory.length}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Average Score</p>
              <p className={cn('mt-1 font-semibold', getScoreClass(Number(averageScore)))}>
                {averageScore}/10
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Meaningful</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                {totalMeaningfulAnswers}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" className="w-full" onClick={saveSessionAndNavigate}>
              View Detailed Report
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={resetInterview}
            >
              Practice Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="h-1.5 rounded bg-gray-200 dark:bg-gray-700">
        <div
          className="h-1.5 rounded bg-primary transition-all duration-300"
          style={{
            width: `${((config.sessionMinutes * 60 - timeLeft) / sessionSeconds) * 100}%`,
          }}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={config.jobRole} variant="info" />
          <Badge label={config.difficulty} variant="warning" />
          <Badge label={getDurationLabel(config.sessionMinutes)} variant="default" />
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            Live Question {currentTurn}
          </p>
          {isSpeaking ? (
            <p className="animate-pulse text-sm text-primary">
              🎙️ Interviewer speaking...
            </p>
          ) : (
            <p className="text-sm text-gray-400">🎤 Your turn</p>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300',
            timeLeft < 60 ? 'font-bold text-danger animate-pulse' : null,
          )}
        >
          <Clock className="h-4 w-4" />
          {Math.max(timeLeft, 0)}s
        </div>
      </div>

      <Card className="space-y-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user?.fullName ? `Practicing as ${user.fullName}` : 'Practicing interview skills'}
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Interviewer</p>
              <h2 className="mt-2 text-xl font-medium leading-relaxed text-gray-900 dark:text-gray-100">
                {currentQuestion}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => speakQuestion(currentQuestion)}
              disabled={isSpeaking || config.answerMode !== 'voice'}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
              aria-label="Replay question"
              title="Replay question"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {config.answerMode === 'text' ? (
          <div className="space-y-3">
            <textarea
              value={currentAnswer}
              onChange={(event) => setCurrentAnswer(event.target.value)}
              placeholder="Type your answer. The interviewer will continue after a short pause."
              className={cn(
                'min-h-32 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
              )}
            />
            <div className="text-xs text-gray-400">
              The session advances automatically when you pause.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isSpeaking ? (
              <p className="text-sm text-gray-400">Please wait for the interviewer to finish.</p>
            ) : null}

            {!voiceSupported ? (
              <Card className="border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Voice input not supported in this browser. Please use Chrome.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4"
                  onClick={() =>
                    setConfig((current) => ({
                      ...current,
                      answerMode: 'text',
                    }))
                  }
                >
                  Switch to Text Mode
                </Button>
              </Card>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) {
                      return
                    }

                    if (isListening) {
                      stopListening()
                    } else {
                      startListening()
                    }
                  }}
                  disabled={isSpeaking}
                  className={cn(
                    'rounded-full p-6 text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50',
                    isListening ? 'bg-danger animate-pulse' : 'bg-primary',
                  )}
                  aria-label="Toggle voice recognition"
                >
                  {isListening ? (
                    <MicOff className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  {isListening ? (
                    <>
                      <span className="h-3 w-3 animate-pulse rounded-full bg-danger" />
                      Listening...
                    </>
                  ) : (
                    'The interviewer will start listening when it is your turn.'
                  )}
                </div>
                <textarea
                  value={transcript}
                  readOnly
                  placeholder="Your transcript will appear here..."
                  className={cn(
                    'min-h-32 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
                  )}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>No submit button. The interviewer advances after your pause.</span>
          <span>{currentAnswer.length} characters</span>
        </div>
      </Card>
    </div>
  )
}
