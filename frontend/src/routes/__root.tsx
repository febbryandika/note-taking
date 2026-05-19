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
        <nav className="flex items-center gap-4 border-b px-4 py-3 sm:px-6">
          <Link to="/" className="text-2xl font-bold tracking-tight text-foreground hover:text-primary">
            Notes
          </Link>

          <div className="ml-auto flex items-center gap-4 text-sm">
            {isPending ? null : session ? (
              <>
                <span className="hidden max-w-[16rem] truncate text-muted-foreground sm:inline">
                  {session.user.email}
                </span>
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
        <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
