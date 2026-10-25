import { useState, type ReactNode } from 'react'
import { createLocalDecisionService } from './localDecisionService'
import { DecisionStoreContext } from './store'

function DecisionStoreProvider({ children }: { children: ReactNode }) {
  const [service] = useState(createLocalDecisionService)
  return (
    <DecisionStoreContext.Provider value={service}>
      {children}
    </DecisionStoreContext.Provider>
  )
}

export default DecisionStoreProvider
