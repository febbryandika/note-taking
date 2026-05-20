import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  AuthBrandPanel,
  BackToLanding,
  BrandMobile,
  GoogleButton,
  authDivider,
  authFormPanel,
  authFormWrap,
  authInput,
  authShell,
  authSubmit,
} from '@/components/auth/AuthShell'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/register')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (data?.session) throw redirect({ to: '/notes' })
  },
  component: RegisterPage,
})

function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signUpError } = await authClient.signUp.email({ email, password, name })
    if (signUpError) {
      setError(signUpError.message ?? 'Sign up failed')
      setLoading(false)
      return
    }

    router.navigate({ to: '/notes' })
  }

  return (
    <main className={authShell}>
      <AuthBrandPanel
        heading="A quiet place for what you're thinking."
        subheading="Free forever. No credit card. Bring your old notes from Markdown, Apple Notes, or Bear."
        card={{
          title: 'Reading: A Pattern Language',
          chips: [
            { label: 'Reading list', accent: true },
            { label: '#research' },
            { label: '#idea' },
          ],
          body: (
            <>
              Patterns aren&apos;t templates. A template is a finished form you copy; a pattern is
              a{' '}
              <b className="font-semibold text-ink">
                relationship between a problem and a family of solutions
              </b>
              …
            </>
          ),
        }}
      />

      <section className={authFormPanel}>
        <div className={authFormWrap}>
          <BrandMobile />
          <BackToLanding />

          <h1 className="mb-2 text-[30px] font-bold tracking-[-0.025em] text-ink">
            Create your account
          </h1>
          <p className="mb-8 text-[14.5px] text-ink-muted">
            Already have one?{' '}
            <Link
              to="/login"
              className="border-b-[1.5px] border-iris pb-px font-semibold text-ink"
            >
              Sign in
            </Link>
          </p>

          <GoogleButton />

          <div className={authDivider}>or with email</div>

          <form onSubmit={handleSubmit}>
            <div className="mb-[18px] flex flex-col gap-1.5">
              <label htmlFor="name" className="text-[13px] font-medium text-ink">
                Your name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Mara Okonkwo"
                className={authInput}
              />
            </div>

            <div className="mb-[18px] flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[13px] font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@studio.co"
                className={authInput}
              />
            </div>

            <div className="mb-[18px] flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[13px] font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={authInput}
                minLength={8}
              />
              <span className="mt-0.5 text-[12px] text-ink-faint">
                8+ characters, at least one number.
              </span>
            </div>

            <label className="mb-[18px] flex items-center gap-2.5 text-[13px] text-ink-muted">
              <input type="checkbox" required className="h-4 w-4 accent-iris" />
              <span>
                I agree to the{' '}
                <a href="#" className="text-ink underline underline-offset-2">
                  Terms
                </a>{' '}
                and{' '}
                <a href="#" className="text-ink underline underline-offset-2">
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            {error && <p className="mb-3 text-[13px] text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className={authSubmit}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
