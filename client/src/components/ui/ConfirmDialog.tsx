import { useEffect, useId, useRef } from 'react'
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
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        const first = buttons?.[0]
        const last = buttons?.[buttons.length - 1]
        if (!first || !last) return
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
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
        <Button
          autoFocus
          disabled={busy}
          onClick={onCancel}
          variant="secondary"
        >
          {cancelLabel}
        </Button>
        <Button disabled={busy} onClick={onConfirm} variant={confirmVariant}>
          {busy ? 'Please wait…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}

export default ConfirmDialog
