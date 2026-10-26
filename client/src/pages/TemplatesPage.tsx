import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../components/ui/ErrorState'
import LoadingState from '../components/ui/LoadingState'
import { decisionApi, type DecisionTemplate } from '../decisions/api'
import { useAuth } from '../auth/session'
import '../styles/templates.css'

type TemplateState =
  | { kind: 'loading' }
  | { kind: 'ready'; templates: DecisionTemplate[] }
  | { kind: 'error'; message: string }

function TemplatesPage() {
  const { user } = useAuth()
  const [state, setState] = useState<TemplateState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    decisionApi
      .getTemplates(controller.signal)
      .then((templates) => {
        if (!controller.signal.aborted) {
          setState({ kind: 'ready', templates })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            kind: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Templates could not be loaded.',
          })
        }
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="templates-page" aria-labelledby="templates-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Start with a proven framework</p>
          <h1 id="templates-title">Decision templates</h1>
          <p className="page-description">
            Browse ready-made criteria and weights, then tailor a copy to your
            decision.
          </p>
        </div>
      </div>

      {state.kind === 'loading' ? (
        <LoadingState message="Loading templates…" />
      ) : state.kind === 'error' ? (
        <ErrorState
          title="Templates unavailable"
          message={state.message}
          onRetry={() => {
            setState({ kind: 'loading' })
            decisionApi
              .getTemplates()
              .then((templates) => setState({ kind: 'ready', templates }))
              .catch((error: unknown) =>
                setState({
                  kind: 'error',
                  message:
                    error instanceof Error
                      ? error.message
                      : 'Templates could not be loaded.',
                }),
              )
          }}
        />
      ) : state.templates.length === 0 ? (
        <div className="templates-empty">
          <span aria-hidden="true">✳</span>
          <h2>No templates yet</h2>
          <p>When the team publishes templates, they will be available here.</p>
        </div>
      ) : (
        <div className="template-grid">
          {state.templates.map((template, index) => (
            <article className="template-card" key={template.id}>
              <div className="template-card-top">
                <span className="template-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{template.criteria.length} criteria</span>
              </div>
              <h2>{template.name}</h2>
              <p>{template.description}</p>
              <ul className="template-criteria">
                {template.criteria.map((criterion) => (
                  <li key={criterion.id}>
                    <span>{criterion.name}</span>
                    <strong>{criterion.weight}%</strong>
                  </li>
                ))}
              </ul>
              <div className="template-card-footer">
                <span>
                  Total weight{' '}
                  <strong>
                    {template.criteria.reduce(
                      (sum, criterion) => sum + criterion.weight,
                      0,
                    )}
                    %
                  </strong>
                </span>
                <Link
                  className="button button--primary"
                  to={
                    user
                      ? `/decisions/new?templateId=${template.id}`
                      : '/login'
                  }
                  state={
                    user
                      ? undefined
                      : {
                          returnTo: `/decisions/new?templateId=${template.id}`,
                        }
                  }
                >
                  Use this template
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default TemplatesPage
