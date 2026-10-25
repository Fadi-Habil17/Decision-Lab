import { createContext, useContext } from 'react'
import type { AuthPreviewScenario } from './authPreview'

export interface DemoUser {
  id: number
  name: string
  email: string
  role: 'User' | 'Admin'
}

interface DemoSession {
  user: DemoUser | null
  previewAsUser: () => void
  logout: () => void
  formScenario: AuthPreviewScenario
  setFormScenario: (scenario: AuthPreviewScenario) => void
}

export const DemoSessionContext = createContext<DemoSession | null>(null)

export function useDemoSession() {
  const session = useContext(DemoSessionContext)
  if (!session) {
    throw new Error('useDemoSession requires DemoSessionProvider.')
  }
  return session
}
