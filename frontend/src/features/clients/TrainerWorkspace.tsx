import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
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
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const clientPathSegment = pathname.split('/')[2]
  const isNewClient = clientPathSegment === 'new'
  const selectedClient = clientPathSegment && !isNewClient ? clients.find((client) => client.id === clientPathSegment) ?? null : null
  const isEditorOpen = isNewClient || Boolean(selectedClient)

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
      navigate('/clients', { replace: true })
      form.reset()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'ShwayFit could not save this client.') }
  }

  if (isLoading) return <section className="flex min-h-screen items-center justify-center bg-background p-5 text-muted-foreground"><p>Preparing your workspace…</p></section>
  if (!organization) return <OrganizationSetup email={email} error={error} onSubmit={createOrganization} />
  return <section className="text-foreground">
    {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
    {isEditorOpen
      ? <ClientEditorPage client={selectedClient} error={error} onBack={() => navigate('/clients')} onSubmit={saveClient} />
      : <ClientDirectory clients={clients} selectedClientID={selectedClient?.id} onAdd={() => { setError(null); navigate('/clients/new') }} onSelect={(clientID) => { setError(null); navigate(`/clients/${clientID}`) }} />}
  </section>
}

function ClientEditorPage({ client, error, onBack, onSubmit }: { client: Client | null; error: string | null; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  const formValues = client ?? emptyClient
  const isEditing = Boolean(client)

  return <section aria-labelledby="client-editor-heading">
    <Button className="-ml-2 min-h-11 px-2 text-foreground hover:bg-accent active:bg-accent" onClick={onBack} type="button" variant="ghost"><ChevronLeft className="size-4 text-primary" aria-hidden="true" />Back to clients</Button>
    <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {client ? <div className="flex items-center gap-3"><span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground" aria-hidden="true">{clientInitials(client)}</span><div className="min-w-0"><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">CLIENT DETAILS</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 id="client-editor-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">{client.firstName} {client.lastName}</h1><span className={client.status === 'active' ? 'rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success' : 'rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'}>{client.status === 'active' ? 'Active' : 'Archived'}</span></div><p className="mt-1 truncate text-muted-foreground">{client.goals || 'No training goals yet'}</p></div></div> : <div><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">CLIENT DETAILS</p><h1 id="client-editor-heading" className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Add a client</h1><p className="mt-2 text-muted-foreground">Add the details you need to begin managing this client.</p></div>}
    </header>
    <form className="mt-8 grid gap-6" key={client?.id ?? 'new'} onSubmit={(event) => void onSubmit(event)}>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="client-profile-heading">
        <div><h2 id="client-profile-heading" className="text-lg font-semibold">Profile</h2><p className="mt-1 text-sm text-muted-foreground">Contact information and training context.</p></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">First name<Input required maxLength={80} name="firstName" defaultValue={formValues.firstName} /></Label><Label className="grid gap-2">Last name<Input required maxLength={80} name="lastName" defaultValue={formValues.lastName} /></Label><Label className="grid gap-2">Email <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="email" maxLength={254} name="email" defaultValue={formValues.email} /></Label><Label className="grid gap-2">Phone <span className="text-xs font-normal text-muted-foreground">optional</span><Input maxLength={40} name="phone" defaultValue={formValues.phone} /></Label></div>
      </section>
      <section className="rounded-xl border border-border bg-muted/30 p-4 sm:p-6" aria-labelledby="scheduling-preference-heading"><h2 id="scheduling-preference-heading" className="text-lg font-semibold">Scheduling preference</h2><p className="mt-1 text-sm text-muted-foreground">A preferred time window helps with planning. It does not book a session.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">Preferred start <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="time" name="preferredStartTime" defaultValue={formValues.preferredStartTime} /></Label><Label className="grid gap-2">Preferred end <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="time" name="preferredEndTime" defaultValue={formValues.preferredEndTime} /></Label></div></section>
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="training-context-heading"><h2 id="training-context-heading" className="text-lg font-semibold">Training context</h2><div className="mt-5 grid gap-4"><Label className="grid gap-2">Training goals <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={2000} name="goals" defaultValue={formValues.goals} /></Label><Label className="grid gap-2">Private notes <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={4000} name="notes" defaultValue={formValues.notes} /></Label><Label className="grid max-w-52 gap-2">Client status<select className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring" name="status" defaultValue={formValues.status}><option value="active">Active</option><option value="archived">Archived</option></select></Label></div></section>
      {client && <ClientPackagePanel clientID={client.id} clientName={`${client.firstName} ${client.lastName}`} />}
      <footer className="flex flex-col-reverse gap-2 border-t border-border pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end"><Button className="min-h-11 w-full sm:w-auto" onClick={onBack} type="button" variant="outline">Cancel</Button><Button className="min-h-11 w-full sm:w-auto" type="submit">{isEditing ? 'Save changes' : 'Add client'}</Button></footer>
    </form>
  </section>
}

function OrganizationSetup({ email, error, onSubmit }: { email: string; error: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="text-foreground"><Card className="mx-auto mt-16 max-w-lg"><CardContent className="p-8"><p className={workspaceEyebrowClass}>TRAINER WORKSPACE</p><h1 className="mt-3 text-4xl font-semibold leading-none tracking-tight">Set up your training business</h1><p className="mt-4 leading-7 text-muted-foreground">You are signed in as <strong>{email}</strong>. Create your organization to start managing client records.</p><form className="mt-6 grid gap-4" onSubmit={onSubmit}><Label>Business name<Input name="displayName" required minLength={2} maxLength={80} autoComplete="organization" placeholder="Your training business" /></Label><Button className="justify-between sm:w-fit" type="submit">Create workspace <span aria-hidden="true">→</span></Button></form>{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}</CardContent></Card></section>
}
