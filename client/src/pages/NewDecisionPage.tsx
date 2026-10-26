import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import ErrorState from '../components/ui/ErrorState'
import LoadingState from '../components/ui/LoadingState'
import TextInput from '../components/ui/TextInput'
import { decisionApi, type DecisionTemplate } from '../decisions/api'
import '../styles/new-decision.css'

function NewDecisionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedTemplateId = searchParams.get('templateId') ?? ''
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [templateId, setTemplateId] = useState(requestedTemplateId)
  const [templates, setTemplates] = useState<DecisionTemplate[]>([])
  const [attempt, setAttempt] = useState(0)
  const [templateState, setTemplateState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = templates.find(
    (template) => template.id === Number(templateId),
  )

  useEffect(() => {
    const controller = new AbortController()
    decisionApi
      .getTemplates(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return
        setTemplates(items)
        setTemplateState('ready')
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Templates could not be loaded.',
        )
        setTemplateState('error')
      })
    return () => controller.abort()
  }, [attempt])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!title.trim()) {
      setError('Enter a title for this decision.')
      return
    }
    if (templateId && !selected) {
      setError('The selected template is no longer available. Choose another.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const decision = await decisionApi.createDecision({
        title: title.trim(),
        description: description.trim() || undefined,
        templateId: selected?.id,
      })
      navigate(`/decisions/${decision.id}`)
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'The decision could not be created. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="new-decision-page" aria-labelledby="new-decision-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Start here</p>
          <h1 id="new-decision-title">Create a decision</h1>
          <p className="page-description">
            Give your next choice a name, then choose a starting point.
          </p>
        </div>
        <Link className="button button--secondary" to="/templates">
          Browse templates
        </Link>
      </div>

      <form
        className="new-decision-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        aria-busy={busy}
      >
        <fieldset disabled={busy} className="new-decision-fields">
          <legend className="new-decision-legend">Decision details</legend>
          <TextInput
            label="Title"
            name="title"
            required
            value={title}
            placeholder="What would you like to decide?"
            onChange={(event) => {
              setTitle(event.target.value)
              setError('')
            }}
          />
          <div className="form-field">
            <label className="field-label" htmlFor="decision-description">
              Description <span className="field-hint">(optional)</span>
            </label>
            <textarea
              className="text-input"
              id="decision-description"
              name="description"
              rows={3}
              value={description}
              placeholder="Add context that will help you think it through."
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="field-label" htmlFor="decision-template">
              Start from a template <span className="field-hint">(optional)</span>
            </label>
            {templateState === 'loading' ? (
              <LoadingState message="Loading templates…" />
            ) : templateState === 'error' ? (
              <ErrorState
                title="Templates unavailable"
                message={error}
                onRetry={() => {
                  setTemplateState('loading')
                  setAttempt((current) => current + 1)
                }}
              />
            ) : (
              <select
                className="text-input"
                id="decision-template"
                name="template"
                value={templateId}
                onChange={(event) => {
                  setTemplateId(event.target.value)
                  setError('')
                }}
              >
                <option value="">Start blank</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {selected && (
            <section className="template-summary" aria-labelledby="template-summary-title">
              <h2 id="template-summary-title">{selected.name} criteria</h2>
              <p>{selected.description}</p>
              <ul>
                {selected.criteria.map((criterion) => (
                  <li key={criterion.id}>
                    <span>{criterion.name}</span>
                    <strong>{criterion.weight}%</strong>
                  </li>
                ))}
              </ul>
              <p className="template-weight-total">
                Total weight:{' '}
                {selected.criteria.reduce(
                  (total, criterion) => total + criterion.weight,
                  0,
                )}
                %
              </p>
              <p className="field-hint">
                The server copies these criteria into your new decision.
              </p>
            </section>
          )}
        </fieldset>
        {error && templateState !== 'error' && (
          <p className="auth-feedback auth-feedback--error" role="alert">
            {error}
          </p>
        )}
        <p className="creation-progress" role="status">
          {busy ? 'Creating decision…' : ''}
        </p>
        <div className="new-decision-actions">
          <Link className="button button--secondary" to="/decisions">
            Cancel
          </Link>
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create decision'}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default NewDecisionPage
