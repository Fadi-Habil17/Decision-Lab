import type { DecisionListItem } from '../decisions/models'

export const decisionFixtures: readonly DecisionListItem[] = [
  {
    id: 1,
    ownerId: 1,
    title: 'Which laptop should I buy?',
    status: 'Draft',
    updatedAt: '2026-10-24T14:30:00Z',
    winnerNames: [],
  },
  {
    id: 2,
    ownerId: 1,
    title: 'Where should I live?',
    status: 'Finalized',
    updatedAt: '2026-10-23T10:00:00Z',
    winnerNames: ['Lisbon', 'Valencia'],
  },
  {
    id: 3,
    ownerId: 2,
    title: 'Next team project',
    status: 'Draft',
    updatedAt: '2026-10-22T16:45:00Z',
    winnerNames: [],
  },
  {
    id: 4,
    ownerId: 2,
    title: 'Laptop for design work',
    status: 'Finalized',
    updatedAt: '2026-10-21T09:15:00Z',
    winnerNames: ['Framework 13'],
  },
]
