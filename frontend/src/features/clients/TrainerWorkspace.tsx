import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
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
    <ClientDirectory clients={clients} selectedClientID={selectedClient?.id} onAdd={() => { setSelectedClient(null); setIsEditorOpen(true) }} onSelect={(clientID) => { setSelectedClient(clients.find((client) => client.id === clientID) ?? null); setIsEditorOpen(true) }} />
    <ClientEditorDialog client={selectedClient} isOpen={isEditorOpen} onOpenChange={setIsEditorOpen} onSubmit={saveClient} />
  </section>
}

function ClientEditorDialog({ client, isOpen, onOpenChange, onSubmit }: { client: Client | null; isOpen: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  const formValues = client ?? emptyClient
  const isEditing = Boolean(client)

  return <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">{isEditing ? 'CLIENT DETAILS' : 'NEW CLIENT'}</p>
        <DialogTitle>{isEditing ? `${client?.firstName} ${client?.lastName}` : 'Add a client'}</DialogTitle>
        <DialogDescription>{isEditing ? 'Update contact details, goals, scheduling preferences, and package balance.' : 'Add the details you need to begin managing this client.'}</DialogDescription>
      </DialogHeader>
      <form className="grid gap-4" key={client?.id ?? 'new'} onSubmit={(event) => void onSubmit(event)}>
        <div className="grid gap-4 sm:grid-cols-2"><Label>First name<Input required maxLength={80} name="firstName" defaultValue={formValues.firstName} /></Label><Label>Last name<Input required maxLength={80} name="lastName" defaultValue={formValues.lastName} /></Label></div>
        <div className="grid gap-4 sm:grid-cols-2"><Label>Email <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="email" maxLength={254} name="email" defaultValue={formValues.email} /></Label><Label>Phone <span className="text-xs font-normal text-muted-foreground">optional</span><Input maxLength={40} name="phone" defaultValue={formValues.phone} /></Label></div>
        <fieldset className="grid gap-3 rounded-xl border border-border p-4"><legend className="px-1 text-sm font-medium">Preferred time window <span className="text-xs font-normal text-muted-foreground">optional</span></legend><p className="text-sm text-muted-foreground">A scheduling preference only. It does not book a session.</p><div className="grid gap-4 sm:grid-cols-2"><Label>Preferred start<Input type="time" name="preferredStartTime" defaultValue={formValues.preferredStartTime} /></Label><Label>Preferred end<Input type="time" name="preferredEndTime" defaultValue={formValues.preferredEndTime} /></Label></div></fieldset>
        <Label>Training goals <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={2000} name="goals" defaultValue={formValues.goals} /></Label><Label>Private notes <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={4000} name="notes" defaultValue={formValues.notes} /></Label>
        <Label>Status<select className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring" name="status" defaultValue={formValues.status}><option value="active">Active</option><option value="archived">Archived</option></select></Label>
        <Button className="justify-between sm:w-fit" type="submit">{isEditing ? 'Save changes' : 'Add client'} <span aria-hidden="true">→</span></Button>
      </form>
      {client && <ClientPackagePanel clientID={client.id} clientName={`${client.firstName} ${client.lastName}`} />}
    </DialogContent>
  </Dialog>
}

function OrganizationSetup({ email, error, onSubmit }: { email: string; error: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="text-foreground"><Card className="mx-auto mt-16 max-w-lg"><CardContent className="p-8"><p className={workspaceEyebrowClass}>TRAINER WORKSPACE</p><h1 className="mt-3 text-4xl font-semibold leading-none tracking-tight">Set up your training business</h1><p className="mt-4 leading-7 text-muted-foreground">You are signed in as <strong>{email}</strong>. Create your organization to start managing client records.</p><form className="mt-6 grid gap-4" onSubmit={onSubmit}><Label>Business name<Input name="displayName" required minLength={2} maxLength={80} autoComplete="organization" placeholder="Your training business" /></Label><Button className="justify-between sm:w-fit" type="submit">Create workspace <span aria-hidden="true">→</span></Button></form>{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}</CardContent></Card></section>
}
