import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { AuthPreviewScenario } from './authPreview'
import { demoUser } from './fixtures'
import { DemoSessionContext, type DemoUser } from './session'

function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null)
  const [formScenario, setFormScenario] = useState<AuthPreviewScenario>('success')

  const previewAsUser = useCallback(() => {
    if (import.meta.env.DEV) setUser({ ...demoUser })
  }, [])
  const logout = useCallback(() => setUser(null), [])
  const value = useMemo(
    () => ({ user, previewAsUser, logout, formScenario, setFormScenario }),
    [user, previewAsUser, logout, formScenario],
  )

  // Intentionally memory-only. Refreshing always starts a fresh guest preview.
  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>
}

export default DemoSessionProvider
