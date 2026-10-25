import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="state-panel empty-state">
      <span className="state-symbol" aria-hidden="true">—</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className="state-action">{action}</div> : null}
    </div>
  )
}

export default EmptyState
