import type { DecisionStatus } from '../../types'

interface StatusBadgeProps {
  status: DecisionStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusClass = status === 'Draft' ? 'status-badge--draft' : 'status-badge--finalized'

  return <span className={`status-badge ${statusClass}`}>{status}</span>
}

export default StatusBadge
