export type DecisionStatus = 'Draft' | 'Finalized'

export interface DecisionOption {
  id: number
  name: string
}

export interface DecisionCriterion {
  id: number
  name: string
  weight: number
}

export interface DecisionScore {
  optionId: number
  criterionId: number
  score: number
}

export interface DecisionRecord {
  id: number
  title: string
  description?: string
  status: DecisionStatus
  templateId?: number
  options: DecisionOption[]
  criteria: DecisionCriterion[]
  scores: DecisionScore[]
  createdAt: string
  updatedAt: string
  finalizedAt?: string
  winnerNames: string[]
  ownerId?: number
  ownerName?: string
}

export interface DecisionSummary {
  id: number
  title: string
  status: DecisionStatus
  updatedAt: string
  winnerNames: string[]
  ownerId?: number
  ownerName?: string
}

export interface DecisionTemplate {
  id: number
  name: string
  description: string
  criteria: DecisionCriterion[]
}

export interface CriterionContribution {
  criterionId: number
  criterionName: string
  weight: number
  score: number
  points: number
}

export interface RankedOption {
  optionId: number
  optionName: string
  rank: number
  exactTotal: number
  displayTotal: string
  isTied: boolean
  contributions: CriterionContribution[]
  strongestCriterion: CriterionContribution
  weakestCriterion: CriterionContribution
  gapToAbove: number
}

export interface DecisionResult {
  decisionId: number
  title: string
  status: DecisionStatus
  ranked: RankedOption[]
  winners: string[]
}

export interface MissingScorePair {
  optionId: number
  optionName: string
  criterionId: number
  criterionName: string
}

export interface DecisionUpdate {
  title: string
  description?: string
}

export interface DecisionCreate {
  title: string
  description?: string
  templateId?: number
}

interface ApiErrorPayload {
  statusCode?: number
  message?: string | string[]
  errors?: string[]
  missingScores?: MissingScorePair[]
}

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? '/api'
).replace(/\/$/, '')
let accessToken: string | null = null

export function setDecisionApiAccessToken(token: string | null) {
  accessToken = token
}

function readApiErrorPayload(value: unknown): ApiErrorPayload | undefined {
  if (typeof value !== 'object' || value === null) return undefined

  const payload = value as Record<string, unknown>
  const messages = Array.isArray(payload.message)
    ? payload.message.filter((item): item is string => typeof item === 'string')
    : typeof payload.message === 'string'
      ? payload.message
      : undefined
  const errors = Array.isArray(payload.errors)
    ? payload.errors.filter((item): item is string => typeof item === 'string')
    : undefined
  const missingScores = Array.isArray(payload.missingScores)
    ? (payload.missingScores as MissingScorePair[])
    : undefined

  return {
    statusCode:
      typeof payload.statusCode === 'number' ? payload.statusCode : undefined,
    message: messages,
    errors,
    missingScores,
  }
}

function messageFor(status: number, payload?: ApiErrorPayload): string {
  if (status === 401) return 'Your session is missing or expired. Sign in and try again.'
  if (status === 403) return 'You do not have permission to change this decision.'
  if (status === 404) return 'The requested API route or decision was not found.'
  if (typeof payload?.message === 'string') return payload.message
  if (Array.isArray(payload?.message)) return payload.message.join(' ')
  return `The request failed with status ${status}. Please try again.`
}

export class DecisionApiError extends Error {
  readonly status: number
  readonly errors: string[]
  readonly missingScores: MissingScorePair[]

  constructor(
    status: number,
    message: string,
    errors: string[] = [],
    missingScores: MissingScorePair[] = [],
  ) {
    super(message)
    this.name = 'DecisionApiError'
    this.status = status
    this.errors = errors
    this.missingScores = missingScores
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new Error(
      `Could not reach the DecisionLab API at ${apiBaseUrl}. Start the backend or configure VITE_API_BASE_URL.`,
    )
  }
  const text = await response.text()
  let body: unknown

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      if (response.ok) {
        throw new Error('The server returned an invalid JSON response.')
      }
      body = undefined
    }
  }

  if (!response.ok) {
    const payload = readApiErrorPayload(body)
    throw new DecisionApiError(
      response.status,
      messageFor(response.status, payload),
      payload?.errors ?? [],
      payload?.missingScores ?? [],
    )
  }

  if (response.status === 204) return undefined as T
  return body as T
}

export const decisionApi = {
  getDecisions(signal?: AbortSignal) {
    return request<DecisionSummary[]>('/decisions', { signal })
  },
  getDecision(id: number, signal?: AbortSignal) {
    return request<DecisionRecord>(`/decisions/${id}`, { signal })
  },
  updateDecision(id: number, input: DecisionUpdate) {
    return request<DecisionRecord>(`/decisions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
  addOption(id: number, name: string) {
    return request<DecisionRecord>(`/decisions/${id}/options`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },
  renameOption(id: number, optionId: number, name: string) {
    return request<DecisionRecord>(`/decisions/${id}/options/${optionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
  },
  removeOption(id: number, optionId: number) {
    return request<DecisionRecord>(`/decisions/${id}/options/${optionId}`, {
      method: 'DELETE',
    })
  },
  addCriterion(id: number, name: string, weight: number) {
    return request<DecisionRecord>(`/decisions/${id}/criteria`, {
      method: 'POST',
      body: JSON.stringify({ name, weight }),
    })
  },
  updateCriterion(
    id: number,
    criterionId: number,
    input: { name?: string; weight?: number },
  ) {
    return request<DecisionRecord>(`/decisions/${id}/criteria/${criterionId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
  removeCriterion(id: number, criterionId: number) {
    return request<DecisionRecord>(`/decisions/${id}/criteria/${criterionId}`, {
      method: 'DELETE',
    })
  },
  upsertScore(id: number, input: DecisionScore) {
    return request<DecisionRecord>(`/decisions/${id}/scores`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },
  removeScore(id: number, optionId: number, criterionId: number) {
    return request<DecisionRecord>(
      `/decisions/${id}/scores/${optionId}/${criterionId}`,
      { method: 'DELETE' },
    )
  },
  createDecision(input: DecisionCreate) {
    return request<DecisionRecord>('/decisions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  calculate(id: number) {
    return request<DecisionResult>(`/decisions/${id}/calculate`, {
      method: 'POST',
    })
  },
  finalize(id: number) {
    return request<DecisionRecord>(`/decisions/${id}/finalize`, {
      method: 'POST',
    })
  },
  reopen(id: number) {
    return request<DecisionRecord>(`/decisions/${id}/reopen`, {
      method: 'POST',
    })
  },
  deleteDecision(id: number) {
    return request<void>(`/decisions/${id}`, { method: 'DELETE' })
  },
  getTemplates(signal?: AbortSignal) {
    return request<DecisionTemplate[]>('/templates', { signal })
  },
}
