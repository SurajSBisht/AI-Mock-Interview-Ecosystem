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
  Video,
  VideoOff,
  MessageSquare,
  AlertCircle,
  Play,
  Upload,
  LogOut
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
import {
  generateInitialQuestion,
  generateNextQuestion,
  generateEvaluation,
  uploadResume,
} from '../utils/interviewEngine'

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


function getContextChips(role: string) {
  return ROLE_CONTEXT_OPTIONS[role] ?? []
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

function AudioVisualizer({ isActive, color = 'bg-primary' }: { isActive: boolean; color?: string }) {
  const bars = Array.from({ length: 15 })
  const delays = ['0.1s', '0.4s', '0.2s', '0.6s', '0.3s', '0.5s', '0.8s', '0.2s', '0.7s', '0.4s', '0.1s', '0.3s', '0.5s', '0.2s', '0.6s']

  return (
    <div className="flex h-8 items-center justify-center gap-1 bg-gray-50 dark:bg-gray-950 px-4 py-1.5 rounded-full">
      {bars.map((_, i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full transition-all duration-300',
            isActive ? `${color} animate-audio-wave` : 'h-1 bg-gray-300 dark:bg-gray-700',
          )}
          style={{
            animationDelay: isActive ? delays[i] : '0s',
            height: isActive ? undefined : '4px',
          }}
        />
      ))}
    </div>
  )
}

function Typewriter({
  text,
  active,
}: {
  text: string
  active: boolean
}) {
  const [shown, setShown] = useState('')
  const shownRef = useRef('')

  useEffect(() => {
    if (!active) return

    setShown('')
    shownRef.current = ''

    let i = 0
    const speedMs = 80
    const timer = window.setInterval(() => {
      i += Math.random() > 0.7 ? 2 : 1
      const next = text.slice(0, i)
      shownRef.current = next
      setShown(next)

      if (i >= text.length) {
        window.clearInterval(timer)
      }
    }, speedMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [active, text])

  return <>{shown}</>
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

  // Camera permissions and stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraEnabled, setCameraEnabled] = useState(true)

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
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [uploadedResumeName, setUploadedResumeName] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isAwaitingAI, setIsAwaitingAI] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  const sessionDurationSeconds = config.durationMinutes * 60
  const currentContextChips = useMemo(
    () => getContextChips(config.jobRole),
    [config.jobRole],
  )
  const liveTranscript = config.answerMode === 'voice' ? currentTranscript : currentDraft
 const conversationTurnCount = candidateResponses.length + aiResponses.length

const handleResumeUpload = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0]

  if (!file) return

  try {
    setIsUploadingResume(true)

    const resumeText = await uploadResume(file)

    setConfig((current) => ({
      ...current,
      resumeContext: resumeText,
    }))

    setUploadedResumeName(file.name)
  } catch (err) {
    console.error('Resume upload failed:', err)
    alert('Failed to upload resume')
  } finally {
    setIsUploadingResume(false)
  }
}

// Derived AI state for audio/glow visualizations
const aiState: 'idle' | 'speaking' | 'listening' | 'thinking' = useMemo(() => {
    if (isAwaitingAI) return 'thinking'
    if (isSpeaking) return 'speaking'
    if (isListening) return 'listening'
    return 'idle'
  }, [isAwaitingAI, isSpeaking, isListening])

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
      const normalized = content.toLowerCase()

const waitingPhrases = [
  'wait',
  'one sec',
  'one second',
  'hold on',
  'let me think',
  'thinking',
  'hmm',
  'umm',
  'uh',
  'give me a moment'
]

if (
  content.split(/\s+/).length < 3 ||
  waitingPhrases.some((phrase) => normalized.includes(phrase))
) {
  console.log('[InterviewSession] Waiting for a proper answer')
  return false
}
      // Hard guard with logging so we can see why submit does nothing
      if (!sessionId) {
        console.warn('[InterviewSession] commitDraft blocked: missing sessionId')
        alert('Interview not started yet (sessionId is missing). Please click “Begin AI Interview”.')
        return false
      }
      if (!content) {
        console.warn('[InterviewSession] commitDraft blocked: empty transcript')
        alert('No transcript captured yet. Speak again or use Text Mode.')
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

      const nextMessages = [...messages, message]
      setMessages(nextMessages)
      setCandidateResponses((current) => [...current, response])
      setCurrentTranscript('')
      setCurrentDraft('')
      draftStartedAtRef.current = null
      setIsAwaitingAI(true)

      // Fetch next question asynchronously from client-side AI mock engine
      try {
        const nextQuestion = await generateNextQuestion(
          nextMessages,
          config.jobRole,
          config.techStacks,
          config.resumeContext
        )

        const assistantMsgId = crypto.randomUUID()
        const assistantMsg: ConversationMessage = {
          id: assistantMsgId,
          sessionId,
          speaker: 'assistant',
          content: nextQuestion,
          createdAt: new Date().toISOString(),
          source: 'backend',
        }

        const aiResponse: AIResponse = {
          id: crypto.randomUUID(),
          sessionId,
          messageId: assistantMsgId,
          content: nextQuestion,
          createdAt: assistantMsg.createdAt,
          source: 'backend',
        }

        setMessages((current) => [...current, assistantMsg])
        setAiResponses((current) => [...current, aiResponse])
        setIsAwaitingAI(false)
      } catch (err) {
        console.error('Error generating next question:', err)
        setIsAwaitingAI(false)
      }

      return true
    },
    [cancelSpeech, config.answerMode, liveTranscript, sessionId, stopListening, messages, config.jobRole, config.techStacks, config.resumeContext],
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

    // Reset any existing recognition state before starting a new session
    try {
      recognitionRef.current?.stop()
    } catch {
      // ignore
    }

    recognitionRef.current = null

    // Clear any previous transcript so UI reflects new input
    setCurrentTranscript('')
    setCurrentDraft('')

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
      // Debug: confirm recognition is actually producing events
      console.log('[InterviewSession] onresult event:', {
        resultIndex: event.resultIndex,
        resultsLength: event.results?.length,
        isFinal: event.results?.[event.resultIndex]?.isFinal,
      })

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
      console.error('[InterviewSession] Speech recognition error:', {
        error: event.error,
        isListening: isListeningRef.current,
        isSpeaking,
        phase,
      })


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
    
    // Set UI to Awaiting AI state to display evaluation generator progress
    setIsAwaitingAI(true)
    let evaluationResult = undefined

    try {
      evaluationResult = await generateEvaluation(
        messages,
        config.jobRole,
        config.techStacks,
        config.resumeContext
      )
    } catch (err) {
      console.error('Error generating evaluation:', err)
    }
    setIsAwaitingAI(false)

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
      evaluation: evaluationResult,
    }

    // Save completed archive in localStorage
    const savedSessions = localStorage.getItem('userSessions')
    const sessionList = savedSessions ? JSON.parse(savedSessions) : []
    sessionList.unshift(archive)
    localStorage.setItem('userSessions', JSON.stringify(sessionList))
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

  // Camera stream control effect
  useEffect(() => {
    if (phase === 'live' && cameraEnabled) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
          streamRef.current = stream
        })
        .catch((err) => {
          console.error('Webcam stream error:', err)
          setCameraEnabled(false)
        })
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [phase, cameraEnabled])

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

  // Helpful hint in console for Web Speech API failures
  useEffect(() => {
    const w = window as SpeechSupportWindow
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      console.warn('[InterviewSession] Web Speech API not available in this browser')
      return
    }

    console.warn('[InterviewSession] Web Speech API detected. If you see Speech recognition error: network, check microphone permissions, https requirement, and browser/network settings.')
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

  const startSession = async () => {
    const nextSessionId = crypto.randomUUID()
    
    setSessionId(nextSessionId)
    setMessages([])
    setCandidateResponses([])
    setAiResponses([])
    setCurrentTranscript('')
    setCurrentDraft('')
    draftStartedAtRef.current = null
    setIsAwaitingAI(true)
    setRemainingSeconds(config.durationMinutes * 60)
    setPhase('live')

    try {
      const initialQuestionText = await generateInitialQuestion(
        config.jobRole,
        config.techStacks,
        config.resumeContext
      )

      const introMsgId = crypto.randomUUID()
      const introMessage: ConversationMessage = {
        id: introMsgId,
        sessionId: nextSessionId,
        speaker: 'assistant',
        content: initialQuestionText,
        createdAt: new Date().toISOString(),
        source: 'backend',
      }

      const aiResponse: AIResponse = {
        id: crypto.randomUUID(),
        sessionId: nextSessionId,
        messageId: introMsgId,
        content: initialQuestionText,
        createdAt: introMessage.createdAt,
        source: 'backend',
      }

      setMessages([introMessage])
      setAiResponses([aiResponse])
      setIsAwaitingAI(false)
    } catch (err) {
      console.error('Error initiating session question:', err)
      setIsAwaitingAI(false)
    }
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
        <Card className="w-full space-y-8 p-8 border border-gray-100 shadow-xl dark:border-gray-800">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Configure Your AI Interview
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Choose your role, focus tags, and answer mode. Emma, your AI Coach, will ask customized questions based on your selections.
            </p>
          </div>

          <div className="grid gap-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Target Job Role
              </label>
              <select
                value={config.jobRole}
                onChange={(event) => handleRoleChange(event.target.value)}
                className={cn(
                  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
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
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Focus Areas / Tech Stacks
              </label>
              <div className="flex flex-wrap gap-2.5">
                {currentContextChips.map((stack) => {
                  const selected = config.techStacks.includes(stack)
                  return (
                    <button
                      key={stack}
                      type="button"
                      onClick={() => handleTechStackToggle(stack)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition duration-200',
                        selected
                          ? 'border-primary bg-primary text-white shadow-md shadow-primary/20 scale-[1.03]'
                          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                      )}
                    >
                      {stack}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Emma will tailor questions specifically targeting these concepts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                          'rounded-xl border py-2.5 text-sm font-semibold transition duration-200',
                          selected
                            ? 'border-primary bg-primary text-white shadow-md shadow-primary/25'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                        )}
                      >
                        {formatDuration(minutes)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Interviewer Voice
                </label>
                {availableVoices.length > 0 ? (
                  <select
                    value={selectedVoiceIndex}
                    onChange={(event) => setSelectedVoiceIndex(Number(event.target.value))}
                    className={cn(
                      'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
                    )}
                  >
                    {availableVoices.map((voice, index) => (
                      <option key={`${voice.name}-${index}`} value={index}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-900">
                    System synthesizer loading...
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Answer Mode
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    key: 'voice',
                    title: 'Voice Mode (Recommended)',
                    description: 'Speak your answers out loud. Captures real-time transcript.',
                    icon: Mic,
                  },
                  {
                    key: 'text',
                    title: 'Text Mode',
                    description: 'Type your responses inside a text editor.',
                    icon: MessageSquare,
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
                        'rounded-2xl p-5 text-left border transition-all duration-200',
                        selected
                          ? 'border-2 border-primary bg-primary/5 shadow-md scale-[1.02]'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-850',
                      )}
                    >
                      <div className="flex gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {mode.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {mode.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          <div className="mb-4">
  {uploadedResumeName ? (
    <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-center">
      <p className="text-lg font-semibold text-green-600">
        ✅ Resume Uploaded
      </p>

      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        {uploadedResumeName}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        Resume content has been loaded for interview customization
      </p>
    </div>
  ) : (
    <label
      className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 p-6 text-center transition hover:border-primary hover:bg-primary/5"
    >
      <Upload className="mb-2 h-8 w-8 text-primary" />

      <p className="font-semibold text-gray-900 dark:text-gray-100">
        Upload Resume
      </p>

      <p className="mt-1 text-sm text-gray-500">
        PDF format only
      </p>

      <input
        type="file"
        accept=".pdf"
        onChange={handleResumeUpload}
        disabled={isUploadingResume}
        className="hidden"
      />
    </label>
  )}

  {isUploadingResume && (
    <p className="mt-3 text-center text-sm text-primary">
      📄 Reading resume...
    </p>
  )}
</div>
            <div className="hidden">
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Resume Context / Notes
              </label>
              <textarea
                value={config.resumeContext}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    resumeContext: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Paste summary points from your resume or job descriptions to customize Emma's focus."
                className={cn(
                  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
                )}
              />
            </div>

            <Button type="button" size="lg" className="w-full mt-2 font-bold py-3.5 shadow-lg shadow-primary/30" onClick={startSession}>
              <Play className="h-5 w-5 fill-current" />
              Begin AI Interview
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-md items-center justify-center px-4 py-8">
        <Card className="w-full text-center p-8 border border-gray-100 shadow-xl dark:border-gray-800">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success mb-6">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Interview Finished!
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Great job! Emma is synthesizing your evaluation report based on your responses.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Turns</p>
              <p className="mt-1 font-bold text-lg text-gray-900 dark:text-gray-100">
                {conversationTurnCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mode</p>
              <p className="mt-1 font-bold text-lg text-gray-900 dark:text-gray-100 capitalize">
                {config.answerMode}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Evaluation</p>
              <p className="mt-1 font-bold text-lg text-success">Ready</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button type="button" className="w-full font-bold py-3" onClick={() => navigate(`/interview/${sessionId}/result`)}>
              View Detailed Scorecard
            </Button>
            <Button type="button" variant="secondary" className="w-full font-bold py-3" onClick={resetSession}>
              Start A New Session
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const isVoiceMode = config.answerMode === 'voice'
  const canUseMic = isVoiceMode && speechSupported && !isSpeaking

  // Find the current active question to display prominently
  const activeQuestion = [...messages]
    .reverse()
    .find((m) => m.speaker === 'assistant')?.content || 'Preparing your interview setup...'

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4">
      {/* Top progress and action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Badge label={config.jobRole} variant="info" />
          <Badge label={isVoiceMode ? 'Voice Mode' : 'Text Mode'} variant="default" />
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-4 w-4 text-primary" />
            <span>Time remaining:</span>
            <span className={cn('font-bold', remainingSeconds < 90 ? 'text-danger animate-pulse' : 'text-gray-900 dark:text-gray-100')}>
              {formatTime(remainingSeconds)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <MessageSquare className="h-4 w-4" />
            {showHistory ? 'Hide Transcript' : 'Show Transcript'}
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={finishSessionNow}>
            <LogOut className="h-4 w-4" />
            End Session
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{
            width: `${((sessionDurationSeconds - remainingSeconds) / sessionDurationSeconds) * 100}%`,
          }}
        />
      </div>

      {/* Main Grid: Left Video streams, Right Answer capturing */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        
        {/* Left Column: Avatars/Video Stream Cards */}
        <div className="space-y-6">
          
          {/* AI Interviewer Emma Box */}
          <Card className={cn(
            'flex flex-col items-center justify-center p-6 text-center border-2 transition-all duration-300 shadow-lg relative overflow-hidden',
            aiState === 'speaking' && 'animate-glow-primary border-primary/40',
            aiState === 'listening' && 'animate-glow-success border-success/40',
            aiState === 'thinking' && 'animate-glow-accent border-accent/40',
            aiState === 'idle' && 'border-gray-200 dark:border-gray-700'
          )}>
            {/* Status indicator pill in top-right */}
            <div className="absolute top-4 right-4">
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                aiState === 'speaking' && 'bg-primary/10 text-primary',
                aiState === 'listening' && 'bg-success/10 text-success animate-pulse',
                aiState === 'thinking' && 'bg-accent/10 text-accent',
                aiState === 'idle' && 'bg-gray-100 text-gray-500 dark:bg-gray-800'
              )}>
                {aiState}
              </span>
            </div>

            {/* Emma Circular Avatar with state glows */}
            <div className="relative mb-4 mt-2">
              <div className={cn(
                'absolute inset-0 rounded-full scale-105 border border-dashed opacity-0 transition-all duration-300',
                aiState === 'speaking' && 'border-primary opacity-60 animate-spin',
                aiState === 'thinking' && 'border-accent opacity-60 animate-pulse',
              )} style={{ animationDuration: '6s' }} />
              <img
                src="/ai_avatar.png"
                alt="Emma"
                className={cn(
                  'w-24 h-24 rounded-full border-4 object-cover transition-transform duration-300 shadow-md',
                  aiState === 'speaking' && 'border-primary scale-[1.02]',
                  aiState === 'listening' && 'border-success',
                  aiState === 'thinking' && 'border-accent scale-95 opacity-80',
                  aiState === 'idle' && 'border-gray-200 dark:border-gray-700'
                )}
                onError={(e) => {
                  // Fallback if avatar image is unavailable
                  ;(e.target as HTMLImageElement).src = 'https://i.pravatar.cc/150?img=32'
                }}
              />
            </div>

            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 justify-center">
              <Bot className="h-4 w-4 text-primary" />
              Emma
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">AI Interview Coach</p>

            {/* Audio waveforms visualizer */}
            <div className="w-full mt-5">
              <AudioVisualizer
                isActive={aiState === 'speaking' || aiState === 'listening'}
                color={aiState === 'speaking' ? 'bg-primary' : 'bg-success'}
              />
            </div>

            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-4 h-4">
              {aiState === 'speaking' && 'Emma is asking a question...'}
              {aiState === 'listening' && '🎤 Your turn to answer'}
              {aiState === 'thinking' && 'Processing response...'}
              {aiState === 'idle' && 'Emma is ready.'}
            </p>
          </Card>

          {/* Candidate Webcam Feed Box */}
          <Card className="p-4 border border-gray-200 dark:border-gray-700 bg-gray-950 shadow-md relative overflow-hidden aspect-[4/3] flex flex-col justify-between">
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 text-gray-600 dark:text-gray-400">
                <VideoOff className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-xs font-medium">Camera Feed Disabled</p>
              </div>
            )}

            {/* Status overlay bar */}
            <div className="relative flex items-center justify-between w-full z-10">
              <span className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                {isListening ? 'Capture Active' : 'Idle'}
              </span>
              
              <button
                type="button"
                onClick={() => setCameraEnabled(!cameraEnabled)}
                className="bg-black/60 hover:bg-black/80 backdrop-blur-sm p-1.5 rounded-full text-white transition"
                title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
              >
                {cameraEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5 text-danger" />}
              </button>
            </div>

            <div className="relative w-full text-left z-10 mt-auto">
              <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-medium text-white">
                {user?.fullName || 'Candidate'} (You)
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column: Active question & transcripts */}
        <div className="flex flex-col gap-6">
          
          {/* Active Question Card */}
          <Card className="p-6 border border-gray-150 dark:border-gray-850 shadow-md bg-white dark:bg-gray-900 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Active Prompt</span>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-relaxed">
              {(() => {
                const latestAssistant = [...messages]
                  .reverse()
                  .find((m) => m.speaker === 'assistant')

                const currentText = latestAssistant?.content ?? activeQuestion

                return (
                  <span>
                    {isSpeaking ? <Typewriter text={currentText} active={true} /> : currentText}
                  </span>
                )
              })()}
            </h2>

            {/* Quick replay button if they missed the voice */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => speakText(activeQuestion)}
                disabled={isSpeaking || isAwaitingAI}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Volume2 className="h-4 w-4" />
                <span>Repeat question</span>
              </button>
            </div>
          </Card>

          {/* Capturing Responses Area */}
          <Card className="p-6 border border-gray-200 dark:border-gray-700 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">
                {isVoiceMode ? 'Voice Capture' : 'Your Answer'}
              </h3>
              <Badge
                label={aiState === 'listening' ? 'Listening' : aiState === 'thinking' ? 'Emma is thinking' : 'Awaiting prompt'}
                variant={aiState === 'listening' ? 'success' : aiState === 'thinking' ? 'warning' : 'default'}
              />
            </div>

            {isVoiceMode ? (
              <div className="space-y-4">
                {!speechSupported && (
                  <Card className="border border-yellow-200 bg-yellow-50/60 p-3 dark:border-yellow-900/50 dark:bg-yellow-950/20">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600" />
                      Voice input is not supported in this browser. Chrome works best for speech recognition. Try switching to Text Mode.
                    </p>
                  </Card>
                )}

                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={!canUseMic && !isListening}
                      className={cn(
                        'rounded-full p-6 text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30 shadow-lg',
                        isListening
                          ? 'bg-danger hover:bg-rose-600 animate-pulse scale-105 shadow-danger/20'
                          : 'bg-primary hover:bg-indigo-600 shadow-primary/20 hover:scale-[1.05]',
                      )}
                      aria-label={isListening ? 'Stop recording and submit' : 'Start microphone'}
                    >
                      {isListening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Force-submit even if silence detection didn't fire
                        void commitDraft(false)
                      }}
                      disabled={!isListening || isSpeaking || isAwaitingAI}
                      className={cn(
                        'rounded-full px-4 py-3 text-white text-xs font-bold transition shadow-lg',
                        !isListening || isSpeaking || isAwaitingAI
                          ? 'bg-gray-400 cursor-not-allowed opacity-70'
                          : 'bg-success hover:bg-emerald-600'
                      )}
                      aria-label="Submit answer"
                    >
                      Submit
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center max-w-sm leading-relaxed">
                    {isListening 
                      ? 'Speaking... Silence detection will submit automatically, or click button to finish.' 
                      : isSpeaking 
                        ? 'Wait until Emma finishes speaking...' 
                        : 'Click the microphone button to start recording your response.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={currentDraft}
                  onChange={(event) => handleTextChange(event.target.value)}
                  disabled={isSpeaking || isAwaitingAI}
                  placeholder="Type your response here..."
                  className="w-full min-h-32 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-650 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50"
                />
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Press the submit button when finished.</span>
                  <span>{currentDraft.length} characters</span>
                </div>

                <div className="flex justify-end mt-2">
                  <Button
                    type="button"
                    disabled={!currentDraft.trim() || isSpeaking || isAwaitingAI}
                    onClick={() => commitDraft(false)}
                    className="font-semibold px-5"
                  >
                    Submit Answer
                  </Button>
                </div>
              </div>
            )}

            {/* Live Transcript Stream */}
            <div className="mt-5 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                Live Transcript Feed
              </label>
              <div className="min-h-16 w-full rounded-xl border border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950 p-3 text-xs text-gray-600 dark:text-gray-300 italic max-h-24 overflow-y-auto">
                {liveTranscript || 'Transcript will render here in real-time as you speak...'}
              </div>
            </div>
          </Card>

          {/* History Panel togglable */}
          {showHistory && (
            <Card className="p-5 border border-gray-200 dark:border-gray-700 animate-fadeIn">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Conversation Log
              </h3>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {messages.map((message) => {
                  const isCandidate = message.speaker === 'candidate'
                  const isAssistant = message.speaker === 'assistant'

                  return (
                    <div key={message.id} className={cn('flex', isCandidate ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm',
                          isCandidate
                            ? 'bg-primary text-white'
                            : isAssistant
                              ? 'border border-indigo-50 bg-white text-gray-950 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-150'
                              : 'bg-transparent text-gray-400',
                        )}
                      >
                        <div className="mb-0.5 font-bold opacity-60 text-[9px] uppercase tracking-wider">
                          {isCandidate ? 'You' : isAssistant ? 'Emma' : 'System'}
                        </div>
                        <p>{message.content}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Footer Reset controls */}
      <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
        <span>Silence detection commits voice turns automatically.</span>
        <button
          type="button"
          onClick={resetSession}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 transition"
        >
          <RotateCcw className="h-3 w-3" />
          Reset session config
        </button>
      </div>
    </div>
  )
}
