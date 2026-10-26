import { apiBaseUrl, DecisionApiError } from '../decisions/api'
export interface User {
  id: number
  name: string
  email: string
  role: string
}
export async function authRequest<T>(
  path: string,
  body?: object,
  token?: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/auth/${path}`, {
    method: body ? 'POST' : 'GET',
    signal,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => {
    throw new Error(
      'The server is unavailable or returned an invalid response. Please retry.',
    )
  })
  if (!response.ok)
    throw new DecisionApiError(
      response.status,
      Array.isArray(data.message)
        ? data.message.join(' ')
        : data.message || 'Request failed.',
    )
  return data as T
}
export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    [...value].some((char) => char.charCodeAt(0) <= 32)
  )
    return '/decisions'
  try {
    const url = new URL(value, window.location.origin)
    if (
      url.origin !== window.location.origin ||
      !/^\/(decisions|templates)(\/|$)/.test(url.pathname)
    )
      return '/decisions'
    return url.pathname + url.search + url.hash
  } catch {
    return '/decisions'
  }
}
