import { AlertCircle, RotateCw } from 'lucide-react'

type Props = {
  message?: string
  onRetry: () => void
  isRetrying?: boolean
  compact?: boolean
}

export function QueryError({
  message = 'Something went wrong.',
  onRetry,
  isRetrying = false,
  compact = false,
}: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
        <span className="flex-1 text-destructive">{message}</span>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-1 rounded border border-input bg-background px-1.5 py-0.5 text-foreground hover:bg-muted disabled:opacity-50"
        >
          <RotateCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
          Retry
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-destructive/40 py-8 text-center">
      <AlertCircle className="h-7 w-7 text-destructive" strokeWidth={1.5} aria-hidden="true" />
      <p className="text-sm font-medium text-destructive">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
      >
        <RotateCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}
