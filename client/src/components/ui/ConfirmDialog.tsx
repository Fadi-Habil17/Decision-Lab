import { useId } from 'react'
import Button, { type ButtonVariant } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: ButtonVariant
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  busy = false,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  description,
  onCancel,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()

  if (!open) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-dialog"
        role="alertdialog"
      >
        <p className="eyebrow">Please confirm</p>
        <h2 id={titleId}>{title}</h2>
        <p className="dialog-description" id={descriptionId}>
          {description}
        </p>
        <div className="dialog-actions">
          <Button disabled={busy} onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button disabled={busy} onClick={onConfirm} variant={confirmVariant}>
            {busy ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmDialog
