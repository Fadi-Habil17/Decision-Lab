import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import LoadingState from '../components/ui/LoadingState'
import StatusBadge from '../components/ui/StatusBadge'
import TextInput from '../components/ui/TextInput'
import { useLocalDecisions } from '../decisions/store'
import { useDemoSession } from '../demo/session'
import type { DecisionStatus } from '../types'
import '../styles/decisions.css'

const dateFormat = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

function DecisionsPage() {
  const { user } = useDemoSession()
  const { items, scenario, remove, retry } = useLocalDecisions()
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<DecisionStatus | 'All'>('All')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const available = scenario === 'empty' ? [] : items
  const query = title.trim().toLowerCase()
  const filtered = available.filter(
    (item) =>
      item.title.toLowerCase().includes(query) &&
      (status === 'All' || item.status === status),
  )
  const pending = items.find(
    (item) => item.id === pendingId && item.ownerId === user?.id,
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
      <p className="decisions-preview-note">
        Demo decisions · Changes last until you refresh this page.
      </p>
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
      {scenario === 'loading' ? (
        <LoadingState message="Loading decisions…" />
      ) : scenario === 'error' ? (
        <ErrorState
          message="We couldn't load the decisions. Please try again."
          onRetry={retry}
        />
      ) : available.length === 0 ? (
        <EmptyState
          title="No decisions yet"
          description="Start a decision to give your next choice some clarity."
          action={createLink}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching decisions"
          description="Try another title or status to find what you're looking for."
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
            {filtered.map((item) => (
              <li key={item.id}>
                <article
                  className="decision-card"
                  aria-labelledby={`decision-${item.id}`}
                >
                  <div className="decision-card-top">
                    <StatusBadge status={item.status} />
                    <span className="decision-ownership">
                      {user?.id === item.ownerId
                        ? 'Your decision'
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
                    {user?.id === item.ownerId && (
                      <Button
                        variant="ghost"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => {
                          setMessage('')
                          setPendingId(item.id)
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete this decision?"
        description={`“${pending?.title ?? ''}” will be removed from this demo list until the page is refreshed.`}
        confirmLabel="Delete decision"
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          if (pending && remove(pending.id, user?.id ?? null))
            setMessage(`Deleted “${pending.title}”.`)
          setPendingId(null)
          window.requestAnimationFrame(() => headingRef.current?.focus())
        }}
      />
    </section>
  )
}

export default DecisionsPage
