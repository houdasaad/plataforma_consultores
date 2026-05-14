import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, clearTokens, setTokens } from '../api/client'

export type Role = 'admin' | 'consultant' | 'candidate'

type UserInfo = {
  id: number
  email: string
  role: Role
  is_email_verified: boolean
}

type AuthContextValue = {
  user: UserInfo | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    const access = localStorage.getItem('access')
    if (!access) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get<UserInfo>('/auth/me/')
      setUser(data)
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/token/', { email, password })
    setTokens(data.access, data.refresh)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshMe }),
    [user, loading, login, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
