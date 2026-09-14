import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { PackageCheck, PackagePlus } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { api } from '../../lib/api'

type PackageOption = { id: string; name: string; includedSessions: number; status: 'active' | 'archived' }
type ClientPackage = { id: string; packageOptionId: string; packageName: string; includedSessions: number; remainingSessions: number; status: 'active' | 'completed' }

export function ClientPackagePanel({ clientID, clientName }: { clientID: string; clientName: string }) {
  const [options, setOptions] = useState<PackageOption[]>([])
  const [packages, setPackages] = useState<ClientPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([
      api('/api/v1/organizations/current/package-options') as Promise<{ packageOptions: PackageOption[] }>,
      api(`/api/v1/organizations/current/clients/${clientID}/packages`) as Promise<{ packages: ClientPackage[] }>,
    ]).then(([optionResult, packageResult]) => {
      setOptions(optionResult.packageOptions)
      setPackages(packageResult.packages)
    }).catch((caught) => setError(caught instanceof Error ? caught.message : 'ShwayFit could not load client packages.')).finally(() => setIsLoading(false))
  }, [clientID])

  async function assignPackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      setIsSaving(true)
      setError(null)
      const clientPackage = await api(`/api/v1/organizations/current/clients/${clientID}/packages`, { method: 'POST', body: JSON.stringify({ packageOptionId: data.get('packageOptionId') }) }) as ClientPackage
      setPackages((current) => [clientPackage, ...current])
      setIsOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ShwayFit could not assign this package.')
    } finally {
      setIsSaving(false)
    }
  }

  const activePackage = packages.find((item) => item.status === 'active')
  const activeOptions = options.filter((option) => option.status === 'active')

  return <Card aria-labelledby="client-package-heading">
    <CardHeader><div><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">CLIENT PACKAGE</p><h2 id="client-package-heading" className="mt-1 text-xl font-semibold tracking-tight">Session balance</h2></div>{!activePackage && activeOptions.length > 0 && <AssignPackageDialog clientName={clientName} isOpen={isOpen} onOpenChange={setIsOpen} isSaving={isSaving} options={activeOptions} onSubmit={assignPackage} />}</CardHeader>
    <CardContent>
      {error && <p className="mb-3 text-sm text-destructive" role="alert">{error}</p>}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading package balance…</p>
        : activePackage ? <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4"><span className="grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground"><PackageCheck className="size-5" aria-hidden="true" /></span><div><p className="font-semibold">{activePackage.packageName}</p><p className="mt-1 text-sm text-muted-foreground">{activePackage.remainingSessions} of {activePackage.includedSessions} sessions remaining</p></div></div>
          : activeOptions.length === 0 ? <p className="text-sm leading-6 text-muted-foreground">Create a package option before assigning a balance to {clientName}. <a className="font-medium text-primary underline-offset-4 hover:underline" href="/packages">Go to packages</a>.</p>
            : <p className="text-sm leading-6 text-muted-foreground">No active package. Assign one option to open {clientName}’s starting balance.</p>}
      {packages.some((item) => item.status !== 'active') && <p className="mt-3 text-xs text-muted-foreground">{packages.filter((item) => item.status !== 'active').length} historical package{packages.filter((item) => item.status !== 'active').length === 1 ? '' : 's'} retained.</p>}
    </CardContent>
  </Card>
}

function AssignPackageDialog({ clientName, isOpen, onOpenChange, isSaving, options, onSubmit }: { clientName: string; isOpen: boolean; onOpenChange: (open: boolean) => void; isSaving: boolean; options: PackageOption[]; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogTrigger asChild><Button type="button" size="sm"><PackagePlus className="size-4" aria-hidden="true" />Assign package</Button></DialogTrigger><DialogContent><DialogHeader><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">OPENING BALANCE</p><DialogTitle>Assign a package</DialogTitle><DialogDescription>Choose one active option for {clientName}. The selected allowance becomes this client’s starting balance.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}><Label>Package option<select className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring" defaultValue="" name="packageOptionId" required><option disabled value="">Choose a package</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.includedSessions} {option.includedSessions === 1 ? 'session' : 'sessions'}</option>)}</select></Label><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button disabled={isSaving} type="submit">{isSaving ? 'Assigning…' : 'Assign package'}</Button></DialogFooter></form></DialogContent></Dialog>
}
