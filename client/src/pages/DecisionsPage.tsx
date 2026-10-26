import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import LoadingState from '../components/ui/LoadingState'
import StatusBadge from '../components/ui/StatusBadge'
import TextInput from '../components/ui/TextInput'
import {
  decisionApi,
  type DecisionSummary,
  DecisionApiError as ApiError,
} from '../decisions/api'
import { useAuth } from '../auth/session'
import type { DecisionStatus } from '../types'
import '../styles/decisions.css'

const dateFormat = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

type ListState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: DecisionSummary[] }
  | { kind: 'error'; message: string }

const emptyDecisions: DecisionSummary[] = []

function DecisionsPage() {
  const { user } = useAuth()
  const [state, setState] = useState<ListState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<DecisionStatus | 'All'>('All')
  const [pending, setPending] = useState<DecisionSummary | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [message, setMessage] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    decisionApi
      .getDecisions(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setState({ kind: 'ready', items })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            kind: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Decisions could not be loaded.',
          })
        }
      })
    return () => controller.abort()
  }, [attempt])

  const items = state.kind === 'ready' ? state.items : emptyDecisions
  const query = title.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) &&
          (status === 'All' || item.status === status),
      ),
    [items, query, status],
  )
  const createLink = (
    <Link
      className="button button--primary"
      to={user ? '/decisions/new' : '/login'}
      state={user ? undefined : { returnTo: '/decisions/new' }}
    >
      Create New Decision
    </Link>
  )

  function clearFilters() {
    setTitle('')
    setStatus('All')
  }

  async function deleteDecision() {
    if (!pending || !user || pending.ownerId !== user.id) return
    setDeleteBusy(true)
    setMessage('')
    try {
      await decisionApi.deleteDecision(pending.id)
      setState((current) =>
        current.kind === 'ready'
          ? {
              kind: 'ready',
              items: current.items.filter((item) => item.id !== pending.id),
            }
          : current,
      )
      setMessage(`Deleted “${pending.title}”.`)
      setPending(null)
      window.requestAnimationFrame(() => headingRef.current?.focus())
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'The decision could not be deleted.',
      )
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <section aria-labelledby="decisions-heading">
      <div className="page-heading decisions-heading">
        <div>
          <p className="eyebrow">Decision library</p>
          <h1 id="decisions-heading" tabIndex={-1} ref={headingRef}>
            Your decisions
          </h1>
          <p className="page-description">
            Explore your choices and pick up where you left off.
          </p>
        </div>
        {createLink}
      </div>
      <div
        className="decision-filters"
        role="search"
        aria-label="Filter decisions"
      >
        <TextInput
          label="Search by title"
          type="search"
          value={title}
          placeholder="Search decisions…"
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="form-field">
          <label className="field-label" htmlFor="decision-status">
            Status
          </label>
          <select
            id="decision-status"
            className="text-input"
            value={status}
            onChange={(event) => {
              const value = event.target.value
              if (value === 'All' || value === 'Draft' || value === 'Finalized')
                setStatus(value)
            }}
          >
            <option>All</option>
            <option>Draft</option>
            <option>Finalized</option>
          </select>
        </div>
        <Button
          variant="ghost"
          onClick={clearFilters}
          disabled={!title && status === 'All'}
        >
          Clear filters
        </Button>
      </div>
      <p className="decision-announcement" role="status">
        {message}
      </p>
      {state.kind === 'loading' ? (
        <LoadingState message="Loading decisions…" />
      ) : state.kind === 'error' ? (
        <ErrorState
          message={state.message}
          onRetry={() => {
            setState({ kind: 'loading' })
            setAttempt((current) => current + 1)
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No decisions yet"
          description="Start a decision to give your next choice some clarity."
          action={createLink}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching decisions"
          description="Try another title or status to find what you’re looking for."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Reset search and filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="decision-count" role="status">
            {filtered.length} {filtered.length === 1 ? 'decision' : 'decisions'}
          </p>
          <ul className="decision-grid">
            {filtered.map((item) => {
              const owner = Boolean(
                user && item.ownerId !== undefined && item.ownerId === user.id,
              )
              return (
                <li key={item.id}>
                  <article
                    className="decision-card"
                    aria-labelledby={`decision-${item.id}`}
                  >
                    <div className="decision-card-top">
                      <StatusBadge status={item.status} />
                      <span className="decision-ownership">
                        {owner
                          ? 'Your decision'
                          : item.ownerName
                            ? `View only · ${item.ownerName}`
                            : 'View only'}
                      </span>
                    </div>
                    <h2 id={`decision-${item.id}`}>
                      <Link to={`/decisions/${item.id}`}>{item.title}</Link>
                    </h2>
                    <p className="decision-updated">
                      Updated{' '}
                      <time dateTime={item.updatedAt}>
                        {dateFormat.format(new Date(item.updatedAt))}
                      </time>
                    </p>
                    {item.status === 'Finalized' &&
                      item.winnerNames.length > 0 && (
                        <p className="decision-winners">
                          <strong>
                            {item.winnerNames.length > 1 ? 'Winners' : 'Winner'}:
                          </strong>{' '}
                          {item.winnerNames.join(', ')}
                        </p>
                      )}
                    <div className="decision-card-actions">
                      <Link
                        className="button button--secondary"
                        to={`/decisions/${item.id}`}
                      >
                        View decision
                      </Link>
                      {owner && (
                        <Button
                          variant="ghost"
                          aria-label={`Delete ${item.title}`}
                          onClick={() => {
                            setMessage('')
                            setPending(item)
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete this decision?"
        description={`“${pending?.title ?? ''}” will be permanently removed.`}
        confirmLabel="Delete decision"
        busy={deleteBusy}
        onCancel={() => setPending(null)}
        onConfirm={() => void deleteDecision()}
      />
    </section>
  )
}

export default DecisionsPage
