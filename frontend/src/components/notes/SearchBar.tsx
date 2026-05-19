import { Search, X } from 'lucide-react'

type Props = {
  value: string
  onChange: (v: string) => void
  onClear: () => void
}

export function SearchBar({ value, onChange, onClear }: Props) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground md:h-3.5 md:w-3.5"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault()
            onClear()
          }
        }}
        placeholder="Search notes…"
        aria-label="Search notes"
        className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-8 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:py-1.5 md:pl-7 md:pr-7 md:text-xs"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:p-0.5"
          aria-label="Clear search"
          title="Clear search (Esc)"
        >
          <X className="h-3.5 w-3.5 md:h-3 md:w-3" />
        </button>
      )}
    </div>
  )
}
