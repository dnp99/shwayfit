import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { NavLink, Navigate, useLocation } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { getFirebaseAuth, restoreFirebaseAuthSession } from '../../lib/firebase'
import { TrainerWorkspace } from '../clients/TrainerWorkspace'
import { PackageOptions } from '../packages/PackageOptions'

const areas = [['/home', 'Home'], ['/clients', 'Clients'], ['/packages', 'Packages'], ['/schedule', 'Schedule'], ['/settings', 'Settings']] as const

function FutureArea({ title, description }: { title: string; description: string }) {
  return <section className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 text-card-foreground"><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">{title.toUpperCase()}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-3 leading-7 text-muted-foreground">{description}</p></section>
}

function ApplicationShell({ user }: { user: User }) {
  const { pathname } = useLocation()
  const area = pathname.split('/')[1]
  const content = area === 'clients'
    ? <TrainerWorkspace email={user.email ?? ''} />
    : area === 'home'
      ? <FutureArea title="Home" description="Your trainer overview will bring upcoming sessions, package balances, and quick actions together after packages and scheduling are in place." />
      : area === 'packages'
        ? <PackageOptions />
        : area === 'schedule'
          ? <FutureArea title="Schedule" description="Appointments will be added once client packages provide the balance and audit foundation." />
          : <FutureArea title="Settings" description="Trainer and organization preferences will follow the core workflow." />

  return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6"><a className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight" href="/home"><span className="grid size-8 place-items-center rounded-lg bg-primary text-brand-lime" aria-hidden="true">s</span>ShwayFit</a><ThemeToggle /></div><nav className="mx-auto grid max-w-7xl grid-cols-5 gap-1 px-3 pb-3 sm:px-6" aria-label="Product navigation">{areas.map(([to, label]) => <NavLink className={({ isActive }) => `flex min-h-11 items-center justify-center rounded-lg px-2 text-center text-xs font-medium transition-colors ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} key={to} to={to}>{label}</NavLink>)}</nav></header><div className="px-5 py-6 sm:px-10 lg:px-20">{content}</div></main>
}

export function AuthenticatedApp() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => {
    let unsubscribe = () => {}
    void restoreFirebaseAuthSession().catch(() => undefined).then(() => { unsubscribe = onAuthStateChanged(getFirebaseAuth(), setUser) })
    return () => unsubscribe()
  }, [])
  if (user === undefined) return <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">Checking your sign-in…</main>
  if (!user) return <Navigate to="/sign-in" replace />
  return <ApplicationShell user={user} />
}
