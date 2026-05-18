import { createRootRouteWithContext, Link, Outlet, useRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { signOut, useSession } from '@/lib/auth-client'
import { ToastProvider } from '@/components/ui/Toast'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  async function handleSignOut() {
    await signOut()
    router.navigate({ to: '/' })
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <nav className="border-b px-6 py-3 flex items-center gap-4">
          <Link to="/" className="text-2xl font-bold tracking-tight text-foreground hover:text-primary">
            Notes
          </Link>

          <div className="ml-auto flex items-center gap-4 text-sm">
            {isPending ? null : session ? (
              <>
                <span className="text-muted-foreground">{session.user.email}</span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-muted-foreground hover:text-foreground">
                  Login
                </Link>
                <Link to="/register" className="text-muted-foreground hover:text-foreground">
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
        <main className="container mx-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
