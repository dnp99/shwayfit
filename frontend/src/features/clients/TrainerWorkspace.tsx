import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getFirebaseAuth } from '../../lib/firebase'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'

type Organization = { id: string; displayName: string }
type Client = { id: string; firstName: string; lastName: string; email?: string; phone?: string; goals?: string; notes?: string; status: 'active' | 'archived' }
type ClientInput = Omit<Client, 'id'>

const emptyClient: ClientInput = { firstName: '', lastName: '', email: '', phone: '', goals: '', notes: '', status: 'active' }

async function api(path: string, options: RequestInit = {}) {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error('Your sign-in has ended. Please sign in again.')
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? 'ShwayFit could not complete this request.')
  }
  return response.status === 204 ? null : response.json()
}

export function TrainerWorkspace({ email }: { email: string }) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
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
      phone: String(data.get('phone') ?? ''), goals: String(data.get('goals') ?? ''), notes: String(data.get('notes') ?? ''), status: String(data.get('status') ?? 'active') as ClientInput['status'],
    }
    try {
      setError(null)
      const path = selectedClient ? `/api/v1/organizations/current/clients/${selectedClient.id}` : '/api/v1/organizations/current/clients'
      const client = await api(path, { method: selectedClient ? 'PATCH' : 'POST', body: JSON.stringify(input) }) as Client
      setClients((current) => selectedClient ? current.map((item) => item.id === client.id ? client : item) : [...current, client].sort((a, b) => a.lastName.localeCompare(b.lastName)))
      setSelectedClient(null)
      form.reset()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'ShwayFit could not save this client.') }
  }

  if (isLoading) return <section className="flex min-h-screen items-center justify-center bg-background p-5 text-muted-foreground"><p>Preparing your workspace…</p></section>
  if (!organization) return <OrganizationSetup email={email} error={error} onSubmit={createOrganization} />
  const formValues = selectedClient ?? emptyClient
  return <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-10 lg:px-20">
    <header className="flex items-center justify-between"><a className="brand" href="/" aria-label="ShwayFit home"><span className="brand-mark" aria-hidden="true">s</span><span>ShwayFit</span></a><ThemeToggle /></header>
    <header className="mt-14 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6"><div><p className="eyebrow">TRAINER WORKSPACE</p><h1 className="mt-3 font-serif text-4xl leading-none tracking-tight sm:text-5xl">{organization.displayName}</h1></div><p className="max-w-48 text-right text-sm text-muted-foreground break-all">{email}</p></header>
    {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
    <div className="mx-auto mt-6 grid max-w-6xl gap-4 lg:grid-cols-[minmax(18rem,.75fr)_minmax(25rem,1.25fr)]">
      <Card aria-labelledby="clients-heading"><CardHeader><div><p className="eyebrow">CLIENTS</p><h2 id="clients-heading" className="mt-1 text-xl font-semibold tracking-tight">Your people</h2></div><span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{clients.length}</span></CardHeader><CardContent>{clients.length === 0 ? <p className="text-sm leading-6 text-muted-foreground">Add your first client to begin keeping their training details together.</p> : <ul>{clients.map((client) => <li className="border-t border-border first:border-t-0" key={client.id}><button type="button" className={`flex min-h-17 w-full items-center justify-between py-3 text-left transition-colors hover:text-accent-foreground focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2 ${selectedClient?.id === client.id ? 'text-accent-foreground' : ''}`} onClick={() => setSelectedClient(client)}><span><strong className="block text-sm">{client.firstName} {client.lastName}</strong><small className="mt-1 block text-xs text-muted-foreground">{client.status === 'active' ? 'Active' : 'Archived'}</small></span><span aria-hidden="true">›</span></button></li>)}</ul>}</CardContent></Card>
      <Card aria-labelledby="client-form-heading"><CardHeader><div><p className="eyebrow">{selectedClient ? 'EDIT CLIENT' : 'NEW CLIENT'}</p><h2 id="client-form-heading" className="mt-1 text-xl font-semibold tracking-tight">{selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'Add a client'}</h2></div>{selectedClient && <Button type="button" variant="ghost" onClick={() => setSelectedClient(null)}>New client</Button>}</CardHeader><CardContent><form className="grid gap-4" onSubmit={saveClient} key={selectedClient?.id ?? 'new'}>
        <div className="grid gap-4 sm:grid-cols-2"><Label>First name<Input required maxLength={80} name="firstName" defaultValue={formValues.firstName} /></Label><Label>Last name<Input required maxLength={80} name="lastName" defaultValue={formValues.lastName} /></Label></div>
        <div className="grid gap-4 sm:grid-cols-2"><Label>Email <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="email" maxLength={254} name="email" defaultValue={formValues.email} /></Label><Label>Phone <span className="text-xs font-normal text-muted-foreground">optional</span><Input maxLength={40} name="phone" defaultValue={formValues.phone} /></Label></div>
        <Label>Training goals <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={2000} name="goals" defaultValue={formValues.goals} /></Label><Label>Private notes <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={4000} name="notes" defaultValue={formValues.notes} /></Label>
        <Label>Status<select className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring" name="status" defaultValue={formValues.status}><option value="active">Active</option><option value="archived">Archived</option></select></Label>
        <Button className="justify-between sm:w-fit" type="submit">{selectedClient ? 'Save changes' : 'Add client'} <span aria-hidden="true">→</span></Button>
      </form></CardContent></Card>
    </div>
  </main>
}

function OrganizationSetup({ email, error, onSubmit }: { email: string; error: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-10"><Card className="mx-auto mt-24 max-w-lg"><CardContent className="p-8"><p className="eyebrow">TRAINER WORKSPACE</p><h1 className="mt-3 font-serif text-4xl leading-none tracking-tight">Set up your training business</h1><p className="mt-4 leading-7 text-muted-foreground">You are signed in as <strong>{email}</strong>. Create your organization to start managing client records.</p><form className="mt-6 grid gap-4" onSubmit={onSubmit}><Label>Business name<Input name="displayName" required minLength={2} maxLength={80} autoComplete="organization" placeholder="Your training business" /></Label><Button className="justify-between sm:w-fit" type="submit">Create workspace <span aria-hidden="true">→</span></Button></form>{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}</CardContent></Card></main>
}
