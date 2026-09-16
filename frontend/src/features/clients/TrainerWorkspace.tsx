import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { ClientDirectory } from './ClientDirectory'
import { ClientPackagePanel } from '../packages/ClientPackagePanel'

type Organization = { id: string; displayName: string }
type Client = { id: string; firstName: string; lastName: string; email?: string; phone?: string; goals?: string; notes?: string; preferredStartTime?: string; preferredEndTime?: string; status: 'active' | 'archived' }
type ClientInput = Omit<Client, 'id'>

const emptyClient: ClientInput = { firstName: '', lastName: '', email: '', phone: '', goals: '', notes: '', preferredStartTime: '', preferredEndTime: '', status: 'active' }
// The shell owns this label on desktop; the page keeps it on mobile where the
// desktop utility bar is intentionally hidden.
const workspaceEyebrowClass = 'text-xs font-semibold tracking-[0.175em] text-secondary-foreground lg:hidden'

function clientInitials(client: Pick<Client, 'firstName' | 'lastName'>) {
  return `${client.firstName.slice(0, 1)}${client.lastName.slice(0, 1)}`.toUpperCase()
}

export function TrainerWorkspace({ email }: { email: string }) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadWorkspace() {
	try {
      const current = await api('/api/v1/organizations/current') as Organization
      const result = await api('/api/v1/organizations/current/clients') as { clients: Client[] }
      setOrganization(current)
      setClients(result.clients)
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'No active organization is available') setOrganization(null)
      else setError(caught instanceof Error ? caught.message : 'ShwayFit could not load your workspace.')
    } finally { setIsLoading(false) }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorkspace() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      setError(null)
      await api('/api/v1/organizations', { method: 'POST', body: JSON.stringify({ displayName: data.get('displayName') }) })
      await loadWorkspace()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'ShwayFit could not create your organization.') }
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // React clears currentTarget after an awaited operation. Keep the form so a
    // successful new-client submission can reset it without reporting an error.
    const form = event.currentTarget
    const data = new FormData(form)
    const input: ClientInput = {
      firstName: String(data.get('firstName') ?? ''), lastName: String(data.get('lastName') ?? ''), email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''), goals: String(data.get('goals') ?? ''), notes: String(data.get('notes') ?? ''),
      preferredStartTime: String(data.get('preferredStartTime') ?? ''), preferredEndTime: String(data.get('preferredEndTime') ?? ''), status: String(data.get('status') ?? 'active') as ClientInput['status'],
    }
    if ((input.preferredStartTime || input.preferredEndTime) && (!input.preferredStartTime || !input.preferredEndTime || input.preferredStartTime >= input.preferredEndTime)) {
      setError('Enter both preferred times, with an end time after the start time.')
      return
    }
    try {
      setError(null)
      const path = selectedClient ? `/api/v1/organizations/current/clients/${selectedClient.id}` : '/api/v1/organizations/current/clients'
      const client = await api(path, { method: selectedClient ? 'PATCH' : 'POST', body: JSON.stringify(input) }) as Client
      setClients((current) => selectedClient ? current.map((item) => item.id === client.id ? client : item) : [...current, client].sort((a, b) => a.lastName.localeCompare(b.lastName)))
      setIsEditorOpen(false)
      setSelectedClient(null)
      form.reset()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'ShwayFit could not save this client.') }
  }

  if (isLoading) return <section className="flex min-h-screen items-center justify-center bg-background p-5 text-muted-foreground"><p>Preparing your workspace…</p></section>
  if (!organization) return <OrganizationSetup email={email} error={error} onSubmit={createOrganization} />
  return <section className="text-foreground">
    {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
    <ClientDirectory clients={clients} selectedClientID={selectedClient?.id} onAdd={() => { setError(null); setSelectedClient(null); setIsEditorOpen(true) }} onSelect={(clientID) => { setError(null); setSelectedClient(clients.find((client) => client.id === clientID) ?? null); setIsEditorOpen(true) }} />
    <ClientEditorDialog client={selectedClient} error={error} isOpen={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setSelectedClient(null) }} onSubmit={saveClient} />
  </section>
}

function ClientEditorDialog({ client, error, isOpen, onOpenChange, onSubmit }: { client: Client | null; error: string | null; isOpen: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  const formValues = client ?? emptyClient
  const isEditing = Boolean(client)

  return <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="grid h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl p-0 sm:h-auto sm:max-h-[min(90dvh,52rem)] sm:w-[calc(100%-2rem)] sm:max-w-[52rem] sm:rounded-2xl">
      <DialogHeader className="border-b border-border px-4 py-4 pr-14 sm:px-6 sm:py-5">
        <DialogClose asChild><Button className="-ml-2 min-h-11 w-fit px-2 text-foreground hover:bg-accent active:bg-accent" type="button" variant="ghost"><ChevronLeft className="size-4 text-primary" aria-hidden="true" />Back to clients</Button></DialogClose>
        {client ? <div className="flex items-center gap-3 pt-1"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground" aria-hidden="true">{clientInitials(client)}</span><div className="min-w-0"><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">CLIENT DETAILS</p><div className="mt-1 flex flex-wrap items-center gap-2"><DialogTitle>{client.firstName} {client.lastName}</DialogTitle><span className={client.status === 'active' ? 'rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success' : 'rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'}>{client.status === 'active' ? 'Active' : 'Archived'}</span></div><DialogDescription className="mt-1 truncate">{client.goals || 'No training goals yet'}</DialogDescription></div></div> : <div className="pt-1"><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">CLIENT DETAILS</p><DialogTitle className="mt-1">Add a client</DialogTitle><DialogDescription className="mt-1">Add the details you need to begin managing this client.</DialogDescription></div>}
      </DialogHeader>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
        <form id="client-editor-form" className="grid gap-6" key={client?.id ?? 'new'} onSubmit={(event) => void onSubmit(event)}>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
          <section className="grid gap-4" aria-labelledby="client-profile-heading">
            <div><h2 id="client-profile-heading" className="text-base font-semibold">Profile</h2><p className="mt-1 text-sm text-muted-foreground">Contact information and training context.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label className="grid gap-2">First name<Input required maxLength={80} name="firstName" defaultValue={formValues.firstName} /></Label>
              <Label className="grid gap-2">Last name<Input required maxLength={80} name="lastName" defaultValue={formValues.lastName} /></Label>
              <Label className="grid gap-2">Email <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="email" maxLength={254} name="email" defaultValue={formValues.email} /></Label>
              <Label className="grid gap-2">Phone <span className="text-xs font-normal text-muted-foreground">optional</span><Input maxLength={40} name="phone" defaultValue={formValues.phone} /></Label>
            </div>
          </section>
          <section className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:p-5" aria-labelledby="scheduling-preference-heading">
            <div><h2 id="scheduling-preference-heading" className="text-base font-semibold">Scheduling preference</h2><p className="mt-1 text-sm text-muted-foreground">A preferred time window helps with planning. It does not book a session.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label className="grid gap-2">Preferred start <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="time" name="preferredStartTime" defaultValue={formValues.preferredStartTime} /></Label>
              <Label className="grid gap-2">Preferred end <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="time" name="preferredEndTime" defaultValue={formValues.preferredEndTime} /></Label>
            </div>
          </section>
          <section className="grid gap-4" aria-labelledby="training-context-heading">
            <h2 id="training-context-heading" className="text-base font-semibold">Training context</h2>
            <Label className="grid gap-2">Training goals <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={2000} name="goals" defaultValue={formValues.goals} /></Label>
            <Label className="grid gap-2">Private notes <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={4000} name="notes" defaultValue={formValues.notes} /></Label>
            <Label className="grid max-w-52 gap-2">Client status<select className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring" name="status" defaultValue={formValues.status}><option value="active">Active</option><option value="archived">Archived</option></select></Label>
          </section>
        </form>
        {client && <ClientPackagePanel clientID={client.id} clientName={`${client.firstName} ${client.lastName}`} />}
      </div>
      <footer className="flex flex-col-reverse gap-2 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:py-4">
        <DialogClose asChild><Button className="min-h-11 w-full sm:w-auto" type="button" variant="outline">Cancel</Button></DialogClose>
        <Button className="min-h-11 w-full sm:w-auto" form="client-editor-form" type="submit">{isEditing ? 'Save changes' : 'Add client'}</Button>
      </footer>
    </DialogContent>
  </Dialog>
}

function OrganizationSetup({ email, error, onSubmit }: { email: string; error: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="text-foreground"><Card className="mx-auto mt-16 max-w-lg"><CardContent className="p-8"><p className={workspaceEyebrowClass}>TRAINER WORKSPACE</p><h1 className="mt-3 text-4xl font-semibold leading-none tracking-tight">Set up your training business</h1><p className="mt-4 leading-7 text-muted-foreground">You are signed in as <strong>{email}</strong>. Create your organization to start managing client records.</p><form className="mt-6 grid gap-4" onSubmit={onSubmit}><Label>Business name<Input name="displayName" required minLength={2} maxLength={80} autoComplete="organization" placeholder="Your training business" /></Label><Button className="justify-between sm:w-fit" type="submit">Create workspace <span aria-hidden="true">→</span></Button></form>{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}</CardContent></Card></section>
}
