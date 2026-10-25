import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ErrorState from '../components/ui/ErrorState'
import LoadingState from '../components/ui/LoadingState'
import { decisionApi, type DecisionResult } from '../decisions/api'
import '../styles/results.css'

type ResultState =
  | { kind: 'loading' }
  | { kind: 'ready'; result: DecisionResult }
  | { kind: 'error'; id: number; message: string }

function DecisionResultsPage() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const location = useLocation()
  const navigationResult = (
    location.state as { result?: DecisionResult } | null
  )?.result
  const [state, setState] = useState<ResultState>(() =>
    navigationResult?.decisionId === id
      ? { kind: 'ready', result: navigationResult }
      : { kind: 'loading' },
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (
      navigationResult?.decisionId === id ||
      !Number.isSafeInteger(id) ||
      id <= 0
    ) return
    const controller = new AbortController()
    decisionApi
      .calculate(id)
      .then((result) => {
        if (!controller.signal.aborted) setState({ kind: 'ready', result })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            kind: 'error',
            id,
            message:
              error instanceof Error
                ? error.message
                : 'The results could not be loaded.',
          })
        }
      })
    return () => controller.abort()
  }, [attempt, id, navigationResult])

  if (!Number.isSafeInteger(id) || id <= 0) {
    return (
      <ErrorState
        title="Results unavailable"
        message="This decision ID is invalid."
      />
    )
  }
  if (
    state.kind === 'loading' ||
    (state.kind === 'ready' && state.result.decisionId !== id) ||
    (state.kind === 'error' && state.id !== id)
  ) {
    return <LoadingState message="Getting the latest results from the server…" />
  }
  if (state.kind === 'error') {
    return (
      <ErrorState
        title="Results unavailable"
        message={state.message}
        onRetry={() => {
          setState({ kind: 'loading' })
          setAttempt((current) => current + 1)
        }}
      />
    )
  }

  const { result } = state

  return (
    <section className="results-page" aria-labelledby="results-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Decision results</p>
          <h1 id="results-title">{result.title}</h1>
          <p className="page-description">
            Ranked and explained by the decision engine using your saved scores.
          </p>
        </div>
        <Link
          className="button button--secondary"
          to={`/decisions/${result.decisionId}`}
        >
          Back to workspace
        </Link>
      </div>

      {result.winners.length > 0 && (
        <section className="results-winner" aria-label="Top-ranked option">
          <span className="results-winner-mark" aria-hidden="true">
            ★
          </span>
          <div>
            <p className="eyebrow">{result.winners.length > 1 ? 'Shared top rank' : 'Top-ranked option'}</p>
            <h2>{result.winners.join(' · ')}</h2>
          </div>
        </section>
      )}

      <div className="results-list">
        {result.ranked.map((option) => (
          <article className="result-card" key={option.optionId}>
            <div className="result-card-heading">
              <div className="result-rank" aria-label={`Rank ${option.rank}`}>
                <span>Rank</span>
                <strong>{String(option.rank).padStart(2, '0')}</strong>
              </div>
              <div className="result-option-title">
                <h2>{option.optionName}</h2>
                {option.isTied && <span className="result-tie">Tied</span>}
              </div>
              <div className="result-total">
                <strong>{option.displayTotal}</strong>
                <span>out of 100</span>
              </div>
            </div>

            <div
              className="result-progress-track"
              role="progressbar"
              aria-label={`${option.optionName} total`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.max(0, Math.min(100, option.exactTotal))}
            >
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, option.exactTotal))}%`,
                }}
              />
            </div>

            <div className="result-insights">
              <div>
                <span>Strongest criterion</span>
                <strong>{option.strongestCriterion.criterionName}</strong>
                <small>
                  {option.strongestCriterion.score}/10 ·{' '}
                  {option.strongestCriterion.points.toFixed(1)} points
                </small>
              </div>
              <div>
                <span>Weakest criterion</span>
                <strong>{option.weakestCriterion.criterionName}</strong>
                <small>
                  {option.weakestCriterion.score}/10 ·{' '}
                  {option.weakestCriterion.points.toFixed(1)} points
                </small>
              </div>
              <div>
                <span>Gap to option above</span>
                <strong>
                  {option.rank === 1 || option.gapToAbove === 0
                    ? '—'
                    : option.gapToAbove.toFixed(1)}
                </strong>
                <small>
                  {option.rank === 1 || option.gapToAbove === 0
                    ? 'Top or shared rank'
                    : 'points behind'}
                </small>
              </div>
            </div>

            <details className="result-contributions">
              <summary>See criterion contributions</summary>
              <ul>
                {option.contributions.map((contribution) => (
                  <li key={contribution.criterionId}>
                    <span>
                      <strong>{contribution.criterionName}</strong>
                      <small>
                        Score {contribution.score}/10 · weight {contribution.weight}%
                      </small>
                    </span>
                    <strong>{contribution.points.toFixed(1)} pts</strong>
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}

export default DecisionResultsPage
