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
  description?: string
  templateId?: number
}

export interface LocalCriterion {
  readonly id: number
  readonly name: string
  readonly weight: number
}

export interface LocalTemplate {
  readonly id: number
  readonly name: string
  readonly description: string
  readonly criteria: readonly LocalCriterion[]
}

export interface LocalDecision extends DecisionListItem {
  readonly createdAt: string
  readonly templateId?: number
  readonly criteria: readonly LocalCriterion[]
}

export type CreationScenario = 'success' | 'error' | 'slow'
export type TemplateScenario = 'success' | 'error'

export type DecisionListScenario = 'ready' | 'loading' | 'error' | 'empty'
