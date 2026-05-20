import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (data?.session) throw redirect({ to: '/notes' })
  },
  component: LandingPage,
})

const btnPrimary =
  'inline-flex items-center gap-2 rounded-[10px] bg-ink px-[18px] py-2.5 text-[14px] font-semibold tracking-[-0.005em] text-paper transition hover:brightness-110 active:translate-y-px'

const navLink = 'text-[14px] font-medium text-ink-muted transition-colors hover:text-ink'

function LandingPage() {
  return (
    <div className="min-h-screen bg-paper font-display text-[15px] leading-[1.55] tracking-[-0.005em] text-ink antialiased selection:bg-iris-soft">
      {/* Top nav */}
      <nav className="mx-auto flex max-w-[1280px] items-center gap-7 px-12 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-ink text-[14px] font-bold tracking-[-0.02em] text-paper">
            N
          </div>
          <div className="text-[17px] font-semibold tracking-[-0.015em]">Notable</div>
        </Link>
        <div className="ml-auto flex items-center gap-7">
          <Link to="/login" className={navLink}>Sign in</Link>
          <Link to="/register" className={btnPrimary}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 px-8 pb-16 pt-8 min-[980px]:grid-cols-[1.05fr_1fr] min-[980px]:gap-16 min-[980px]:px-12 min-[980px]:pb-20 min-[980px]:pt-12">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-paper-line bg-paper-surface py-[5px] pl-[6px] pr-3 text-[12.5px] font-medium text-ink-muted">
            <span className="rounded-full bg-iris px-2 py-[1px] text-[11px] font-semibold tracking-[0.02em] text-white">
              New
            </span>
            <span>Source-serif reading mode, cross-device sync</span>
          </div>
          <h1 className="mb-[22px] text-balance text-[clamp(40px,5.5vw,64px)] font-bold leading-[1.05] tracking-[-0.035em] text-ink">
            Take notes that{' '}
            <span className="font-serif font-medium italic tracking-[-0.02em] text-iris">
              find themselves
            </span>{' '}
            later.
          </h1>
          <p className="mb-8 max-w-[540px] text-[18px] leading-[1.55] text-ink-muted [text-wrap:pretty]">
            Notable is a fast, quiet place for what you&apos;re thinking — with notebooks, tags,
            full-text search, and a reading view that finally treats words like words.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/register" className={btnPrimary}>
              Start writing — free
              <ArrowRightIcon />
            </Link>
          </div>
          <div className="mt-7 flex items-center gap-3.5 text-[13px] text-ink-faint">
            <span>Free forever</span>
            <Dot />
            <span>No credit card</span>
            <Dot />
            <span>Export anytime</span>
          </div>
        </div>

        {/* Hero visual — stacked, rotated note cards */}
        <div className="relative grid h-[480px] place-items-center" aria-hidden="true">
          <NoteCard
            className="z-[2] -translate-x-10 -translate-y-[60px] -rotate-3"
            title="Espresso log — Yirgacheffe"
            star
            chips={[
              { label: 'Personal' },
              { label: '#draft' },
            ]}
          >
            Light roast, washed. <b className="font-semibold text-ink">18g in, 36g out, 28s.</b>{' '}
            Bright florals, jasmine, bergamot — could grind a click finer.
          </NoteCard>

          <NoteCard
            className="z-[3] translate-x-10 translate-y-10 rotate-2"
            title="Quarterly planning — Q3 priorities"
            star
            chips={[
              { label: 'Work', accent: true },
              { label: '#urgent' },
              { label: '#meeting' },
            ]}
          >
            Three big bets: <b className="font-semibold text-ink">ship the editor refactor</b>,
            launch the mobile beta, and hit 40% week-2 retention. Everything else is supporting
            work.
          </NoteCard>

          <NoteCard
            className="z-[1] -translate-x-[10px] translate-y-[130px] -rotate-1 opacity-85"
            title="Reading: A Pattern Language"
            chips={[
              { label: 'Reading list' },
              { label: '#research' },
            ]}
          >
            Patterns aren&apos;t templates. A template is a finished form you copy; a pattern is a
            relationship between a problem…
          </NoteCard>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-[1280px] px-8 py-14 min-[980px]:px-12 min-[980px]:py-20"
      >
        <div className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-iris">
          Everything you need
        </div>
        <h2 className="mb-4 text-balance text-[clamp(28px,3.5vw,42px)] font-bold leading-[1.1] tracking-[-0.025em] text-ink">
          Designed for the way you actually write.
        </h2>
        <p className="max-w-[600px] text-[17px] text-ink-muted [text-wrap:pretty]">
          Capture fast. Find later. Read comfortably. No distracting toolbars, no AI suggestions
          creeping into your draft.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 min-[880px]:grid-cols-3">
          <Feature icon={<NotebookIcon />} title="Notebooks & tags">
            Group what belongs together, tag what cuts across. Both work without you having to
            choose one model up front.
          </Feature>
          <Feature icon={<SearchIcon />} title="Full-text search">
            Press ⌘K from anywhere. Ranked results across every note, every notebook, with the
            matched line highlighted.
          </Feature>
          <Feature icon={<CheckIcon />} title="Auto-save, always">
            Type and walk away. Changes save in the background; conflicts resolve by version, not
            by timestamp.
          </Feature>
          <Feature icon={<PinIcon />} title="Pin what matters">
            Float the notes you keep coming back to. Everything else stays sorted by when you last
            touched it.
          </Feature>
          <Feature icon={<ContrastIcon />} title="Three reading themes">
            Light for daytime, dark for late, sepia for long sessions. Switch to a serif body when
            you want to actually{' '}
            <em className="font-serif font-medium italic">read</em>.
          </Feature>
          <Feature icon={<TrashIcon />} title="Forgiving trash">
            Deletes go to trash, not the void. Restore within 30 days; export the whole archive as
            Markdown whenever you like.
          </Feature>
        </div>
      </section>

      {/* Pull quote */}
      <section className="mx-auto max-w-[880px] px-12 py-24 text-center">
        <div className="mb-3 font-serif text-[64px] leading-[0.5] text-iris">&ldquo;</div>
        <p className="mb-6 text-balance font-serif text-[clamp(24px,2.8vw,32px)] leading-[1.35] tracking-[-0.015em] text-ink">
          It&apos;s the first notes app where the design fades away and I can actually hear myself
          think.
        </p>
        <div className="text-[13.5px] text-ink-faint">— Mara O., designer &amp; long-form journaler</div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1280px] px-8 pb-24 pt-12 min-[880px]:px-12">
        <div className="grid grid-cols-1 items-center gap-10 rounded-3xl bg-ink px-8 py-10 text-paper min-[880px]:grid-cols-[1.4fr_1fr] min-[880px]:px-14 min-[880px]:py-16">
          <div>
            <h2 className="mb-3 text-balance text-[clamp(28px,4vw,40px)] font-bold leading-[1.1] tracking-[-0.025em]">
              Start a notebook in 30 seconds.
            </h2>
            <p className="text-[16px] opacity-70">
              Free forever. Bring your old notes — we import Markdown, Apple Notes, and Bear.
            </p>
          </div>
          <div className="flex justify-start gap-3 min-[880px]:justify-end">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-[10px] bg-paper px-[18px] py-2.5 text-[14px] font-semibold tracking-[-0.005em] text-ink transition hover:brightness-110 active:translate-y-px"
            >
              Create your account
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-[1280px] items-center gap-6 border-t border-paper-line px-12 py-8 text-[13px] text-ink-faint">
        <div>© 2026 Notable</div>
      </footer>
    </div>
  )
}

function Dot() {
  return <span className="h-[3px] w-[3px] rounded-full bg-ink-faint" />
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-paper-line bg-paper-surface p-6 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-paper-md">
      <div className="mb-4 grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-iris-soft text-iris-deep">
        {icon}
      </div>
      <h3 className="mb-1.5 text-[17px] font-[650] tracking-[-0.012em] text-ink">{title}</h3>
      <p className="text-[14.5px] leading-[1.55] text-ink-muted [text-wrap:pretty]">{children}</p>
    </div>
  )
}

function NoteCard({
  className = '',
  title,
  star,
  chips,
  children,
}: {
  className?: string
  title: string
  star?: boolean
  chips: { label: string; accent?: boolean }[]
  children: ReactNode
}) {
  return (
    <article
      className={`absolute w-[360px] rounded-[18px] border border-paper-line bg-paper-surface px-6 py-[22px] shadow-paper-lg ${className}`}
    >
      {star && (
        <StarIcon className="absolute right-5 top-[18px] text-rating" />
      )}
      <h4 className="mb-2.5 text-[17px] font-[650] tracking-[-0.012em] text-ink">{title}</h4>
      <div className="mb-3.5 flex gap-1.5 text-[11px]">
        {chips.map((c) => (
          <span
            key={c.label}
            className={
              c.accent
                ? 'rounded-full bg-iris-soft px-[9px] py-[2px] font-medium text-iris-deep'
                : 'rounded-full bg-paper-soft px-[9px] py-[2px] font-medium text-ink-muted'
            }
          >
            {c.label}
          </span>
        ))}
      </div>
      <p className="text-[14px] leading-[1.6] text-ink-muted">{children}</p>
    </article>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6L12 16.7l-5.3 2.8 1-6L3.4 9.3l6-.9L12 3Z" />
    </svg>
  )
}

function NotebookIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5Z" />
      <path d="M4 19.5V21h16" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 17v5" />
      <path d="M9 4h6l-1 5 3 3v3H7v-3l3-3-1-5Z" />
    </svg>
  )
}

function ContrastIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    </svg>
  )
}
