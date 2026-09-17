import { useMemo, useState } from 'react'
import { LogOut, MonitorOff, UserRound } from 'lucide-react'
import { api } from '../../lib/api'
import { contactErrors, formatPhone, type TrainerProfile } from '../../lib/trainer-profile'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function Settings({ onProfileUpdated, onSignOut, onSignOutEverywhere, profile }: { onProfileUpdated: (profile: TrainerProfile) => void; onSignOut: () => Promise<void>; onSignOutEverywhere: () => Promise<void>; profile: TrainerProfile }) {
  const [draft, setDraft] = useState(profile)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errors = useMemo(() => contactErrors(draft), [draft])
  const isDirty = draft.phone !== profile.phone
  const canSave = isDirty && Object.keys(errors).length === 0

  async function saveProfile() {
    if (!canSave) return
    try {
      setIsSaving(true)
      setError(null)
      const saved = await api('/api/v1/organizations/current/trainer-profile', { method: 'PATCH', body: JSON.stringify({ phone: draft.phone.trim() }) }) as TrainerProfile
      setDraft(saved)
      onProfileUpdated(saved)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ShwayFit could not save your profile.')
    } finally { setIsSaving(false) }
  }

  async function signOutEverywhere() {
    try {
      setIsSigningOut(true)
      setError(null)
      await onSignOutEverywhere()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ShwayFit could not sign out every device.')
      setIsSigningOut(false)
      setIsConfirmOpen(false)
    }
  }

  return <section className="mx-auto max-w-3xl" aria-labelledby="settings-heading"><header><p className="text-sm font-medium text-primary">Trainer workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl" id="settings-heading">Settings</h1><p className="mt-2 text-muted-foreground">Manage your trainer profile, workspace preferences, and session security.</p></header>
    <Card className="mt-8"><CardContent className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary"><UserRound className="size-5" aria-hidden="true" /></span><div><h2 className="text-xl font-semibold tracking-tight">Trainer profile</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Name and email come from the Google account used to sign in.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">Name <span className="text-xs font-normal text-muted-foreground">Google account</span><Input autoComplete="name" disabled value={draft.name} /></Label><Label className="grid gap-2">Email <span className="text-xs font-normal text-muted-foreground">Google sign-in account</span><Input autoComplete="email" disabled type="email" value={draft.email} /></Label><Label className="grid gap-2 sm:col-span-2">Phone <span className="text-xs font-normal text-muted-foreground">optional</span><Input aria-describedby={errors.phone ? 'trainer-phone-error' : undefined} aria-invalid={Boolean(errors.phone)} autoComplete="tel" inputMode="numeric" maxLength={18} onChange={(event) => setDraft((current) => ({ ...current, phone: formatPhone(event.target.value) }))} pattern="[0-9() -]*" placeholder="(416) 555-0123" type="text" value={draft.phone} />{errors.phone && <span className="text-sm font-normal text-destructive" id="trainer-phone-error">{errors.phone}</span>}</Label></div><p className="mt-5 text-sm leading-6 text-muted-foreground">Update your name or email in your Google account; ShwayFit only stores your phone number.</p>{isDirty && <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end"><Button className="min-h-11" disabled={isSaving} onClick={() => setDraft(profile)} type="button" variant="outline">Cancel</Button><Button className="min-h-11" disabled={!canSave || isSaving} onClick={() => void saveProfile()} type="button">{isSaving ? 'Saving…' : 'Save changes'}</Button></div>}{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}</CardContent></Card>
    <Card className="mt-6"><CardContent className="p-5 sm:p-6"><h2 className="text-xl font-semibold tracking-tight">Session security</h2><p className="mt-2 max-w-xl leading-7 text-muted-foreground">For your protection, ShwayFit signs you out 24 hours after you sign in. Shared-device sessions also end when the browser closes.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Button className="min-h-11" onClick={() => void onSignOut()} type="button" variant="outline"><LogOut aria-hidden="true" className="size-4" />Sign out</Button><Button className="min-h-11" onClick={() => setIsConfirmOpen(true)} type="button" variant="outline"><MonitorOff aria-hidden="true" className="size-4" />Sign out all devices</Button></div></CardContent></Card><Dialog onOpenChange={setIsConfirmOpen} open={isConfirmOpen}><DialogContent><DialogHeader><DialogTitle>Sign out all devices?</DialogTitle><DialogDescription>This ends every ShwayFit session for this account, including this one. You will need to sign in again.</DialogDescription></DialogHeader><DialogFooter><Button disabled={isSigningOut} onClick={() => setIsConfirmOpen(false)} type="button" variant="outline">Cancel</Button><Button disabled={isSigningOut} onClick={() => void signOutEverywhere()} type="button" variant="destructive">{isSigningOut ? 'Signing out…' : 'Sign out all devices'}</Button></DialogFooter></DialogContent></Dialog></section>
}
