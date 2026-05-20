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

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (data?.session) throw redirect({ to: '/notes' })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await authClient.signIn.email({ email, password })
    if (signInError) {
      setError(signInError.message ?? 'Sign in failed')
      setLoading(false)
      return
    }

    router.navigate({ to: '/notes' })
  }

  return (
    <main className={authShell}>
      <AuthBrandPanel
        heading="Pick up where you left off."
        subheading="Your notebooks, tags, and pinned drafts are waiting — exactly the way you saved them."
        card={{
          title: 'Talk prep — "Designing in plain text"',
          chips: [
            { label: 'Work', accent: true },
            { label: '#draft' },
            { label: '#idea' },
          ],
          body: (
            <>
              Working title, will probably change.{' '}
              <b className="font-semibold text-ink">Thesis:</b> the smallest useful unit of design
              work is the decision, not the screen…
            </>
          ),
        }}
      />

      <section className={authFormPanel}>
        <div className={authFormWrap}>
          <BrandMobile />
          <BackToLanding />

          <h1 className="mb-2 text-[30px] font-bold tracking-[-0.025em] text-ink">Welcome back</h1>
          <p className="mb-8 text-[14.5px] text-ink-muted">
            New here?{' '}
            <Link
              to="/register"
              className="border-b-[1.5px] border-iris pb-px font-semibold text-ink"
            >
              Create an account
            </Link>
          </p>

          <GoogleButton />

          <div className={authDivider}>or with email</div>

          <form onSubmit={handleSubmit}>
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
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="text-[13px] font-medium text-ink">
                  Password
                </label>
                <a
                  href="#"
                  className="text-[12.5px] text-ink-muted transition-colors hover:text-iris"
                >
                  Forgot?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={authInput}
              />
            </div>

            <label className="mb-[18px] flex items-center gap-2.5 text-[13px] text-ink-muted">
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-iris" />
              Keep me signed in for 30 days
            </label>

            {error && <p className="mb-3 text-[13px] text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className={authSubmit}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
