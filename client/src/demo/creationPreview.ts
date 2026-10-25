import type { CreationScenario, TemplateScenario } from '../decisions/models'
import { templateFixtures } from './templateFixtures'

function waitForPreview(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
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
      resolve()
    }, milliseconds)
    signal.addEventListener('abort', abort, { once: true })
  })
}

export async function loadTemplatePreviews(
  scenario: TemplateScenario,
  signal: AbortSignal,
) {
  await waitForPreview(400, signal)
  if (import.meta.env.DEV && scenario === 'error')
    throw new Error('Template preview unavailable.')
  return templateFixtures.map((template) => ({
    ...template,
    criteria: template.criteria.map((criterion) => ({ ...criterion })),
  }))
}

export async function simulateDecisionCreation(
  scenario: CreationScenario,
  signal: AbortSignal,
) {
  await waitForPreview(
    import.meta.env.DEV && scenario === 'slow' ? 5000 : 700,
    signal,
  )
  if (import.meta.env.DEV && scenario === 'error')
    throw new Error('Creation preview unavailable.')
}
