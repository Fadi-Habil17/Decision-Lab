import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Context } from './session'
import { authRequest, safeReturnTo, type User } from './api'
import {
  DecisionApiError,
  setDecisionApiAccessToken,
  setUnauthorizedHandler,
} from '../decisions/api'
const key = 'decisionlab.accessToken'
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(key)),
  )
  const [restoreError, setRestoreError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const generation = useRef(0)
  const navigate = useNavigate()
  const location = useLocation()
  function logout() {
    generation.current++
    localStorage.removeItem(key)
    setDecisionApiAccessToken(null)
    setUser(null)
    setLoading(false)
    setRestoreError('')
  }
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      navigate('/login', {
        replace: true,
        state: {
          returnTo: safeReturnTo(location.pathname + location.search),
          sessionExpired: true,
        },
      })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate, location.pathname, location.search])
  useEffect(() => {
    const version = ++generation.current
    const controller = new AbortController()
    const token = localStorage.getItem(key)
    if (!token) return
    setDecisionApiAccessToken(token)
    authRequest<{ user: User }>('me', undefined, token, controller.signal)
      .then((result) => {
        if (version === generation.current) setUser(result.user)
      })
      .catch((error) => {
        if (controller.signal.aborted || version !== generation.current) return
        if (error instanceof DecisionApiError && error.status === 401) logout()
        else
          setRestoreError(
            'Could not restore your session. Check your connection and retry.',
          )
      })
      .finally(() => {
        if (version === generation.current) setLoading(false)
      })
    return () => controller.abort()
  }, [attempt])
  async function login(email: string, password: string, signal: AbortSignal) {
    const version = ++generation.current
    const result = await authRequest<{ accessToken: string; user: User }>(
      'login',
      { email, password },
      undefined,
      signal,
    )
    if (signal.aborted || version !== generation.current)
      throw new DOMException('Cancelled', 'AbortError')
    localStorage.setItem(key, result.accessToken)
    setDecisionApiAccessToken(result.accessToken)
    setUser(result.user)
    setLoading(false)
    setRestoreError('')
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        restoreError,
        retry: () => {
          setLoading(true)
          setRestoreError('')
          setAttempt((v) => v + 1)
        },
        login,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  )
}
