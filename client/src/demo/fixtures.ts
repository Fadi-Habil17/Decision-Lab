import type { DemoUser } from './session'

export const demoUser: Readonly<DemoUser> = Object.freeze({
  id: 1,
  name: 'Hamid Al Haj',
  email: 'hamid@example.test',
  role: 'User',
})
