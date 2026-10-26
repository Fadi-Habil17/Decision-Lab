import { createContext, useContext } from 'react'
import type { User } from './api'
interface Session {
  user: User | null
  loading: boolean
  restoreError: string
  retry: () => void
  login: (email: string, password: string, signal: AbortSignal) => Promise<void>
  logout: () => void
}
export const Context = createContext<Session | null>(null)
export function useAuth() {
  const value = useContext(Context)
  if (!value) throw new Error('AuthProvider missing')
  return value
}
