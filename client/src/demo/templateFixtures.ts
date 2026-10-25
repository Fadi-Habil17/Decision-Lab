import type { LocalTemplate } from '../decisions/models'

// Preview data only. These fields are not an agreed API contract.
export const templateFixtures: readonly LocalTemplate[] = [
  {
    id: 1,
    name: 'Laptop',
    description:
      'Find the right balance of performance, price and portability.',
    criteria: [
      { id: 1, name: 'Performance', weight: 30 },
      { id: 2, name: 'Battery', weight: 25 },
      { id: 3, name: 'Price', weight: 20 },
      { id: 4, name: 'Portability', weight: 15 },
      { id: 5, name: 'Display', weight: 10 },
    ],
  },
  {
    id: 2,
    name: 'City',
    description: 'Compare places to live around the things you value.',
    criteria: [
      { id: 1, name: 'Cost of living', weight: 35 },
      { id: 2, name: 'Work opportunities', weight: 30 },
      { id: 3, name: 'Community', weight: 20 },
      { id: 4, name: 'Transport', weight: 15 },
    ],
  },
  {
    id: 3,
    name: 'Project Idea',
    description: 'Choose a project that fits your goals and available time.',
    criteria: [
      { id: 1, name: 'Impact', weight: 40 },
      { id: 2, name: 'Feasibility', weight: 30 },
      { id: 3, name: 'Learning value', weight: 20 },
      { id: 4, name: 'Interest', weight: 10 },
    ],
  },
]
