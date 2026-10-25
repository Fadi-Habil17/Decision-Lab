import { decisionFixtures } from '../demo/decisionFixtures'
import { templateFixtures } from '../demo/templateFixtures'
import type {
  LocalDecision,
  CreationScenario,
  TemplateScenario,
  DecisionListScenario,
  NewLocalDecision,
} from './models'

export function createLocalDecisionService() {
  let snapshot: {
    items: readonly LocalDecision[]
    scenario: DecisionListScenario
    creationScenario: CreationScenario
    templateScenario: TemplateScenario
  } = {
    items: decisionFixtures.map((item) => ({
      ...item,
      winnerNames: [...item.winnerNames],
      createdAt: item.updatedAt,
      criteria: [],
    })),
    scenario: 'ready',
    creationScenario: 'success',
    templateScenario: 'success',
  }
  let nextId = Math.max(0, ...snapshot.items.map((item) => item.id)) + 1
  const listeners = new Set<() => void>()
  function publish(next: typeof snapshot) {
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    remove(id: number, userId: number | null) {
      const item = snapshot.items.find((entry) => entry.id === id)
      if (!item || userId === null || item.ownerId !== userId) return false
      publish({
        ...snapshot,
        items: snapshot.items.filter((entry) => entry.id !== id),
      })
      return true
    },
    // The form passes the active demo identity separately from its input values.
    add(input: NewLocalDecision, currentUserId: number) {
      if (
        !input.title.trim() ||
        !Number.isSafeInteger(currentUserId) ||
        currentUserId <= 0
      ) {
        throw new Error('A title and a valid demo owner are required.')
      }
      const template = templateFixtures.find(
        (entry) => entry.id === input.templateId,
      )
      if (input.templateId !== undefined && !template)
        throw new Error('Choose a valid template.')
      const now = new Date().toISOString()
      const item: LocalDecision = {
        id: nextId++,
        ownerId: currentUserId,
        title: input.title.trim(),
        description: input.description?.trim(),
        status: 'Draft',
        createdAt: now,
        updatedAt: now,
        templateId: template?.id,
        criteria:
          template?.criteria.map((criterion) => ({ ...criterion })) ?? [],
        winnerNames: [],
      }
      publish({
        ...snapshot,
        scenario: 'ready',
        items: [item, ...snapshot.items],
      })
      return item
    },
    setScenario(scenario: DecisionListScenario) {
      if (import.meta.env.DEV) publish({ ...snapshot, scenario })
    },
    retry() {
      publish({ ...snapshot, scenario: 'ready' })
    },
    setCreationScenario(creationScenario: CreationScenario) {
      if (import.meta.env.DEV) publish({ ...snapshot, creationScenario })
    },
    setTemplateScenario(templateScenario: TemplateScenario) {
      if (import.meta.env.DEV) publish({ ...snapshot, templateScenario })
    },
    retryTemplates() {
      publish({ ...snapshot, templateScenario: 'success' })
    },
  }
}
