import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import ErrorState from '../components/ui/ErrorState'
import LoadingState from '../components/ui/LoadingState'
import TextInput from '../components/ui/TextInput'
import type { LocalTemplate } from '../decisions/models'
import { useLocalDecisions } from '../decisions/store'
import {
  loadTemplatePreviews,
  simulateDecisionCreation,
} from '../demo/creationPreview'
import { useDemoSession } from '../demo/session'
import '../styles/new-decision.css'

function NewDecisionPage() {
  const { user } = useDemoSession()
  const {
    add,
    creationScenario,
    templateScenario,
    retryTemplates,
    setCreationScenario,
  } = useLocalDecisions()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'blank' | 'template'>('blank')
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [templateState, setTemplateState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [attempt, setAttempt] = useState(0)
  const [errors, setErrors] = useState<{ title?: string; template?: string }>(
    {},
  )
  const [generalError, setGeneralError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef<AbortController | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const selected =
    mode === 'template'
      ? templates.find((item) => item.id === Number(templateId))
      : undefined

  useEffect(() => {
    if (mode !== 'template') return
    const controller = new AbortController()
    loadTemplatePreviews(templateScenario, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return
        setTemplates(items)
        setTemplateState('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setTemplateState('error')
      })
    return () => controller.abort()
  }, [mode, templateScenario, attempt])

  useEffect(
    () => () => {
      pending.current?.abort()
    },
    [],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || !user) return
    const nextErrors = {
      title: title.trim() ? undefined : 'Enter a decision title.',
      template:
        mode === 'template' && (!selected || templateState !== 'ready')
          ? 'Choose an available template.'
          : undefined,
    }
    setErrors(nextErrors)
    setGeneralError('')
    if (nextErrors.title || nextErrors.template) {
      const input = formRef.current?.elements.namedItem(
        nextErrors.title ? 'title' : 'template',
      )
      if (input instanceof HTMLElement) input.focus()
      return
    }
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    try {
      await simulateDecisionCreation(creationScenario, controller.signal)
      if (controller.signal.aborted) return
      const created = add(
        { title, description, templateId: selected?.id },
        user.id,
      )
      navigate(`/decisions/${created.id}`)
    } catch {
      if (!controller.signal.aborted) {
        setGeneralError(
          'Could not create the demo decision. Please try again. Your inputs have been kept.',
        )
        if (creationScenario === 'error') setCreationScenario('success')
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false)
      if (pending.current === controller) pending.current = null
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
        <Link className="button button--secondary" to="/decisions">
          Back to decisions
        </Link>
      </div>
      <p className="decisions-preview-note">
        Demo only · Your decision stays in this tab until you refresh.
      </p>
      <form
        className="new-decision-form"
        ref={formRef}
        onSubmit={submit}
        noValidate
        aria-busy={busy}
        aria-labelledby="new-decision-title"
      >
        <fieldset disabled={busy} className="new-decision-fields">
          <legend className="new-decision-legend">Decision details</legend>
          <TextInput
            label="Title"
            name="title"
            required
            value={title}
            error={errors.title}
            placeholder="What would you like to decide?"
            onChange={(event) => {
              setTitle(event.target.value)
              setErrors((old) => ({ ...old, title: undefined }))
              setGeneralError('')
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
              placeholder="Add any context that will help you think it through."
              onChange={(event) => {
                setDescription(event.target.value)
                setGeneralError('')
              }}
            />
          </div>
          <fieldset className="decision-start-mode">
            <legend className="field-label">
              How would you like to start?
            </legend>
            <div className="decision-mode-options">
              {(['blank', 'template'] as const).map((value) => (
                <label
                  key={value}
                  className={`decision-mode-option${mode === value ? ' is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="start-mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => {
                      setMode(value)
                      setTemplateState('loading')
                      setTemplateId('')
                      setErrors((old) => ({ ...old, template: undefined }))
                      setGeneralError('')
                    }}
                  />
                  <span>
                    <strong>
                      {value === 'blank' ? 'Blank decision' : 'Use a template'}
                    </strong>
                    <span>
                      {value === 'blank'
                        ? 'Start with an empty set of criteria.'
                        : 'Copy a ready-made set of criteria and weights.'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {mode === 'template' &&
            (templateState === 'loading' ? (
              <LoadingState message="Loading templates…" />
            ) : templateState === 'error' ? (
              <ErrorState
                title="Templates unavailable"
                message="The template preview could not be loaded. Please try again."
                onRetry={() => {
                  setTemplateState('loading')
                  retryTemplates()
                  setAttempt((old) => old + 1)
                }}
              />
            ) : (
              <div className="form-field">
                <label className="field-label" htmlFor="decision-template">
                  Template
                </label>
                <select
                  className="text-input"
                  id="decision-template"
                  name="template"
                  value={templateId}
                  required
                  aria-invalid={Boolean(errors.template)}
                  aria-describedby={
                    errors.template ? 'template-error' : undefined
                  }
                  onChange={(event) => {
                    setTemplateId(event.target.value)
                    setErrors((old) => ({ ...old, template: undefined }))
                    setGeneralError('')
                  }}
                >
                  <option value="">Choose a template</option>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {errors.template && (
                  <p className="field-error" id="template-error" role="alert">
                    {errors.template}
                  </p>
                )}
              </div>
            ))}
          {selected && templateState === 'ready' && (
            <section
              className="template-summary"
              aria-labelledby="template-summary-title"
            >
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
                A separate copy of these criteria will belong to your decision.
              </p>
            </section>
          )}
        </fieldset>
        {generalError && (
          <p className="auth-feedback auth-feedback--error" role="alert">
            {generalError}
          </p>
        )}
        <p className="creation-progress" role="status">
          {busy ? 'Creating your demo decision…' : ''}
        </p>
        <div className="new-decision-actions">
          <Link className="button button--secondary" to="/decisions">
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={
              busy || (mode === 'template' && templateState !== 'ready')
            }
          >
            {busy ? 'Creating…' : 'Create decision'}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default NewDecisionPage
