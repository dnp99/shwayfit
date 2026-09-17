import { AlertCircle, CalendarCheck, CalendarDays, Check, ChevronRight, Clock3, PackageCheck, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../../lib/api'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'

type Client = { id: string; firstName: string; lastName: string; goals?: string; status: 'active' | 'archived' }
type Appointment = { id: string; clientId: string; startAt: string; durationMinutes: number; notes?: string; status: 'scheduled' | 'completed' }
type ClientPackage = { id: string; packageName: string; includedSessions: number; remainingSessions: number; status: 'active' | 'completed' }
type AppointmentCompletion = { appointment: Appointment; clientPackage: ClientPackage }

const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

function startOfDay(date: Date) { const result = new Date(date); result.setHours(0, 0, 0, 0); return result }
function addDays(date: Date, amount: number) { const result = new Date(date); result.setDate(result.getDate() + amount); return result }
function isSameDay(first: Date, second: Date) { return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate() }
function startOfWeek(date: Date) { const result = startOfDay(date); result.setDate(result.getDate() - ((result.getDay() + 6) % 7)); return result }
function fullName(client: Client | undefined) { return client ? `${client.firstName} ${client.lastName}` : 'Client' }
function initials(client: Client | undefined) { return client ? `${client.firstName.slice(0, 1)}${client.lastName.slice(0, 1)}`.toUpperCase() : 'C' }
function packageLabel(clientPackage: ClientPackage | undefined) { return clientPackage ? `${clientPackage.remainingSessions} of ${clientPackage.includedSessions} remaining` : 'No active package' }

function Metric({ description, icon: Icon, label, value }: { description: string; icon: typeof CalendarDays; label: string; value: number }) {
  return <Card><CardContent className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-4" aria-hidden="true" /></span></div><p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></CardContent></Card>
}

function CompleteSessionDialog({ appointment, client, onComplete, onOpenChange }: { appointment: Appointment | null; client?: Client; onComplete: (completion: AppointmentCompletion) => void; onOpenChange: (open: boolean) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const open = appointment !== null

  async function complete() {
    if (!appointment) return
    try {
      setIsSaving(true)
      setError(null)
      const completion = await api(`/api/v1/organizations/current/appointments/${appointment.id}/complete`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } }) as AppointmentCompletion
      onComplete(completion)
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ShwayFit could not complete this session.')
    } finally { setIsSaving(false) }
  }

  return <Dialog onOpenChange={onOpenChange} open={open}><DialogContent><DialogHeader><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">SESSION COMPLETION</p><DialogTitle>Complete session?</DialogTitle><DialogDescription>{fullName(client)} · {appointment ? timeFormatter.format(new Date(appointment.startAt)) : ''}</DialogDescription></DialogHeader><p className="text-sm leading-6 text-muted-foreground">This records one used package session. This action cannot be undone from Today.</p>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<DialogFooter><Button disabled={isSaving} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancel</Button><Button disabled={isSaving} onClick={() => void complete()} type="button"><CalendarCheck className="size-4" aria-hidden="true" />{isSaving ? 'Completing…' : 'Complete session'}</Button></DialogFooter></DialogContent></Dialog>
}

export function Dashboard() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [packagesByClient, setPackagesByClient] = useState<Record<string, ClientPackage | undefined>>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const { today, weekEnd, weekStart } = useMemo(() => { const now = new Date(); const today = startOfDay(now); const weekStart = startOfWeek(now); return { today, weekStart, weekEnd: addDays(weekStart, 7) } }, [])

  useEffect(() => {
    let current = true
    void Promise.all([
      api('/api/v1/organizations/current/clients') as Promise<{ clients: Client[] }>,
      api(`/api/v1/organizations/current/appointments?from=${encodeURIComponent(weekStart.toISOString())}&to=${encodeURIComponent(weekEnd.toISOString())}`) as Promise<{ appointments: Appointment[] }>,
    ]).then(async ([clientResult, appointmentResult]) => {
      const activeClients = clientResult.clients.filter((client) => client.status === 'active')
      const packageResults = await Promise.all(activeClients.map(async (client) => {
        const result = await api(`/api/v1/organizations/current/clients/${client.id}/packages`) as { packages: ClientPackage[] }
        return [client.id, result.packages.find((clientPackage) => clientPackage.status === 'active')] as const
      }))
      if (!current) return
      setClients(clientResult.clients); setAppointments(appointmentResult.appointments); setPackagesByClient(Object.fromEntries(packageResults)); setError(null)
    }).catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : 'ShwayFit could not load Today.') }).finally(() => { if (current) setIsLoading(false) })
    return () => { current = false }
  }, [weekEnd, weekStart])

  const now = new Date()
  const activeClients = clients.filter((client) => client.status === 'active')
  const todayAppointments = appointments.filter((appointment) => isSameDay(new Date(appointment.startAt), today)).sort((first, second) => new Date(first.startAt).getTime() - new Date(second.startAt).getTime())
  const upcomingAppointments = appointments.filter((appointment) => appointment.status === 'scheduled' && new Date(appointment.startAt) >= now)
  const lowBalanceClients = activeClients.filter((client) => { const clientPackage = packagesByClient[client.id]; return clientPackage && clientPackage.remainingSessions <= 3 })
  const clientsWithoutFutureSession = activeClients.filter((client) => !upcomingAppointments.some((appointment) => appointment.clientId === client.id))
  const attention = [...lowBalanceClients.map((client) => ({ client, reason: `Only ${packagesByClient[client.id]?.remainingSessions} session${packagesByClient[client.id]?.remainingSessions === 1 ? '' : 's'} remaining` })), ...clientsWithoutFutureSession.filter((client) => !lowBalanceClients.some((item) => item.id === client.id)).map((client) => ({ client, reason: 'No future appointment' }))]

  return <section aria-labelledby="dashboard-heading">
    <header><p className="text-sm font-medium text-primary">{dateFormatter.format(now)}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" id="dashboard-heading">Good morning</h1><p className="mt-3 text-base leading-7 text-muted-foreground">{todayAppointments.length === 0 ? 'Your schedule is clear today.' : `You have ${todayAppointments.length} session${todayAppointments.length === 1 ? '' : 's'} today.`}</p></header>
    {error && <p className="mt-6 text-sm text-destructive" role="alert">{error}</p>}
    <div className="mt-8 grid gap-4 sm:grid-cols-3"><Metric description={`${todayAppointments.filter((appointment) => appointment.status === 'completed').length} completed`} icon={CalendarDays} label="Sessions today" value={todayAppointments.length} /><Metric description={`${attention.length} need attention`} icon={Users} label="Active clients" value={activeClients.length} /><Metric description="Scheduled this week" icon={Clock3} label="Sessions this week" value={appointments.length} /></div>
    <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]"><section aria-labelledby="today-schedule-heading"><div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight" id="today-schedule-heading">Today’s schedule</h2><p className="mt-1 text-sm text-muted-foreground">Keep each session moving.</p></div><Button className="min-h-11" onClick={() => navigate('/schedule')} type="button" variant="ghost">View calendar <ChevronRight className="size-4" aria-hidden="true" /></Button></div>{isLoading ? <p className="mt-5 text-sm text-muted-foreground">Loading today’s schedule…</p> : todayAppointments.length === 0 ? <Card className="mt-5"><CardContent className="grid place-items-center gap-3 px-6 py-10 text-center"><span className="grid size-11 place-items-center rounded-full bg-secondary text-primary"><CalendarDays className="size-5" aria-hidden="true" /></span><div><p className="font-medium">No sessions today</p><p className="mt-1 text-sm text-muted-foreground">Book a session when you’re ready.</p></div><Button className="mt-1 min-h-11" onClick={() => navigate('/schedule?book=1')} type="button">Book a session</Button></CardContent></Card> : <ol className="mt-5 divide-y divide-border rounded-xl border border-border bg-card">{todayAppointments.map((appointment) => { const client = clients.find((item) => item.id === appointment.clientId); const clientPackage = packagesByClient[appointment.clientId]; return <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5" key={appointment.id}><time className="shrink-0 text-sm font-medium sm:w-24">{timeFormatter.format(new Date(appointment.startAt))}</time><button className="min-w-0 flex-1 text-left focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2" onClick={() => client && navigate(`/clients/${client.id}`)} type="button"><p className="font-semibold">{fullName(client)}</p><p className="mt-1 truncate text-sm text-muted-foreground">{appointment.notes || client?.goals || 'Training session'} · {packageLabel(clientPackage)}</p></button>{appointment.status === 'completed' ? <span className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-success"><Check className="size-4" aria-hidden="true" />Completed</span> : <Button className="min-h-11" onClick={() => setSelectedAppointment(appointment)} type="button" variant="outline">Complete</Button>}</li> })}</ol>}</section>
      <aside aria-labelledby="attention-heading"><Card><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold tracking-tight" id="attention-heading">Needs attention</h2><p className="mt-1 text-sm text-muted-foreground">Follow up before the next visit.</p></div><span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">{attention.length}</span></div>{isLoading ? <p className="mt-5 text-sm text-muted-foreground">Reviewing clients…</p> : attention.length === 0 ? <p className="mt-5 rounded-lg bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">Everything looks on track. No client follow-ups need attention.</p> : <ul className="mt-5 divide-y divide-border">{attention.slice(0, 5).map(({ client, reason }) => <li key={client.id}><button className="flex min-h-14 w-full items-center gap-3 py-3 text-left transition-colors hover:text-primary focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2" onClick={() => navigate(`/clients/${client.id}`)} type="button"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{initials(client)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{fullName(client)}</span><span className="mt-0.5 block truncate text-sm text-muted-foreground">{reason}</span></span><AlertCircle className="size-4 shrink-0 text-warning" aria-hidden="true" /></button></li>)}</ul>}</CardContent></Card><Card className="mt-6"><CardContent className="p-5"><PackageCheck className="size-5 text-primary" aria-hidden="true" /><h2 className="mt-4 text-lg font-semibold">Keep your day moving</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Add a client or book their next session in a few taps.</p><div className="mt-5 flex flex-wrap gap-2"><Button className="min-h-11" onClick={() => navigate('/schedule?book=1')} type="button">Book a session</Button><Button className="min-h-11" onClick={() => navigate('/clients/new')} type="button" variant="outline">Add client</Button></div></CardContent></Card></aside></div>
    <CompleteSessionDialog appointment={selectedAppointment} client={clients.find((client) => client.id === selectedAppointment?.clientId)} onComplete={(completion) => { setAppointments((current) => current.map((appointment) => appointment.id === completion.appointment.id ? completion.appointment : appointment)); setPackagesByClient((current) => ({ ...current, [completion.appointment.clientId]: completion.clientPackage })); setSelectedAppointment(null) }} onOpenChange={(open) => { if (!open) setSelectedAppointment(null) }} />
  </section>
}
