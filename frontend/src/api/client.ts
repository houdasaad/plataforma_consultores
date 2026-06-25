import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

function getAccess() {
  return localStorage.getItem('access')
}
function getRefresh() {
  return localStorage.getItem('refresh')
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem('access', access)
  localStorage.setItem('refresh', refresh)
}
export function clearTokens() {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
}

api.interceptors.request.use((config) => {
  const access = getAccess()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  // Let the browser set multipart boundary (default json Content-Type breaks file uploads).
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefresh()
  if (!refresh) throw new Error('No refresh token')
  const { data } = await axios.post(`${baseURL}/auth/token/refresh/`, { refresh })
  const access = data.access as string
  localStorage.setItem('access', access)
  if (data.refresh) {
    localStorage.setItem('refresh', data.refresh as string)
  }
  return access
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined
    if (!original) throw error
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }
        await refreshPromise
        const access = getAccess()
        if (access) {
          original.headers.Authorization = `Bearer ${access}`
        }
        return api(original)
      } catch {
        clearTokens()
      }
    }
    throw error
  },
)
