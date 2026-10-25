import { decisionFixtures } from '../demo/decisionFixtures'
import type {
  DecisionListItem,
  DecisionListScenario,
  NewLocalDecision,
} from './models'

export function createLocalDecisionService() {
  let snapshot: {
    items: readonly DecisionListItem[]
    scenario: DecisionListScenario
  } = {
    items: decisionFixtures.map((item) => ({
      ...item,
      winnerNames: [...item.winnerNames],
    })),
    scenario: 'ready',
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
    // Stage 3 can use this method without introducing another data store.
    add(input: NewLocalDecision) {
      if (
        !input.title.trim() ||
        !Number.isSafeInteger(input.ownerId) ||
        input.ownerId <= 0
      ) {
        throw new Error('A title and a valid demo owner are required.')
      }
      const item: DecisionListItem = {
        id: nextId++,
        ownerId: input.ownerId,
        title: input.title.trim(),
        description: input.description?.trim(),
        status: 'Draft',
        updatedAt: new Date().toISOString(),
        winnerNames: [],
      }
      publish({ ...snapshot, items: [item, ...snapshot.items] })
      return item
    },
    setScenario(scenario: DecisionListScenario) {
      if (import.meta.env.DEV) publish({ ...snapshot, scenario })
    },
    retry() {
      publish({ ...snapshot, scenario: 'ready' })
    },
  }
}
