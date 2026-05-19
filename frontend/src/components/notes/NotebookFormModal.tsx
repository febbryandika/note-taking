import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'

const MAX_NAME_LENGTH = 100

type Props = {
  open: boolean
  mode: 'create' | 'rename'
  initialName?: string
  existingNames: string[]
  isPending?: boolean
  onSubmit: (name: string) => void
  onClose: () => void
}

export function NotebookFormModal({
  open,
  mode,
  initialName = '',
  existingNames,
  isPending = false,
  onSubmit,
  onClose,
}: Props) {
  const [name, setName] = useState(initialName)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setTouched(false)
    }
  }, [open, initialName])

  const trimmed = name.trim()
  const initialTrimmed = initialName.trim()
  const isUnchanged = mode === 'rename' && trimmed === initialTrimmed
  const duplicate = existingNames
    .filter((n) => n.toLowerCase() !== initialTrimmed.toLowerCase())
    .some((n) => n.toLowerCase() === trimmed.toLowerCase())

  let error: string | null = null
  if (trimmed.length === 0) error = 'Name is required.'
  else if (trimmed.length > MAX_NAME_LENGTH) error = `Max ${MAX_NAME_LENGTH} characters.`
  else if (duplicate) error = 'A notebook with that name already exists.'

  const canSubmit = !error && !isUnchanged && !isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    onSubmit(trimmed)
  }

  const title = mode === 'create' ? 'New notebook' : 'Rename notebook'
  const submitLabel = mode === 'create' ? 'Create' : 'Rename'

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
            type="submit"
            form="notebook-form"
            disabled={!canSubmit}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : submitLabel}
          </button>
        </>
      }
    >
      <form id="notebook-form" onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="notebook-name" className="text-xs font-medium text-muted-foreground">
          Name
        </label>
        <input
          id="notebook-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          maxLength={MAX_NAME_LENGTH + 50}
          placeholder="e.g. Work, Ideas, Reading list"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring md:text-sm"
        />
        {touched && error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </form>
    </Modal>
  )
}
