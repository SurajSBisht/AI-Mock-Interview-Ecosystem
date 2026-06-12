import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  CheckCircle,
  Clock,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { cn } from '../utils/cn'
import {
  INTERVIEW_DURATION_OPTIONS,
  JOB_ROLES,
  TEXT_IDLE_TIMEOUT_MS,
  VOICE_SILENCE_TIMEOUT_MS,
} from '../utils/constants'
import type {
  AIResponse,
  CandidateResponse,
  ConversationMessage,
  InterviewArchive,
  InterviewPhase,
  SessionMetadata,
} from '../types'

type InterviewDuration = (typeof INTERVIEW_DURATION_OPTIONS)[number]
type AnswerMode = 'text' | 'voice'

type SpeechSupportWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
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

interface SessionConfig {
  jobRole: string
  techStacks: string[]
  durationMinutes: InterviewDuration
  answerMode: AnswerMode
  resumeContext: string
}

const ROLE_CONTEXT_OPTIONS: Record<string, string[]> = {
  'Frontend Developer': ['React', 'TypeScript', 'Accessibility', 'Performance'],
  'Backend Developer': ['Node.js', 'APIs', 'Databases', 'Authentication'],
  'Full Stack Developer': ['React', 'Node.js', 'APIs', 'System Design'],
  'Data Scientist': ['Python', 'SQL', 'Machine Learning', 'Statistics'],
  'DevOps Engineer': ['Docker', 'Kubernetes', 'CI/CD', 'Cloud'],
  HR: ['Communication', 'Conflict Resolution', 'Hiring', 'Culture'],
}

function formatDuration(minutes: InterviewDuration) {
  return `${minutes} min`
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getContextChips(role: string) {
  return ROLE_CONTEXT_OPTIONS[role] ?? []
}

function createSystemMessage(sessionId: string, content: string): ConversationMessage {
  return {
    id: crypto.randomUUID(),
    sessionId,
    speaker: 'system',
    content,
    createdAt: new Date().toISOString(),
    source: 'system',
  }
}

function joinTranscript(responses: CandidateResponse[]) {
  return responses.map((response) => response.content).join('\n\n')
}

function buildMetadata(
  sessionId: string,
  userId: string,
  userName: string,
  config: SessionConfig,
  startedAt: string,
): SessionMetadata {
  return {
    sessionId,
    candidateId: userId,
    candidateName: userName,
    jobRole: config.jobRole,
    techStacks: config.techStacks,
    durationMinutes: config.durationMinutes,
    answerMode: config.answerMode,
    resumeContext: config.resumeContext.trim() || undefined,
    createdAt: startedAt,
    startedAt,
    status: 'live',
  }
}

function supportsSpeechRecognition(windowObject: Window) {
  const support = windowObject as SpeechSupportWindow
  return Boolean(support.SpeechRecognition || support.webkitSpeechRecognition)
}

export function InterviewSession() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const isListeningRef = useRef(false)
  const isLiveRef = useRef(false)
  const isManualStopRef = useRef(false)
  const draftStartedAtRef = useRef<string | null>(null)
  const speechTimerRef = useRef<number | null>(null)
  const sessionTimerRef = useRef<number | null>(null)
  const spokenAssistantIdsRef = useRef(new Set<string>())
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  const [phase, setPhase] = useState<InterviewPhase>('config')
  const [config, setConfig] = useState<SessionConfig>({
    jobRole: JOB_ROLES[0],
    techStacks: getContextChips(JOB_ROLES[0]).slice(0, 3),
    durationMinutes: 18,
    answerMode: 'voice',
    resumeContext: '',
  })
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [candidateResponses, setCandidateResponses] = useState<CandidateResponse[]>([])
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [currentDraft, setCurrentDraft] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isAwaitingAI, setIsAwaitingAI] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0)
  const [speechSupported, setSpeechSupported] = useState(true)

  const sessionDurationSeconds = config.durationMinutes * 60
  const currentContextChips = useMemo(
    () => getContextChips(config.jobRole),
    [config.jobRole],
  )
  const liveTranscript = config.answerMode === 'voice' ? currentTranscript : currentDraft
  const conversationTurnCount = candidateResponses.length + aiResponses.length

  const stopListening = useCallback(() => {
    isManualStopRef.current = true
    isListeningRef.current = false
    setIsListening(false)

    const activeRecognition = recognitionRef.current
    recognitionRef.current = null
    activeRecognition?.stop()
  }, [])

  const cancelSpeech = useCallback(() => {
    window.speechSynthesis.cancel()
    synthRef.current = null
    setIsSpeaking(false)
  }, [])

  const speakText = useCallback(
    (text: string, resumeListeningAfter = false) => {
      if (!text.trim()) {
        return
      }

      const windowWithSpeech = window as SpeechSupportWindow
      const voices = windowWithSpeech.speechSynthesis.getVoices()
      const englishVoices = voices.filter((voice) => voice.lang.startsWith('en'))

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      synthRef.current = utterance

      if (englishVoices[selectedVoiceIndex]) {
        utterance.voice = englishVoices[selectedVoiceIndex]
      }

      utterance.rate = 0.94
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        if (resumeListeningAfter && config.answerMode === 'voice' && isLiveRef.current) {
          window.setTimeout(() => {
            if (isLiveRef.current && !isListeningRef.current) {
              startListening()
            }
          }, 500)
        }
      }
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    },
    [config.answerMode, selectedVoiceIndex],
  )

  const commitDraft = useCallback(
    async (silenceDetected: boolean) => {
      const content = liveTranscript.trim()

      if (!sessionId || !content) {
        return false
      }

      const completedAt = new Date().toISOString()
      const startedAt = draftStartedAtRef.current ?? completedAt
      const messageId = crypto.randomUUID()
      const responseId = crypto.randomUUID()

      cancelSpeech()
      stopListening()

      const message: ConversationMessage = {
        id: messageId,
        sessionId,
        speaker: 'candidate',
        content,
        createdAt: completedAt,
        source: config.answerMode,
        metadata: {
          silenceDetected,
        },
      }

      const response: CandidateResponse = {
        id: responseId,
        sessionId,
        messageId,
        content,
        source: config.answerMode,
        startedAt,
        completedAt,
        silenceDetected,
      }

      setMessages((current) => [...current, message])
      setCandidateResponses((current) => [...current, response])
      setCurrentTranscript('')
      setCurrentDraft('')
      draftStartedAtRef.current = null
      setIsAwaitingAI(true)
      return true
    },
    [cancelSpeech, config.answerMode, liveTranscript, sessionId, stopListening],
  )

  const startListening = useCallback(() => {
    const windowWithSpeech = window as SpeechSupportWindow
    const SpeechRecognitionCtor =
      windowWithSpeech.SpeechRecognition ?? windowWithSpeech.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false)
      return
    }

    if (isSpeaking) {
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    isManualStopRef.current = false
    isListeningRef.current = true
    setIsListening(true)
    setIsAwaitingAI(false)

    if (!draftStartedAtRef.current) {
      draftStartedAtRef.current = new Date().toISOString()
    }

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let transcript = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        transcript += result[0].transcript
      }

      const nextTranscript = transcript.trim()

      setCurrentTranscript(nextTranscript)
      setCurrentDraft(nextTranscript)
      if (nextTranscript && !draftStartedAtRef.current) {
        draftStartedAtRef.current = new Date().toISOString()
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      console.error('Speech recognition error:', event.error)

      if (
        (event.error === 'no-speech' || event.error === 'audio-capture') &&
        isListeningRef.current
      ) {
        recognition.stop()
        window.setTimeout(() => {
          if (isListeningRef.current && !isSpeaking) {
            startListening()
          }
        }, 300)
      }
    }

    recognition.onend = () => {
      if (isManualStopRef.current) {
        isManualStopRef.current = false
        return
      }

      if (isListeningRef.current) {
        window.setTimeout(() => {
          if (isListeningRef.current && !isSpeaking) {
            startListening()
          }
        }, 300)
      }
    }

    recognition.start()
  }, [isSpeaking])

  const completeSession = useCallback(async () => {
    if (!sessionId) {
      setPhase('complete')
      return
    }

    isLiveRef.current = false
    cancelSpeech()
    stopListening()

    const completedAt = new Date().toISOString()
    const archive: InterviewArchive = {
      sessionId,
      metadata: {
        ...buildMetadata(
          sessionId,
          user?.id ?? 'anonymous',
          user?.fullName ?? 'Candidate',
          config,
          messages[0]?.createdAt ?? completedAt,
        ),
        completedAt,
        status: 'completed',
      },
      messages,
      candidateResponses,
      aiResponses,
      completedAt,
      transcript: joinTranscript(candidateResponses),
    }

    localStorage.setItem('lastSession', JSON.stringify(archive))
    setPhase('complete')
    navigate(`/interview/${sessionId}/result`)
  }, [
    aiResponses,
    candidateResponses,
    cancelSpeech,
    config,
    messages,
    navigate,
    sessionId,
    stopListening,
    user?.fullName,
    user?.id,
  ])

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      const englishVoices = voices.filter((voice) => voice.lang.startsWith('en'))
      setAvailableVoices(englishVoices)
      if (englishVoices.length > 0) {
        setSelectedVoiceIndex((current) => Math.min(current, englishVoices.length - 1))
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.onvoiceschanged = null
      cancelSpeech()
    }
  }, [cancelSpeech])

  useEffect(() => {
    setSpeechSupported(supportsSpeechRecognition(window))
  }, [])

  useEffect(() => {
    if (phase !== 'live') {
      return undefined
    }

    sessionTimerRef.current = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          if (sessionTimerRef.current !== null) {
            window.clearInterval(sessionTimerRef.current)
            sessionTimerRef.current = null
          }
          void completeSession()
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => {
      if (sessionTimerRef.current !== null) {
        window.clearInterval(sessionTimerRef.current)
        sessionTimerRef.current = null
      }
    }
  }, [completeSession, phase])

  useEffect(() => {
    if (phase !== 'live' || isSpeaking) {
      return undefined
    }

    const content = liveTranscript.trim()
    if (!content) {
      return undefined
    }

    const timeoutMs =
      config.answerMode === 'voice' ? VOICE_SILENCE_TIMEOUT_MS : TEXT_IDLE_TIMEOUT_MS

    if (speechTimerRef.current !== null) {
      window.clearTimeout(speechTimerRef.current)
    }

    speechTimerRef.current = window.setTimeout(() => {
      void commitDraft(true)
    }, timeoutMs)

    return () => {
      if (speechTimerRef.current !== null) {
        window.clearTimeout(speechTimerRef.current)
        speechTimerRef.current = null
      }
    }
  }, [commitDraft, config.answerMode, isSpeaking, liveTranscript, phase])

  useEffect(() => {
    if (phase !== 'live') {
      return undefined
    }

    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.speaker === 'assistant')

    if (!latestAssistant || spokenAssistantIdsRef.current.has(latestAssistant.id)) {
      return undefined
    }

    spokenAssistantIdsRef.current.add(latestAssistant.id)
    speakText(latestAssistant.content, true)

    return undefined
  }, [messages, phase, speakText])

  useEffect(() => {
    if (phase !== 'live') {
      isLiveRef.current = false
      return undefined
    }

    isLiveRef.current = true

    return () => {
      isLiveRef.current = false
      cancelSpeech()
      stopListening()
      if (speechTimerRef.current !== null) {
        window.clearTimeout(speechTimerRef.current)
        speechTimerRef.current = null
      }
    }
  }, [cancelSpeech, phase, stopListening])

  const handleRoleChange = (role: string) => {
    setConfig((current) => ({
      ...current,
      jobRole: role,
      techStacks: getContextChips(role).slice(0, 3),
    }))
  }

  const handleTechStackToggle = (stack: string) => {
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

  const startSession = () => {
    const nextSessionId = crypto.randomUUID()
    const startedAt = new Date().toISOString()
    const metadata = buildMetadata(
      nextSessionId,
      user?.id ?? 'anonymous',
      user?.fullName ?? 'Candidate',
      config,
      startedAt,
    )

    const introMessage = createSystemMessage(
      nextSessionId,
      `Session prepared for ${config.jobRole}. This browser layer captures speech and text while a real AI interviewer stream can be plugged in later.`,
    )

    const contextMessage = createSystemMessage(
      nextSessionId,
      `Context loaded: ${metadata.jobRole}${metadata.techStacks.length > 0 ? ` - ${metadata.techStacks.join(', ')}` : ''}.`,
    )

    setSessionId(nextSessionId)
    setMessages([introMessage, contextMessage])
    setCandidateResponses([])
    setAiResponses([])
    setCurrentTranscript('')
    setCurrentDraft('')
    draftStartedAtRef.current = null
    setIsAwaitingAI(true)
    setRemainingSeconds(config.durationMinutes * 60)
    setPhase('live')
  }

  const resetSession = () => {
    isLiveRef.current = false
    cancelSpeech()
    stopListening()
    setPhase('config')
    setSessionId('')
    setMessages([])
    setCandidateResponses([])
    setAiResponses([])
    setCurrentTranscript('')
    setCurrentDraft('')
    draftStartedAtRef.current = null
    setIsAwaitingAI(false)
    setRemainingSeconds(0)
  }

  const finishSessionNow = () => {
    void completeSession()
  }

  const toggleListening = () => {
    if (isSpeaking) {
      return
    }

    if (isListening) {
      void commitDraft(true)
      return
    }

    if (config.answerMode !== 'voice' || !speechSupported) {
      return
    }

    startListening()
  }

  const handleTextChange = (value: string) => {
    if (!draftStartedAtRef.current && value.trim()) {
      draftStartedAtRef.current = new Date().toISOString()
    }

    setCurrentDraft(value)
    setCurrentTranscript(value)
    setIsAwaitingAI(false)
  }

  if (phase === 'config') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-3xl items-center justify-center px-4 py-8">
        <Card className="w-full space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Configure Your AI Interview
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This session records a natural conversation flow and is ready for real Gemini/OpenAI turn streaming.
            </p>
          </div>

          <div className="grid gap-5">
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
                {JOB_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Focus Areas
              </label>
              <div className="flex flex-wrap gap-2">
                {currentContextChips.map((stack) => {
                  const selected = config.techStacks.includes(stack)
                  return (
                    <button
                      key={stack}
                      type="button"
                      onClick={() => handleTechStackToggle(stack)}
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
              <p className="mt-2 text-xs text-gray-400">
                These context chips are passed forward for the backend AI interviewer.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Interview Length
              </label>
              <div className="grid grid-cols-2 gap-3">
                {INTERVIEW_DURATION_OPTIONS.map((minutes) => {
                  const selected = config.durationMinutes === minutes
                  return (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() =>
                        setConfig((current) => ({
                          ...current,
                          durationMinutes: minutes,
                        }))
                      }
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-medium transition',
                        selected
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
                      )}
                    >
                      {formatDuration(minutes)}
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
                  {
                    key: 'voice',
                    title: 'Voice Mode',
                    description: 'Answer with live speech and transcript capture',
                    icon: Mic,
                  },
                  {
                    key: 'text',
                    title: 'Text Mode',
                    description: 'Type your answers when voice is unavailable',
                    icon: Bot,
                  },
                ].map((mode) => {
                  const Icon = mode.icon
                  const selected = config.answerMode === mode.key

                  return (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() =>
                        setConfig((current) => ({
                          ...current,
                          answerMode: mode.key as AnswerMode,
                        }))
                      }
                      className={cn(
                        'rounded-2xl p-4 text-left transition',
                        selected
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
                Resume / Interview Context
              </label>
              <textarea
                value={config.resumeContext}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    resumeContext: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Paste a short resume summary, role context, or notes the AI interviewer should consider later."
                className={cn(
                  'min-h-28 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
                )}
              />
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

            <Button type="button" size="lg" className="w-full" onClick={startSession}>
              Start Interview
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-md items-center justify-center px-4 py-8">
        <Card className="w-full text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-success" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Interview Complete
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Your session has been saved as a conversational transcript for the backend AI evaluator.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Turns</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                {conversationTurnCount}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Mode</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                {config.answerMode.toUpperCase()}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Status</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">Saved</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" className="w-full" onClick={() => navigate(`/interview/${sessionId}/result`)}>
              View Review
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={resetSession}>
              Start Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const isVoiceMode = config.answerMode === 'voice'
  const canUseMic = isVoiceMode && speechSupported && !isSpeaking

  return (
    <div className="space-y-6">
      <div className="h-1.5 rounded bg-gray-200 dark:bg-gray-700">
        <div
          className="h-1.5 rounded bg-primary transition-all duration-300"
          style={{
            width: `${((sessionDurationSeconds - remainingSeconds) / sessionDurationSeconds) * 100}%`,
          }}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={config.jobRole} variant="info" />
          <Badge label={formatDuration(config.durationMinutes)} variant="warning" />
          <Badge label={isVoiceMode ? 'Voice' : 'Text'} variant="default" />
          <Badge
            label={speechSupported ? 'Speech ready' : 'Speech unsupported'}
            variant={speechSupported ? 'success' : 'danger'}
          />
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {isAwaitingAI ? 'Waiting for AI interviewer response' : 'Conversation in progress'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Sparkles className="h-4 w-4" />
            Browser voice and transcript capture are active
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300',
            remainingSeconds < 60 ? 'font-bold text-danger animate-pulse' : null,
          )}
        >
          <Clock className="h-4 w-4" />
          {formatTime(remainingSeconds)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Conversation</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                AI interviewer conversation feed
              </h2>
            </div>
            <button
              type="button"
              onClick={() => speakText(messages[0]?.content ?? '')}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-800"
              aria-label="Replay session intro"
              title="Replay session intro"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
            {messages.length > 0 ? (
              messages.map((message) => {
                const isCandidate = message.speaker === 'candidate'
                const isAssistant = message.speaker === 'assistant'

                return (
                  <div key={message.id} className={cn('flex', isCandidate ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                        isCandidate
                          ? 'bg-primary text-white'
                          : isAssistant
                            ? 'border border-indigo-100 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
                            : 'bg-transparent text-gray-500',
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
                        {isCandidate ? 'Candidate' : isAssistant ? 'AI interviewer' : 'System'}
                        <span>-</span>
                        <span>{formatTimestamp(message.createdAt)}</span>
                      </div>
                      <p className={cn(message.speaker === 'system' ? 'text-gray-500' : null)}>
                        {message.content}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                The conversation feed will fill here as the interview starts.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
              <Sparkles className="h-3.5 w-3.5" />
              Backend-ready turn stream
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
              <Bot className="h-3.5 w-3.5" />
              Assistant messages will auto-speak later
            </span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">Live Capture</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Voice or text answer entry
                </h3>
              </div>
              <Badge
                label={isListening ? 'Listening' : isAwaitingAI ? 'Awaiting turn' : 'Ready'}
                variant={isListening ? 'success' : isAwaitingAI ? 'warning' : 'default'}
              />
            </div>

            {config.answerMode === 'voice' ? (
              <div className="space-y-4">
                {!speechSupported ? (
                  <Card className="border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Voice input is not supported in this browser. Chrome works best for speech recognition.
                    </p>
                  </Card>
                ) : null}

                <div className="flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={!canUseMic && !isListening}
                    className={cn(
                      'rounded-full p-6 text-white transition disabled:cursor-not-allowed disabled:opacity-50',
                      isListening ? 'bg-danger animate-pulse' : 'bg-primary hover:bg-indigo-600',
                    )}
                    aria-label="Toggle microphone"
                  >
                    {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                  </button>

                  <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                    {isListening ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-danger" />
                        Listening to your answer
                      </div>
                    ) : isSpeaking ? (
                      'Please wait until the interviewer finishes speaking.'
                    ) : (
                      'Click the microphone and speak naturally. The transcript updates in real time.'
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={currentDraft}
                  onChange={(event) => handleTextChange(event.target.value)}
                  placeholder="Type naturally. The session will advance once you pause."
                  className={cn(
                    'min-h-40 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
                  )}
                />
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Silence detection will archive the answer automatically.</span>
                  <span>{currentDraft.length} characters</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Live Transcript
              </label>
              <textarea
                value={liveTranscript}
                readOnly
                placeholder="Transcript appears here as you speak or type..."
                className={cn(
                  'min-h-32 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
                )}
              />
            </div>

            {isAwaitingAI ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
                The frontend is waiting for a real AI interviewer response stream. Candidate turns are already captured and ready for backend processing.
              </div>
            ) : null}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Session Context</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Metadata prepared for backend AI
                </h3>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={finishSessionNow}>
                End Session
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge label={config.jobRole} variant="info" />
              <Badge label={config.answerMode.toUpperCase()} variant="default" />
              <Badge label={formatDuration(config.durationMinutes)} variant="warning" />
              <Badge label={`${candidateResponses.length} candidate turns`} variant="success" />
            </div>

            <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">Resume context:</span>{' '}
                {config.resumeContext.trim() || 'Not provided yet'}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">Turn count:</span>{' '}
                {conversationTurnCount}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">Conversation status:</span>{' '}
                Backend-ready and waiting for streamed AI follow-ups
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>No submit button. Silence and speech boundaries create candidate turns automatically.</span>
        <button
          type="button"
          onClick={resetSession}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset session
        </button>
      </div>
    </div>
  )
}
