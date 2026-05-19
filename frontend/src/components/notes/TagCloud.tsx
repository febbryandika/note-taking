import { Link } from '@tanstack/react-router'
import { useTags } from '@/hooks/useTags'

export function TagCloud({
  activeTag,
  onNavigate,
}: {
  activeTag?: string
  onNavigate?: () => void
}) {
  const tags = useTags()

  if (!tags.data || tags.data.length === 0) return null

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tags
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {tags.data.map(({ tag, count }) => {
          const active = activeTag === tag
          return (
            <Link
              key={tag}
              to="/notes"
              search={{ tag }}
              onClick={() => onNavigate?.()}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors md:py-0.5 ${
                active
                  ? 'bg-primary/10 font-medium text-foreground'
                  : 'bg-muted text-foreground/70 hover:bg-muted/70 hover:text-foreground'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="truncate">#{tag}</span>
              <span className="text-[10px] text-muted-foreground">{count}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
