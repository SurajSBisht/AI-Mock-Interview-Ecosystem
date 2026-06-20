export type VoiceGender = 'female' | 'male'

const FEMALE_HINTS = [
  'female',
  'samantha',
  'susan',
  'zira',
  'aria',
  'jenny',
  'jessa',
  'karen',
  'lucy',
  'nicole',
  'victoria',
  'helena',
  'tessa',
]

const MALE_HINTS = [
  'male',
  'david',
  'mark',
  'george',
  'daniel',
  'jon',
  'alex',
  'james',
  'ryan',
  'brian',
  'peter',
  'neil',
]

const NATURAL_HINTS = ['natural', 'enhanced', 'neural', 'premium', 'studio', 'google', 'microsoft']

function lower(value: string) {
  return value.toLowerCase()
}

function hasAny(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword))
}

function scoreVoice(voice: SpeechSynthesisVoice, gender: VoiceGender) {
  const name = lower(voice.name)
  const lang = lower(voice.lang)
  let score = 0

  // Prefer voices that look and sound like the requested gender while still
  // favoring natural-sounding browser voices over generic defaults.
  if (gender === 'female') {
    if (hasAny(name, FEMALE_HINTS)) score += 18
    if (hasAny(name, MALE_HINTS)) score -= 10
  } else {
    if (hasAny(name, MALE_HINTS)) score += 18
    if (hasAny(name, FEMALE_HINTS)) score -= 10
  }

  if (lang.startsWith('en')) {
    score += 10
  }

  if (voice.localService) {
    score += 2
  }

  if (hasAny(name, NATURAL_HINTS)) {
    score += 8
  }

  if (voice.default) {
    score += 4
  }

  return score
}

// Pick the best matching browser voice for the requested gender and fall back
// to the closest available option if a perfect match is not present.
export function resolveVoiceForGender(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
) {
  if (!voices.length) {
    return null
  }

  let bestVoice: SpeechSynthesisVoice | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const voice of voices) {
    const score = scoreVoice(voice, gender)

    if (score > bestScore) {
      bestScore = score
      bestVoice = voice
    }
  }

  return bestVoice ?? voices[0] ?? null
}
