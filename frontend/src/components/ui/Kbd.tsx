import { isMac } from '@/hooks/useKeyboardShortcut'

type Props = {
  combo: 'mod+n' | 'mod+s'
  className?: string
}

const LABELS: Record<Props['combo'], { mac: string; other: string }> = {
  'mod+n': { mac: '⌘N', other: 'Ctrl N' },
  'mod+s': { mac: '⌘S', other: 'Ctrl S' },
}

export function Kbd({ combo, className = '' }: Props) {
  const label = LABELS[combo]
  return (
    <kbd
      className={`hidden rounded border border-border bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground md:inline-block ${className}`}
    >
      {isMac ? label.mac : label.other}
    </kbd>
  )
}
