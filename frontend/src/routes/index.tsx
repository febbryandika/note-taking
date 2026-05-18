import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { BookOpen, Search, Tag } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (data?.session) throw redirect({ to: '/notes' })
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Take notes. Stay organized.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          A simple, fast note-taking app with notebooks, tags, and search. Capture your thoughts and find them later.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/register"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Feature
          icon={<BookOpen className="h-5 w-5" />}
          title="Notebooks"
          body="Group related notes into notebooks so they're easy to find."
        />
        <Feature
          icon={<Tag className="h-5 w-5" />}
          title="Tags"
          body="Add tags to any note and filter your list by them."
        />
        <Feature
          icon={<Search className="h-5 w-5" />}
          title="Search"
          body="Full-text search across every note you've written."
        />
      </div>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="space-y-2 rounded-md border border-border p-4">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  )
}
