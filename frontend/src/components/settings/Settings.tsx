import { useState } from 'react'
import { LogOut, MonitorOff } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'

export function Settings({ onSignOut, onSignOutEverywhere }: { onSignOut: () => Promise<void>; onSignOutEverywhere: () => Promise<void> }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return <section className="mx-auto max-w-3xl" aria-labelledby="settings-heading"><header><p className="text-sm font-medium text-primary">Trainer workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl" id="settings-heading">Settings</h1><p className="mt-2 text-muted-foreground">Manage your workspace preferences and session security.</p></header><Card className="mt-8"><CardContent className="p-5 sm:p-6"><h2 className="text-xl font-semibold tracking-tight">Session security</h2><p className="mt-2 max-w-xl leading-7 text-muted-foreground">For your protection, ShwayFit signs you out 24 hours after you sign in. Shared-device sessions also end when the browser closes.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Button className="min-h-11" onClick={() => void onSignOut()} type="button" variant="outline"><LogOut aria-hidden="true" className="size-4" />Sign out</Button><Button className="min-h-11" onClick={() => setIsConfirmOpen(true)} type="button" variant="outline"><MonitorOff aria-hidden="true" className="size-4" />Sign out all devices</Button></div>{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}</CardContent></Card><Dialog onOpenChange={setIsConfirmOpen} open={isConfirmOpen}><DialogContent><DialogHeader><DialogTitle>Sign out all devices?</DialogTitle><DialogDescription>This ends every ShwayFit session for this account, including this one. You will need to sign in again.</DialogDescription></DialogHeader><DialogFooter><Button disabled={isSigningOut} onClick={() => setIsConfirmOpen(false)} type="button" variant="outline">Cancel</Button><Button disabled={isSigningOut} onClick={() => void signOutEverywhere()} type="button" variant="destructive">{isSigningOut ? 'Signing out…' : 'Sign out all devices'}</Button></DialogFooter></DialogContent></Dialog></section>
}
