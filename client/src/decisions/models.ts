import type { DecisionStatus } from '../types'

// Local presentation models, not backend response DTOs.
export interface DecisionListItem {
  readonly id: number
  readonly ownerId: number
  readonly title: string
  readonly description?: string
  readonly status: DecisionStatus
  readonly updatedAt: string
  readonly winnerNames: readonly string[]
}

export interface NewLocalDecision {
  title: string
  ownerId: number
  description?: string
}

export type DecisionListScenario = 'ready' | 'loading' | 'error' | 'empty'
