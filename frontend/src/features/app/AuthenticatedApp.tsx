import { onAuthStateChanged, type User } from 'firebase/auth'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { DesktopSidebar, DesktopUtilityBar, MobileBottomNav, MobileHeader } from './AppNavigation'
import { api } from '../../lib/api'
import { beginFirebaseAuthSession, endFirebaseAuthSession, getFirebaseAuth, restoreFirebaseAuthSession } from '../../lib/firebase'
import { Dashboard } from '../../components/dashboard/Dashboard'
import { Calendar } from '../../components/calendar/Calendar'
import { Clients } from '../../components/clients/Clients'
import { Packages } from '../../components/packages/Packages'
import { SessionExpiryGuard } from '../../components/auth/SessionExpiryGuard'
import { Settings } from '../../components/settings/Settings'
import type { TrainerProfile } from '../../lib/trainer-profile'

function ApplicationShell({ user, onSignOut, onSignOutEverywhere }: { user: User; onSignOut: () => Promise<void>; onSignOutEverywhere: () => Promise<void> }) {
  const { pathname, search } = useLocation()
  const [profile, setProfile] = useState<TrainerProfile>({ name: user.displayName ?? '', email: user.email ?? '', phone: '' })
  const area = pathname.split('/')[1]

  useEffect(() => {
    let current = true
    void api('/api/v1/organizations/current/trainer-profile').then((result) => {
      if (current) {
        const stored = result as TrainerProfile
        setProfile({ ...stored, name: stored.name || user.displayName || '' })
      }
    }).catch(() => undefined)
    return () => { current = false }
  }, [user.displayName, user.email, user.uid])

  const content = area === 'clients'
    ? <Clients key={`${pathname}${search}`} email={user.email ?? ''} />
    : area === 'home'
      ? <Dashboard trainerName={profile.name} />
      : area === 'packages'
        ? <Packages />
        : area === 'schedule'
          ? <Calendar />
          : <Settings key={`${profile.name}-${profile.email}-${profile.phone}`} onProfileUpdated={setProfile} onSignOut={onSignOut} onSignOutEverywhere={onSignOutEverywhere} profile={profile} />

  return <main className="min-h-screen bg-background text-foreground lg:flex"><DesktopSidebar email={profile.email} name={profile.name} onSignOut={onSignOut} /><div className="min-w-0 flex-1"><DesktopUtilityBar trainerName={profile.name} /><MobileHeader onSignOut={onSignOut} /><div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-10 lg:py-10 lg:pb-10">{content}</div></div><MobileBottomNav /></main>
}

export function AuthenticatedApp() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const signOut = useCallback(async () => {
    await endFirebaseAuthSession()
  }, [])
  const signOutEverywhere = useCallback(async () => {
    await api('/api/v1/session/revoke', { method: 'POST' })
    await endFirebaseAuthSession()
  }, [])
  useEffect(() => {
    let unsubscribe = () => {}
    void restoreFirebaseAuthSession().catch(() => undefined).then(() => { unsubscribe = onAuthStateChanged(getFirebaseAuth(), (currentUser) => { if (currentUser) beginFirebaseAuthSession(); setUser(currentUser) }) })
    return () => unsubscribe()
  }, [])
  if (user === undefined) return <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">Checking your sign-in…</main>
  if (!user) return <Navigate to="/sign-in" replace />
  return <><SessionExpiryGuard onExpired={signOut} /><ApplicationShell onSignOut={signOut} onSignOutEverywhere={signOutEverywhere} user={user} /></>
}
