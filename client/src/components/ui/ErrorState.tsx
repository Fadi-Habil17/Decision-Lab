import Button from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

function ErrorState({
  message,
  onRetry,
  title = 'Something went wrong',
}: ErrorStateProps) {
  return (
    <div className="state-panel error-state" role="alert">
      <span className="state-symbol state-symbol--error" aria-hidden="true">!</span>
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry ? (
        <div className="state-action">
          <Button onClick={onRetry} variant="secondary">
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default ErrorState
