import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export const authApi = axios.create({
  baseURL,
})

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const requestUrl = String(error.config?.url ?? '')

    if (
      status === 401 &&
      !requestUrl.includes('/auth/login') &&
      !requestUrl.includes('/auth/register') &&
      !requestUrl.includes('/auth/verify-otp') &&
      !requestUrl.includes('/auth/resend-otp')
    ) {
      localStorage.removeItem('auth_token')
      window.dispatchEvent(new Event('auth:logout'))
    }

    return Promise.reject(error)
  },
)
