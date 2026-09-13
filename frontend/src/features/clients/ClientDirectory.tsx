import { ChevronRight, Clock3 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../components/ui/card'

export type DirectoryClient = {
  id: string
  firstName: string
  lastName: string
  preferredStartTime?: string
  preferredEndTime?: string
  status: 'active' | 'archived'
}

export function ClientDirectory({
  clients,
  selectedClientID,
  onSelect,
}: {
  clients: DirectoryClient[]
  selectedClientID?: string
  onSelect: (clientID: string) => void
}) {
  return <Card aria-labelledby="clients-heading" className="lg:sticky lg:top-6 lg:self-start">
    <CardHeader>
      <div>
        <p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">CLIENT DIRECTORY</p>
        <h2 id="clients-heading" className="mt-1 text-xl font-semibold tracking-tight">All clients</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Select a client to view and update their details alongside this list.</p>
      </div>
      <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground" aria-label={`${clients.length} clients`}>{clients.length}</span>
    </CardHeader>
    <CardContent>
      {clients.length === 0
        ? <p className="text-sm leading-6 text-muted-foreground">Add your first client to begin keeping their training details together.</p>
        : <ul className="-mx-4 border-t border-border">
          {clients.map((client) => <li className="border-b border-border last:border-b-0" key={client.id}>
            <button
              type="button"
              aria-current={selectedClientID === client.id ? 'true' : undefined}
              className={`flex min-h-18 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-[-3px] ${selectedClientID === client.id ? 'bg-accent text-accent-foreground' : ''}`}
              onClick={() => onSelect(client.id)}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground" aria-hidden="true">{client.firstName.slice(0, 1)}{client.lastName.slice(0, 1)}</span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold">{client.firstName} {client.lastName}</strong>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${client.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{client.status === 'active' ? 'Active' : 'Archived'}</span>
                  {client.preferredStartTime && client.preferredEndTime && <span className="inline-flex items-center gap-1"><Clock3 className="size-3" aria-hidden="true" />{client.preferredStartTime}–{client.preferredEndTime}</span>}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>)}
        </ul>}
    </CardContent>
  </Card>
}
