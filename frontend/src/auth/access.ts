import type { Role, UserInfo } from './AuthContext'

export function userCanAccess(user: UserInfo | null | undefined, role: Role): boolean {
  if (!user) return false
  if (user.demo_capabilities?.includes(role)) return true
  return user.role === role
}

export function isUniversalDemo(user: UserInfo | null | undefined): boolean {
  return Boolean(user?.is_demo_universal)
}
