export type AuthPreviewScenario = 'success' | 'error' | 'slow'

// No credentials are accepted here: this simulates feedback, not authentication.
export function simulateAuthPreview(
  requestedScenario: AuthPreviewScenario,
  signal: AbortSignal,
): Promise<void> {
  const scenario = import.meta.env.DEV ? requestedScenario : 'success'

  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Preview cancelled.', 'AbortError'))
      return
    }

    const abort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Preview cancelled.', 'AbortError'))
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort)
      if (scenario === 'error') {
        reject(new Error('This is a simulated error. Please try again.'))
      } else {
        resolve()
      }
    }, scenario === 'slow' ? 5000 : 700)

    signal.addEventListener('abort', abort, { once: true })
  })
}
