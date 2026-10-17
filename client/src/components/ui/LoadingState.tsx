interface LoadingStateProps {
  message?: string
}

function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}

export default LoadingState
