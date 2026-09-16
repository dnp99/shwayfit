import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { DesktopSidebar, DesktopUtilityBar, MobileBottomNav, MobileHeader } from './AppNavigation'
import { getFirebaseAuth, restoreFirebaseAuthSession } from '../../lib/firebase'
import { TrainerWorkspace } from '../clients/TrainerWorkspace'
import { PackageOptions } from '../packages/PackageOptions'
import { CalendarPage } from '../schedule/CalendarPage'

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
          ? <CalendarPage />
          : <FutureArea title="Settings" description="Trainer and organization preferences will follow the core workflow." />

  return <main className="min-h-screen bg-background text-foreground lg:flex"><DesktopSidebar email={user.email ?? ''} /><div className="min-w-0 flex-1"><DesktopUtilityBar /><MobileHeader /><div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-10 lg:py-10 lg:pb-10">{content}</div></div><MobileBottomNav /></main>
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
