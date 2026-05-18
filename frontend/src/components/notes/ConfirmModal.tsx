import { Modal } from '@/components/ui/Modal'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  isPending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  isPending = false,
  onConfirm,
  onClose,
}: Props) {
  const confirmClass = destructive
    ? 'bg-destructive text-white hover:bg-destructive/90'
    : 'bg-primary text-primary-foreground hover:bg-primary/90'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex items-center rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm disabled:opacity-50 ${confirmClass}`}
          >
            {isPending ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </Modal>
  )
}
