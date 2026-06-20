import axios from 'axios'

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data && typeof error.response.data === 'object'
      ? (error.response.data as { message?: string }).message
      : undefined

    return message || error.message || fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
