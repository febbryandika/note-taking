import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type Chip = { label: string; accent?: boolean }

export type AuthBrandCard = {
  title: string
  chips: Chip[]
  body: ReactNode
}

export function AuthBrandPanel({
  heading,
  subheading,
  card,
}: {
  heading: string
  subheading: string
  card: AuthBrandCard
}) {
  return (
    <aside className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-paper-soft via-paper to-paper px-12 pb-12 pt-8 min-[880px]:flex">
      <Link to="/" className="z-10 flex items-center gap-2.5">
        <BrandMark />
        <div className="text-[17px] font-semibold tracking-[-0.015em] text-ink">Notable</div>
      </Link>

      <div className="relative z-10 mt-auto">
        <h2 className="mb-3.5 text-balance text-[clamp(32px,3.4vw,44px)] font-bold leading-[1.1] tracking-[-0.03em] text-ink">
          {heading}
        </h2>
        <p className="mb-8 max-w-[460px] text-[16px] text-ink-muted [text-wrap:pretty]">
          {subheading}
        </p>

        <div className="max-w-[380px] rounded-2xl border border-paper-line bg-paper-surface px-5 py-4 shadow-paper-md">
          <h4 className="mb-2 text-[15px] font-[650] tracking-[-0.01em] text-ink">{card.title}</h4>
          <div className="mb-2.5 flex gap-1.5 text-[11px]">
            {card.chips.map((c) => (
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
          <p className="text-[13.5px] leading-[1.55] text-ink-muted">{card.body}</p>
        </div>
      </div>

      <div
        className="pointer-events-none absolute -bottom-[30%] -right-[10%] z-0 aspect-square w-[60%] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, transparent 65%)',
        }}
      />
    </aside>
  )
}

export function BrandMark() {
  return (
    <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-ink text-[14px] font-bold tracking-[-0.02em] text-paper">
      N
    </div>
  )
}

export function BrandMobile() {
  return (
    <Link to="/" className="mb-7 flex items-center gap-2.5 min-[880px]:hidden">
      <BrandMark />
      <div className="text-[17px] font-semibold tracking-[-0.015em] text-ink">Notable</div>
    </Link>
  )
}

export function BackToLanding() {
  return (
    <Link
      to="/"
      className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink"
    >
      <BackIcon />
      Back
    </Link>
  )
}

function BackIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  )
}

export function GoogleButton({ disabled = true }: { disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? 'Google sign-in coming soon' : undefined}
      className="mb-2.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-paper-line-strong bg-paper px-3.5 py-2.5 text-[14px] font-medium text-ink transition hover:bg-paper-soft disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-paper"
    >
      <GoogleIcon />
      Continue with Google
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

export const authShell = 'grid min-h-screen grid-cols-1 bg-paper font-display text-ink min-[880px]:grid-cols-[1.05fr_1fr]'
export const authFormPanel = 'flex items-center justify-center bg-paper-surface p-8'
export const authFormWrap = 'w-full max-w-[380px]'
export const authInput =
  'w-full rounded-[10px] border border-paper-line-strong bg-paper px-3.5 py-2.5 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-iris focus:outline-none focus:ring-4 focus:ring-iris-soft'
export const authSubmit =
  'mt-2 w-full rounded-[10px] bg-ink px-[18px] py-3 text-[14.5px] font-semibold tracking-[-0.005em] text-paper transition hover:brightness-110 active:translate-y-px disabled:opacity-60'
export const authDivider =
  "my-6 flex items-center gap-3 text-[12px] text-ink-faint before:h-px before:flex-1 before:bg-paper-line before:content-[''] after:h-px after:flex-1 after:bg-paper-line after:content-['']"
