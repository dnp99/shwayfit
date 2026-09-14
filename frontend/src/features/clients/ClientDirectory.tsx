import { ChevronRight, Clock3, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/utils'

export type DirectoryClient = {
  id: string
  firstName: string
  lastName: string
  goals?: string
  preferredStartTime?: string
  preferredEndTime?: string
  status: 'active' | 'archived'
}

type DirectoryStatus = DirectoryClient['status']

function initials(client: DirectoryClient) {
  return `${client.firstName.slice(0, 1)}${client.lastName.slice(0, 1)}`.toUpperCase()
}

function preferredTime(client: DirectoryClient) {
  if (!client.preferredStartTime || !client.preferredEndTime) return null
  return `${client.preferredStartTime}–${client.preferredEndTime}`
}

export function ClientDirectory({
  clients,
  selectedClientID,
  onAdd,
  onSelect,
}: {
  clients: DirectoryClient[]
  selectedClientID?: string
  onAdd: () => void
  onSelect: (clientID: string) => void
}) {
  const [status, setStatus] = useState<DirectoryStatus>('active')
  const [search, setSearch] = useState('')
  const activeCount = clients.filter((client) => client.status === 'active').length
  const archivedCount = clients.length - activeCount
  const displayedClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return clients.filter((client) => client.status === status && (!term || `${client.firstName} ${client.lastName} ${client.goals ?? ''}`.toLocaleLowerCase().includes(term)))
  }, [clients, search, status])

  return <section aria-labelledby="clients-heading">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-primary">Client management</p>
        <h1 id="clients-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Clients</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">Find contact details, training goals, and current package balances.</p>
      </div>
      <Button onClick={onAdd} type="button"><Plus className="size-4" aria-hidden="true" />Add client</Button>
    </header>

    <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="inline-flex w-full rounded-lg bg-muted p-1 sm:w-fit" aria-label="Client status filter">
        {([
          ['active', 'Active', activeCount],
          ['archived', 'Archived', archivedCount],
        ] as const).map(([value, label, count]) => <button
          aria-pressed={status === value}
          className={cn('min-h-11 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2', status === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          key={value}
          onClick={() => setStatus(value)}
          type="button"
        >{label}<span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{count}</span></button>)}
      </div>
      <div className="relative w-full lg:max-w-sm"><Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input aria-label={`Search ${status} clients`} className="pl-10" onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${status} clients`} value={search} /></div>
    </div>

    {displayedClients.length === 0 ? <Card className="mt-8"><CardContent className="grid gap-2 p-6"><p className="font-medium">{search ? 'No matching clients' : `No ${status} clients`}</p><p className="text-sm leading-6 text-muted-foreground">{search ? 'Try a different name or goal.' : status === 'active' ? 'Add your first client to begin keeping their training details together.' : 'Archived clients remain here for your records.'}</p>{status === 'active' && !search && <Button className="mt-2 w-fit" onClick={onAdd} type="button"><Plus className="size-4" aria-hidden="true" />Add client</Button>}</CardContent></Card>
      : <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {displayedClients.map((client) => <button
          aria-current={selectedClientID === client.id ? 'true' : undefined}
          className={cn('group min-h-52 rounded-xl border border-border bg-card p-5 text-left text-card-foreground transition-colors hover:bg-accent/40 focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2', selectedClientID === client.id && 'border-ring bg-accent/40')}
          key={client.id}
          onClick={() => onSelect(client.id)}
          type="button"
        >
          <span className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground" aria-hidden="true">{initials(client)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-lg font-semibold tracking-tight">{client.firstName} {client.lastName}</strong><span className="mt-1 block line-clamp-2 text-sm leading-6 text-muted-foreground">{client.goals || 'No training goals yet'}</span></span><ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
          <span className="mt-7 grid gap-3 text-sm"><span className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Status</span><span className={cn('rounded-full px-2 py-1 text-xs font-medium', client.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>{client.status === 'active' ? 'Active' : 'Archived'}</span></span>{preferredTime(client) && <span className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 className="size-4" aria-hidden="true" />Preferred time</span><span className="font-medium">{preferredTime(client)}</span></span>}</span>
        </button>)}
      </div>}
  </section>
}
