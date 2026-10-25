import { createContext, useContext, useSyncExternalStore } from 'react'
import type { createLocalDecisionService } from './localDecisionService'

export const DecisionStoreContext = createContext<ReturnType<
  typeof createLocalDecisionService
> | null>(null)

export function useLocalDecisions() {
  const service = useContext(DecisionStoreContext)
  if (!service)
    throw new Error('useLocalDecisions requires DecisionStoreProvider.')
  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot)
  return {
    ...snapshot,
    remove: service.remove,
    add: service.add,
    retry: service.retry,
    setScenario: service.setScenario,
    setCreationScenario: service.setCreationScenario,
    setTemplateScenario: service.setTemplateScenario,
    retryTemplates: service.retryTemplates,
  }
}
