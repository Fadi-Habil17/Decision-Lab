import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import ErrorState from '../components/ui/ErrorState'
import LoadingState from '../components/ui/LoadingState'
import StatusBadge from '../components/ui/StatusBadge'
import TextInput from '../components/ui/TextInput'
import {
  decisionApi,
  DecisionApiError,
  type DecisionCriterion,
  type DecisionOption,
  type DecisionRecord,
  type DecisionScore,
} from '../decisions/api'
import { useAuth } from '../auth/session'
import '../styles/workspace.css'

type WorkspaceState =
  | { kind: 'loading' }
  | { kind: 'ready'; id: number; decision: DecisionRecord }
  | { kind: 'error'; id: number; message: string }

interface EditorOption extends DecisionOption {
  temporary?: boolean
}

interface EditorCriterion extends DecisionCriterion {
  temporary?: boolean
}

function displayError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The request could not be completed. Please try again.'
}

function DecisionWorkspacePage() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState<WorkspaceState>({ kind: 'loading' })
  const [options, setOptions] = useState<EditorOption[]>([])
  const [criteria, setCriteria] = useState<EditorCriterion[]>([])
  const [scores, setScores] = useState<DecisionScore[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [details, setDetails] = useState<string[]>([])
  const nextTemporaryId = useRef(-1)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id <= 0) return
    const controller = new AbortController()
    decisionApi
      .getDecision(id, controller.signal)
      .then((decision) => {
        if (controller.signal.aborted) return
        setTitle(decision.title)
        setDescription(decision.description ?? '')
        setOptions(decision.options)
        setCriteria(decision.criteria)
        setScores(decision.scores)
        setDirty(false)
        setError('')
        setDetails([])
        setState({ kind: 'ready', id, decision })
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setState({ kind: 'error', id, message: displayError(loadError) })
        }
      })
    return () => controller.abort()
  }, [attempt, id])

  const weightTotal = useMemo(
    () => criteria.reduce((total, criterion) => total + Number(criterion.weight || 0), 0),
    [criteria],
  )
  const missingScores = useMemo(
    () =>
      options.flatMap((option) =>
        criteria
          .filter(
            (criterion) =>
              !scores.some(
                (score) =>
                  score.optionId === option.id &&
                  score.criterionId === criterion.id,
              ),
          )
          .map((criterion) => ({ option, criterion })),
      ),
    [criteria, options, scores],
  )

  if (!Number.isSafeInteger(id) || id <= 0) {
    return (
      <ErrorState
        title="Decision unavailable"
        message="This decision ID is invalid."
      />
    )
  }
  if (state.kind === 'loading' || state.id !== id) {
    return <LoadingState message="Loading decision workspace…" />
  }
  if (state.kind === 'error') {
    return (
      <ErrorState
        title="Decision unavailable"
        message={state.message}
        onRetry={() => {
          setState({ kind: 'loading' })
          setAttempt((current) => current + 1)
        }}
      />
    )
  }

  const decision = state.decision
  const owner = Boolean(user && decision.ownerId !== undefined && user.id === decision.ownerId)
  const canEdit = owner && decision.status === 'Draft'
  const ownerLabel = owner
    ? 'Your decision'
    : decision.ownerName
      ? `View only · Owned by ${decision.ownerName}`
      : 'View only'

  function markChanged() {
    setDirty(true)
    setError('')
    setDetails([])
  }

  function updateScore(optionId: number, criterionId: number, value: string) {
    const parsed = value === '' ? undefined : Number(value)
    setScores((current) => {
      const withoutPair = current.filter(
        (score) =>
          score.optionId !== optionId || score.criterionId !== criterionId,
      )
      return parsed === undefined
        ? withoutPair
        : [...withoutPair, { optionId, criterionId, score: parsed }]
    })
    markChanged()
  }

  function validateBeforeSave(): string | undefined {
    if (!title.trim()) return 'Add a title before saving.'
    if (options.length < 2 || options.length > 8) {
      return 'A decision needs between two and eight options.'
    }
    if (criteria.length < 2 || criteria.length > 8) {
      return 'A decision needs between two and eight criteria.'
    }
    if (options.some((option) => !option.name.trim())) return 'Name every option before saving.'
    if (criteria.some((criterion) => !criterion.name.trim())) return 'Name every criterion before saving.'
    if (new Set(options.map((option) => option.name.trim().toLocaleLowerCase())).size !== options.length) {
      return 'Option names must be unique.'
    }
    if (new Set(criteria.map((criterion) => criterion.name.trim().toLocaleLowerCase())).size !== criteria.length) {
      return 'Criterion names must be unique.'
    }
    if (
      criteria.some(
        (criterion) =>
          !Number.isInteger(Number(criterion.weight)) ||
          Number(criterion.weight) < 1 ||
          Number(criterion.weight) > 100,
      )
    ) {
      return 'Each criterion weight must be a whole number from 1 to 100.'
    }
    return undefined
  }

  async function save(): Promise<DecisionRecord | undefined> {
    const validationError = validateBeforeSave()
    if (validationError) {
      setError(validationError)
      setDetails([])
      return undefined
    }
    setBusy(true)
    setError('')
    setDetails([])
    try {
      let updated = await decisionApi.getDecision(id)
      const selectedOptionIds = new Set(options.filter((option) => option.id > 0).map((option) => option.id))
      for (const option of updated.options) {
        if (!selectedOptionIds.has(option.id)) {
          updated = await decisionApi.removeOption(id, option.id)
        }
      }

      const optionIds = new Map<number, number>()
      for (const option of options) {
        const name = option.name.trim()
        if (option.id > 0) {
          const existing = updated.options.find((item) => item.id === option.id)
          if (existing && existing.name !== name) {
            updated = await decisionApi.renameOption(id, option.id, name)
          }
          optionIds.set(option.id, option.id)
        } else {
          const existing = updated.options.find(
            (item) => item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
          )
          if (existing) {
            optionIds.set(option.id, existing.id)
          } else {
            updated = await decisionApi.addOption(id, name)
            const added = updated.options.find(
              (item) => item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
            )
            if (!added) throw new Error(`The server did not return the new option "${name}".`)
            optionIds.set(option.id, added.id)
          }
        }
      }

      const selectedCriterionIds = new Set(criteria.filter((criterion) => criterion.id > 0).map((criterion) => criterion.id))
      for (const criterion of updated.criteria) {
        if (!selectedCriterionIds.has(criterion.id)) {
          updated = await decisionApi.removeCriterion(id, criterion.id)
        }
      }

      const criterionIds = new Map<number, number>()
      for (const criterion of criteria) {
        const name = criterion.name.trim()
        const weight = Number(criterion.weight)
        if (criterion.id > 0) {
          const existing = updated.criteria.find((item) => item.id === criterion.id)
          if (existing && (existing.name !== name || existing.weight !== weight)) {
            updated = await decisionApi.updateCriterion(id, criterion.id, { name, weight })
          }
          criterionIds.set(criterion.id, criterion.id)
        } else {
          const existing = updated.criteria.find(
            (item) =>
              item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase() &&
              item.weight === weight,
          )
          if (existing) {
            criterionIds.set(criterion.id, existing.id)
          } else {
            updated = await decisionApi.addCriterion(id, name, weight)
            const added = updated.criteria.find(
              (item) =>
                item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase() &&
                item.weight === weight,
            )
            if (!added) throw new Error(`The server did not return the new criterion "${name}".`)
            criterionIds.set(criterion.id, added.id)
          }
        }
      }

      const desiredScores = scores.flatMap((score) => {
        const optionId = optionIds.get(score.optionId)
        const criterionId = criterionIds.get(score.criterionId)
        return optionId === undefined || criterionId === undefined
          ? []
          : [{ ...score, optionId, criterionId }]
      })
      const desiredScoreKeys = new Set(
        desiredScores.map((score) => `${score.optionId}:${score.criterionId}`),
      )
      for (const score of updated.scores) {
        if (!desiredScoreKeys.has(`${score.optionId}:${score.criterionId}`)) {
          updated = await decisionApi.removeScore(id, score.optionId, score.criterionId)
        }
      }
      for (const score of desiredScores) {
        const existing = updated.scores.find(
          (item) =>
            item.optionId === score.optionId &&
            item.criterionId === score.criterionId,
        )
        if (!existing || existing.score !== score.score) {
          updated = await decisionApi.upsertScore(id, score)
        }
      }

      const nextTitle = title.trim()
      const nextDescription = description.trim()
      if (updated.title !== nextTitle || (updated.description ?? '') !== nextDescription) {
        updated = await decisionApi.updateDecision(id, {
          title: nextTitle,
          description: nextDescription,
        })
      }
      setOptions(updated.options)
      setCriteria(updated.criteria)
      setScores(updated.scores)
      setTitle(updated.title)
      setDescription(updated.description ?? '')
      setDirty(false)
      setState({ kind: 'ready', id, decision: updated })
      return updated
    } catch (saveError) {
      setError(displayError(saveError))
      if (saveError instanceof DecisionApiError) {
        setDetails([
          ...saveError.errors,
          ...saveError.missingScores.map(
            (pair) => `${pair.optionName} · ${pair.criterionName}`,
          ),
        ])
      }
      return undefined
    } finally {
      setBusy(false)
    }
  }

  async function saveAndCalculate() {
    const saved = dirty ? await save() : decision
    if (!saved) return
    setBusy(true)
    setError('')
    try {
      const result = await decisionApi.calculate(id)
      navigate(`/decisions/${id}/result`, { state: { result } })
    } catch (calculateError) {
      setError(displayError(calculateError))
      if (calculateError instanceof DecisionApiError) {
        setDetails([
          ...calculateError.errors,
          ...calculateError.missingScores.map(
            (pair) => `${pair.optionName} · ${pair.criterionName}`,
          ),
        ])
      }
    } finally {
      setBusy(false)
    }
  }

  async function finalizeDecision() {
    const saved = dirty ? await save() : decision
    if (!saved) return
    setBusy(true)
    setError('')
    try {
      const result = await decisionApi.calculate(id)
      const finalized = await decisionApi.finalize(id)
      setState({ kind: 'ready', id, decision: finalized })
      navigate(`/decisions/${id}/result`, { state: { result } })
    } catch (finalizeError) {
      setError(displayError(finalizeError))
      if (finalizeError instanceof DecisionApiError) {
        setDetails([
          ...finalizeError.errors,
          ...finalizeError.missingScores.map(
            (pair) => `${pair.optionName} · ${pair.criterionName}`,
          ),
        ])
      }
    } finally {
      setBusy(false)
    }
  }

  async function reopenDecision() {
    setBusy(true)
    setError('')
    try {
      const reopened = await decisionApi.reopen(id)
      setState({ kind: 'ready', id, decision: reopened })
      setTitle(reopened.title)
      setDescription(reopened.description ?? '')
      setOptions(reopened.options)
      setCriteria(reopened.criteria)
      setScores(reopened.scores)
      setDirty(false)
    } catch (reopenError) {
      setError(displayError(reopenError))
    } finally {
      setBusy(false)
    }
  }

  function addOption() {
    setOptions((current) => [
      ...current,
      { id: nextTemporaryId.current--, name: '', temporary: true },
    ])
    markChanged()
  }

  function removeOption(optionId: number) {
    setOptions((current) => current.filter((option) => option.id !== optionId))
    setScores((current) => current.filter((score) => score.optionId !== optionId))
    markChanged()
  }

  function addCriterion() {
    setCriteria((current) => [
      ...current,
      {
        id: nextTemporaryId.current--,
        name: '',
        weight: 1,
        temporary: true,
      },
    ])
    markChanged()
  }

  function removeCriterion(criterionId: number) {
    setCriteria((current) =>
      current.filter((criterion) => criterion.id !== criterionId),
    )
    setScores((current) =>
      current.filter((score) => score.criterionId !== criterionId),
    )
    markChanged()
  }

  return (
    <section className="workspace-page" aria-labelledby="workspace-title">
      <div className="page-heading workspace-heading">
        <div>
          <p className="eyebrow">Decision workspace</p>
          <h1 id="workspace-title">{decision.title}</h1>
          <p className="page-description">
            Compare options against what matters to you. The server calculates
            the final ranking.
          </p>
        </div>
        <div className="workspace-status">
          <StatusBadge status={decision.status} />
          <span className={`ownership-badge${owner ? ' ownership-badge--owner' : ''}`}>
            {ownerLabel}
          </span>
        </div>
      </div>

      {decision.description && (
        <p className="workspace-description">{decision.description}</p>
      )}
      {!owner && (
        <div className="workspace-notice" role="note">
          This decision is read-only for your account. Only its owner can change
          options, criteria, scores, or status.
        </div>
      )}

      <section className="workspace-card" aria-labelledby="options-title">
        <div className="workspace-section-heading">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2 id="options-title">Options</h2>
            <p>List the choices you want to compare (2–8).</p>
          </div>
          {canEdit && (
            <Button
              variant="secondary"
              disabled={options.length >= 8 || busy}
              onClick={addOption}
            >
              Add option
            </Button>
          )}
        </div>
        <div className="workspace-edit-list">
          {options.map((option, index) => (
            <div className="workspace-edit-row" key={option.id}>
              <span className="workspace-row-number">{String(index + 1).padStart(2, '0')}</span>
              <TextInput
                label={`Option ${index + 1}`}
                value={option.name}
                disabled={!canEdit || busy}
                placeholder="Name this option"
                onChange={(event) => {
                  const name = event.target.value
                  setOptions((current) =>
                    current.map((entry) =>
                      entry.id === option.id ? { ...entry, name } : entry,
                    ),
                  )
                  markChanged()
                }}
              />
              {canEdit && (
                <Button
                  variant="ghost"
                  disabled={options.length <= 2 || busy}
                  aria-label={`Remove ${option.name || `option ${index + 1}`}`}
                  onClick={() => removeOption(option.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          {options.length < 2 && (
            <p className="field-error">Add at least two options to compare.</p>
          )}
        </div>
      </section>

      <section className="workspace-card" aria-labelledby="criteria-title">
        <div className="workspace-section-heading">
          <div>
            <p className="eyebrow">Step 2</p>
            <h2 id="criteria-title">Criteria &amp; weights</h2>
            <p>Give each criterion an integer weight from 1–100 (2–8 criteria).</p>
          </div>
          {canEdit && (
            <Button
              variant="secondary"
              disabled={criteria.length >= 8 || busy}
              onClick={addCriterion}
            >
              Add criterion
            </Button>
          )}
        </div>
        <div className="criteria-list">
          {criteria.map((criterion, index) => (
            <div className="criteria-row" key={criterion.id}>
              <TextInput
                label={`Criterion ${index + 1}`}
                value={criterion.name}
                disabled={!canEdit || busy}
                placeholder="What matters?"
                onChange={(event) => {
                  const name = event.target.value
                  setCriteria((current) =>
                    current.map((entry) =>
                      entry.id === criterion.id ? { ...entry, name } : entry,
                    ),
                  )
                  markChanged()
                }}
              />
              <TextInput
                label="Weight"
                type="number"
                min={1}
                max={100}
                step={1}
                value={criterion.weight}
                disabled={!canEdit || busy}
                onChange={(event) => {
                  const weight = event.target.value === '' ? 0 : Number(event.target.value)
                  setCriteria((current) =>
                    current.map((entry) =>
                      entry.id === criterion.id ? { ...entry, weight } : entry,
                    ),
                  )
                  markChanged()
                }}
              />
              {canEdit && (
                <Button
                  variant="ghost"
                  disabled={criteria.length <= 2 || busy}
                  aria-label={`Remove ${criterion.name || `criterion ${index + 1}`}`}
                  onClick={() => removeCriterion(criterion.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          {criteria.length < 2 && (
            <p className="field-error">Add at least two criteria to calculate a result.</p>
          )}
        </div>
        <div
          className={`weight-total${weightTotal === 100 ? ' weight-total--valid' : ' weight-total--invalid'}`}
          role="status"
          aria-live="polite"
        >
          <span>
            Total weight <strong>{weightTotal}%</strong>
          </span>
          <span>{weightTotal === 100 ? 'Balanced' : `${weightTotal - 100 > 0 ? '+' : ''}${weightTotal - 100}% from 100`}</span>
        </div>
        {weightTotal !== 100 && (
          <p className="field-error">
            Weights must add up to exactly 100% before calculating or finalizing.
          </p>
        )}
      </section>

      <section className="workspace-card" aria-labelledby="score-matrix-title">
        <div className="workspace-section-heading">
          <div>
            <p className="eyebrow">Step 3</p>
            <h2 id="score-matrix-title">Score matrix</h2>
            <p>Rate each option against each criterion from 1–10.</p>
          </div>
          <span className="stage-chip">
            {missingScores.length
              ? `${missingScores.length} score${missingScores.length === 1 ? '' : 's'} missing`
              : 'All scores entered'}
          </span>
        </div>
        <div className="score-table-wrap">
          <table className="score-table">
            <thead>
              <tr>
                <th scope="col">Option</th>
                {criteria.map((criterion) => (
                  <th scope="col" key={criterion.id}>
                    <span>{criterion.name || 'Unnamed criterion'}</span>
                    <small>{criterion.weight}% weight</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {options.map((option) => (
                <tr key={option.id}>
                  <th scope="row">{option.name || 'Unnamed option'}</th>
                  {criteria.map((criterion) => {
                    const score = scores.find(
                      (entry) =>
                        entry.optionId === option.id &&
                        entry.criterionId === criterion.id,
                    )
                    const disabled =
                      !canEdit ||
                      busy ||
                      option.id < 0 ||
                      criterion.id < 0
                    return (
                      <td key={criterion.id}>
                        <label className="sr-only" htmlFor={`score-${option.id}-${criterion.id}`}>
                          {option.name || 'Option'} — {criterion.name || 'criterion'} score
                        </label>
                        <select
                          id={`score-${option.id}-${criterion.id}`}
                          className={`score-select${score ? '' : ' score-select--missing'}`}
                          value={score?.score ?? ''}
                          disabled={disabled}
                          aria-label={`${option.name || 'Option'} — ${criterion.name || 'criterion'} score`}
                          onChange={(event) =>
                            updateScore(option.id, criterion.id, event.target.value)
                          }
                        >
                          <option value="">—</option>
                          {Array.from({ length: 10 }, (_, scoreIndex) => scoreIndex + 1).map(
                            (value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {missingScores.length > 0 && (
          <p className="field-hint">
            Complete every option/criterion pair before requesting a result.
          </p>
        )}
      </section>

      {error && (
        <div className="workspace-error" role="alert">
          <strong>{error}</strong>
          {details.length > 0 && (
            <ul>
              {details.map((detail, index) => (
                <li key={`${detail}-${index}`}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="workspace-actions">
        <Link className="button button--secondary" to="/decisions">
          Back to decisions
        </Link>
        {canEdit && (
          <>
            {dirty && (
              <Button variant="secondary" disabled={busy} onClick={() => void save()}>
                Save changes
              </Button>
            )}
            {decision.status === 'Draft' && (
              <>
                <Button
                  variant="secondary"
                  disabled={
                    busy ||
                    options.length < 2 ||
                    options.length > 8 ||
                    criteria.length < 2 ||
                    criteria.length > 8 ||
                    weightTotal !== 100 ||
                    missingScores.length > 0
                  }
                  onClick={() => void saveAndCalculate()}
                >
                  {busy ? 'Working…' : 'Calculate result'}
                </Button>
                <Button
                  disabled={
                    busy ||
                    options.length < 2 ||
                    options.length > 8 ||
                    criteria.length < 2 ||
                    criteria.length > 8 ||
                    weightTotal !== 100 ||
                    missingScores.length > 0
                  }
                  onClick={() => void finalizeDecision()}
                >
                  Finalize decision
                </Button>
              </>
            )}
          </>
        )}
        {owner && decision.status === 'Finalized' && (
          <>
            <Button disabled={busy} onClick={() => void reopenDecision()}>
              Reopen decision
            </Button>
          </>
        )}
        <Link
          className="button button--secondary"
          to={`/decisions/${id}/result`}
        >
          View results
        </Link>
      </div>
    </section>
  )
}

export default DecisionWorkspacePage
