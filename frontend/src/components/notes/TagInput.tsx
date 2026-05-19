import { useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  tags: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

export function TagInput({ tags, onChange, placeholder = 'Add a tag…' }: Props) {
  const [draft, setDraft] = useState('')

  function commit(raw: string) {
    const value = raw.trim().toLowerCase()
    if (!value) return
    if (tags.includes(value)) {
      setDraft('')
      return
    }
    onChange([...tags, value])
    setDraft('')
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
      return
    }
    if (e.key === 'Backspace' && draft.length === 0 && tags.length > 0) {
      e.preventDefault()
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-2 pr-1 text-xs text-foreground/80 md:py-0.5 md:pr-0.5"
        >
          #{tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-destructive md:p-0.5"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="h-3 w-3 md:h-2.5 md:w-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="min-w-[6rem] flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
      />
    </div>
  )
}
