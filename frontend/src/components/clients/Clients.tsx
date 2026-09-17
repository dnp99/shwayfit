import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, ChevronLeft, ClipboardList, Mail, Pencil, Phone, Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { api } from '../../lib/api'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { ClientDirectory } from './ClientDirectory'
import { ClientPackagePanel } from '../packages/ClientPackagePanel'

type Organization = { id: string; displayName: string }
type Client = { id: string; firstName: string; lastName: string; email?: string; phone?: string; goals?: string; notes?: string; preferredStartTime?: string; preferredEndTime?: string; heightCm?: number; startingWeightKg?: number; startingMeasurementDate?: string; startingMeasurementNotes?: string; status: 'active' | 'archived' }
type ClientInput = Omit<Client, 'id'>
type ContactErrors = Partial<Record<'email' | 'phone', string>>
type Appointment = { id: string; clientId: string; startAt: string; durationMinutes: number; status: 'scheduled' | 'completed' }

const emptyClient: ClientInput = { firstName: '', lastName: '', email: '', phone: '', goals: '', notes: '', preferredStartTime: '', preferredEndTime: '', heightCm: undefined, startingWeightKg: undefined, startingMeasurementDate: '', startingMeasurementNotes: '', status: 'active' }
// The shell owns this label on desktop; the page keeps it on mobile where the
// desktop utility bar is intentionally hidden.
const workspaceEyebrowClass = 'text-xs font-semibold tracking-[0.175em] text-secondary-foreground lg:hidden'

function clientInitials(client: Pick<Client, 'firstName' | 'lastName'>) {
  return `${client.firstName.slice(0, 1)}${client.lastName.slice(0, 1)}`.toUpperCase()
}

function clientInputFromForm(form: HTMLFormElement): ClientInput {
  const data = new FormData(form)
  const startingWeightKg = optionalDecimal(data.get('startingWeightKg'))
  return {
    firstName: String(data.get('firstName') ?? ''), lastName: String(data.get('lastName') ?? ''), email: String(data.get('email') ?? ''),
    phone: String(data.get('phone') ?? ''), goals: String(data.get('goals') ?? ''), notes: String(data.get('notes') ?? ''),
    preferredStartTime: String(data.get('preferredStartTime') ?? ''), preferredEndTime: String(data.get('preferredEndTime') ?? ''), heightCm: optionalDecimal(data.get('heightCm')), startingWeightKg, startingMeasurementDate: startingWeightKg === undefined ? '' : String(data.get('startingMeasurementDate') ?? ''), startingMeasurementNotes: startingWeightKg === undefined ? '' : String(data.get('startingMeasurementNotes') ?? ''), status: String(data.get('status') ?? 'active') as ClientInput['status'],
  }
}

function isSameClientInput(first: ClientInput, second: ClientInput) {
  return first.firstName === second.firstName && first.lastName === second.lastName && first.email === second.email && first.phone === second.phone && first.goals === second.goals && first.notes === second.notes && first.preferredStartTime === second.preferredStartTime && first.preferredEndTime === second.preferredEndTime && first.heightCm === second.heightCm && first.startingWeightKg === second.startingWeightKg && first.startingMeasurementDate === second.startingMeasurementDate && first.startingMeasurementNotes === second.startingMeasurementNotes && first.status === second.status
}

function contactErrors(input: ClientInput): ContactErrors {
  const errors: ContactErrors = {}
  const email = input.email?.trim() ?? ''
  const phone = input.phone?.trim() ?? ''
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
  const digitCount = (phone.match(/\d/g) ?? []).length
  if (phone && (!/^[0-9+(). -]+$/.test(phone) || digitCount < 7 || digitCount > 15)) errors.phone = 'Enter a valid phone number with 7–15 digits.'
  return errors
}

function formatPhone(value: string | undefined) {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 15)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return digits
}

function optionalDecimal(value: FormDataEntryValue | null) {
  const normalized = String(value ?? '').trim()
  return normalized === '' ? undefined : Number(normalized)
}

function formatDecimalInput(value: string) {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '')
  const [whole = '', ...fraction] = normalized.split('.')
  return fraction.length === 0 ? whole : `${whole}.${fraction.join('')}`
}

export function Clients({ email }: { email: string }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, , clientPathSegment, clientAction] = pathname.split('/')
  const isNewClient = clientPathSegment === 'new'
  const isEditingClient = clientAction === 'edit'
  const selectedClient = clientPathSegment && !isNewClient ? clients.find((client) => client.id === clientPathSegment) ?? null : null
  const isEditorOpen = isNewClient || (Boolean(selectedClient) && isEditingClient)

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

  async function saveClient(event: FormEvent<HTMLFormElement>): Promise<boolean> {
    event.preventDefault()
    // React clears currentTarget after an awaited operation. Keep the form so a
    // successful new-client submission can reset it without reporting an error.
    const form = event.currentTarget
    const input = clientInputFromForm(form)
    if ((input.preferredStartTime || input.preferredEndTime) && (!input.preferredStartTime || !input.preferredEndTime || input.preferredStartTime >= input.preferredEndTime)) {
      setError('Enter both preferred times, with an end time after the start time.')
      return false
    }
    try {
      setError(null)
      const path = selectedClient ? `/api/v1/organizations/current/clients/${selectedClient.id}` : '/api/v1/organizations/current/clients'
      const client = await api(path, { method: selectedClient ? 'PATCH' : 'POST', body: JSON.stringify(input) }) as Client
      setClients((current) => selectedClient ? current.map((item) => item.id === client.id ? client : item) : [...current, client].sort((a, b) => a.lastName.localeCompare(b.lastName)))
      navigate(`/clients/${client.id}`, { replace: true })
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ShwayFit could not save this client.')
      return false
    }
  }

  if (isLoading) return <section className="flex min-h-screen items-center justify-center bg-background p-5 text-muted-foreground"><p>Preparing your workspace…</p></section>
  if (!organization) return <OrganizationSetup email={email} error={error} onSubmit={createOrganization} />
  return <section className="text-foreground">
    {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
    {isEditorOpen
      ? <ClientEditorPage client={selectedClient} error={error} onBack={() => navigate(selectedClient ? `/clients/${selectedClient.id}` : '/clients')} onSubmit={saveClient} />
      : selectedClient
        ? <ClientDetailPage client={selectedClient} onBack={() => navigate('/clients')} onBook={() => navigate(`/schedule?book=1&client=${encodeURIComponent(selectedClient.id)}`)} onEdit={() => navigate(`/clients/${selectedClient.id}/edit`)} />
      : <ClientDirectory clients={clients} onAdd={() => { setError(null); navigate('/clients/new') }} onSelect={(clientID) => { setError(null); navigate(`/clients/${clientID}`) }} />}
  </section>
}

function ClientDetailPage({ client, onBack, onBook, onEdit }: { client: Client; onBack: () => void; onBook: () => void; onEdit: () => void }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true)
  const appointmentWindow = useMemo(() => ({ from: new Date(new Date().getFullYear() - 1, 0, 1), to: new Date(new Date().getFullYear() + 2, 0, 1) }), [])

  useEffect(() => {
    let current = true
    void api(`/api/v1/organizations/current/appointments?from=${encodeURIComponent(appointmentWindow.from.toISOString())}&to=${encodeURIComponent(appointmentWindow.to.toISOString())}`)
      .then((result) => { if (current) setAppointments((result as { appointments: Appointment[] }).appointments.filter((appointment) => appointment.clientId === client.id)) })
      .catch(() => { if (current) setAppointments([]) })
      .finally(() => { if (current) setIsLoadingAppointments(false) })
    return () => { current = false }
  }, [appointmentWindow, client.id])

  const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
  const appointmentHistory = [...appointments].sort((first, second) => new Date(second.startAt).getTime() - new Date(first.startAt).getTime())

  return <section aria-labelledby="client-detail-heading">
    <Button className="-ml-2 min-h-11 px-2 text-foreground hover:bg-accent active:bg-accent" onClick={onBack} type="button" variant="ghost"><ChevronLeft aria-hidden="true" className="size-4 text-primary" />Back to clients</Button>
    <header className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-4"><span className="grid size-20 shrink-0 place-items-center rounded-full bg-secondary text-xl font-semibold text-secondary-foreground" aria-hidden="true">{clientInitials(client)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" id="client-detail-heading">{client.firstName} {client.lastName}</h1><span className={client.status === 'active' ? 'rounded-full bg-success/10 px-2.5 py-1 text-sm font-medium text-success' : 'rounded-full bg-muted px-2.5 py-1 text-sm font-medium text-muted-foreground'}>{client.status === 'active' ? 'Active' : 'Archived'}</span></div><p className="mt-2 max-w-2xl text-base text-muted-foreground">{client.goals || 'No training goals recorded yet.'}</p></div></div>
      <div className="flex flex-wrap gap-2"><Button onClick={onEdit} type="button" variant="outline"><Pencil aria-hidden="true" className="size-4" />Edit client</Button><Button disabled={client.status !== 'active'} onClick={onBook} type="button"><Plus aria-hidden="true" className="size-4" />Book session</Button></div>
    </header>
    <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="grid gap-5"><section className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby="training-focus-heading"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight" id="training-focus-heading">Training focus</h2><Button onClick={onEdit} size="sm" type="button" variant="outline">Edit details</Button></div><div className="mt-5 flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground"><ClipboardList aria-hidden="true" className="size-5" /></span><p className="leading-7 text-muted-foreground">{client.goals || 'Add goals to give this client’s training a clear focus.'}</p></div></section>
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby="appointment-history-heading"><div className="flex items-center gap-2"><CalendarDays aria-hidden="true" className="size-5 text-primary" /><h2 className="text-xl font-semibold tracking-tight" id="appointment-history-heading">Appointment history</h2></div>{isLoadingAppointments ? <p className="mt-5 text-sm text-muted-foreground">Loading appointments…</p> : appointmentHistory.length === 0 ? <p className="mt-5 text-sm leading-6 text-muted-foreground">No appointments have been booked for this client.</p> : <ol className="mt-5 divide-y divide-border">{appointmentHistory.map((appointment) => <li className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0" key={appointment.id}><div><p className="font-medium">{appointment.status === 'completed' ? 'Completed session' : 'Scheduled session'}</p><p className="mt-1 text-sm text-muted-foreground">{dateFormatter.format(new Date(appointment.startAt))} · {timeFormatter.format(new Date(appointment.startAt))} · {appointment.durationMinutes} min</p></div><span className={appointment.status === 'completed' ? 'rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success' : 'rounded-full bg-info/10 px-2 py-1 text-xs font-medium text-info'}>{appointment.status === 'completed' ? 'Completed' : 'Upcoming'}</span></li>)}</ol>}</section></div>
      <aside className="grid gap-5"><ClientPackagePanel clientID={client.id} clientName={`${client.firstName} ${client.lastName}`} /><section className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby="contact-details-heading"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight" id="contact-details-heading">Contact details</h2><Button onClick={onEdit} size="sm" type="button" variant="outline">Edit</Button></div><dl className="mt-5 grid gap-4 text-sm"><div className="flex items-start gap-3"><Mail aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" /><div><dt className="text-muted-foreground">Email</dt><dd className="mt-1 font-medium">{client.email || 'Not recorded'}</dd></div></div><div className="flex items-start gap-3"><Phone aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" /><div><dt className="text-muted-foreground">Phone</dt><dd className="mt-1 font-medium">{formatPhone(client.phone) || 'Not recorded'}</dd></div></div>{client.preferredStartTime && client.preferredEndTime && <div><dt className="text-muted-foreground">Preferred time</dt><dd className="mt-1 font-medium">{client.preferredStartTime}–{client.preferredEndTime}</dd></div>}</dl></section><section className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby="starting-measurements-summary-heading"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight" id="starting-measurements-summary-heading">Starting measurements</h2><Button onClick={onEdit} size="sm" type="button" variant="outline">Edit</Button></div>{client.heightCm || client.startingWeightKg ? <dl className="mt-5 grid gap-4 text-sm"><div><dt className="text-muted-foreground">Height</dt><dd className="mt-1 font-medium">{client.heightCm ? `${client.heightCm} cm` : 'Not recorded'}</dd></div><div><dt className="text-muted-foreground">Starting weight</dt><dd className="mt-1 font-medium">{client.startingWeightKg ? `${client.startingWeightKg} kg` : 'Not recorded'}</dd></div>{client.startingMeasurementDate && <div><dt className="text-muted-foreground">Recorded</dt><dd className="mt-1 font-medium">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${client.startingMeasurementDate}T00:00:00`))}</dd></div>}{client.startingMeasurementNotes && <div><dt className="text-muted-foreground">Notes</dt><dd className="mt-1 leading-6">{client.startingMeasurementNotes}</dd></div>}</dl> : <p className="mt-4 text-sm leading-6 text-muted-foreground">No starting measurements have been recorded.</p>}</section></aside>
    </div>
  </section>
}

function ClientEditorPage({ client, error, onBack, onSubmit }: { client: Client | null; error: string | null; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean> }) {
  const formValues: ClientInput = client ? { ...emptyClient, ...client, phone: formatPhone(client.phone) } : emptyClient
  const isEditing = Boolean(client)
  const formRef = useRef<HTMLFormElement>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [contactErrorsByField, setContactErrorsByField] = useState<ContactErrors>({})

  function checkDirty() {
    if (formRef.current) setIsDirty(!isSameClientInput(clientInputFromForm(formRef.current), formValues))
  }

  function cancelChanges() {
    formRef.current?.reset()
    setIsDirty(false)
    setContactErrorsByField({})
  }

  function validateContactField(field: keyof ContactErrors) {
    if (!formRef.current) return
    const errors = contactErrors(clientInputFromForm(formRef.current))
    setContactErrorsByField((current) => ({ ...current, [field]: errors[field] }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = contactErrors(clientInputFromForm(event.currentTarget))
    setContactErrorsByField(errors)
    if (Object.keys(errors).length > 0) {
      event.preventDefault()
      return
    }
    if (await onSubmit(event)) setIsDirty(false)
  }

  return <section aria-labelledby="client-editor-heading">
    <Button className="-ml-2 min-h-11 px-2 text-foreground hover:bg-accent active:bg-accent" onClick={onBack} type="button" variant="ghost"><ChevronLeft className="size-4 text-primary" aria-hidden="true" />Back to clients</Button>
    <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {client ? <div className="flex items-center gap-3"><span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground" aria-hidden="true">{clientInitials(client)}</span><div className="min-w-0"><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">CLIENT DETAILS</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 id="client-editor-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">{client.firstName} {client.lastName}</h1><span className={client.status === 'active' ? 'rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success' : 'rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'}>{client.status === 'active' ? 'Active' : 'Archived'}</span></div><p className="mt-1 truncate text-muted-foreground">{client.goals || 'No training goals yet'}</p></div></div> : <div><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">CLIENT DETAILS</p><h1 id="client-editor-heading" className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Add a client</h1><p className="mt-2 text-muted-foreground">Add the details you need to begin managing this client.</p></div>}
    </header>
    <form className={`mt-8 grid gap-6 ${isDirty ? 'pb-32 lg:pb-24' : 'pb-4 sm:pb-6'}`} key={client?.id ?? 'new'} onChange={checkDirty} onSubmit={submit} ref={formRef}>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="client-profile-heading">
        <div><h2 id="client-profile-heading" className="text-lg font-semibold">Profile</h2><p className="mt-1 text-sm text-muted-foreground">Contact information and training context.</p></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">First name<Input required maxLength={80} name="firstName" defaultValue={formValues.firstName} /></Label><Label className="grid gap-2">Last name<Input required maxLength={80} name="lastName" defaultValue={formValues.lastName} /></Label><Label className="grid gap-2">Email <span className="text-xs font-normal text-muted-foreground">optional</span><Input aria-describedby={contactErrorsByField.email ? 'client-email-error' : undefined} aria-invalid={Boolean(contactErrorsByField.email)} maxLength={254} name="email" defaultValue={formValues.email} onBlur={() => validateContactField('email')} onChange={() => validateContactField('email')} type="email" />{contactErrorsByField.email && <span className="text-sm font-normal text-destructive" id="client-email-error">{contactErrorsByField.email}</span>}</Label><Label className="grid gap-2">Phone <span className="text-xs font-normal text-muted-foreground">optional</span><Input aria-describedby={contactErrorsByField.phone ? 'client-phone-error' : undefined} aria-invalid={Boolean(contactErrorsByField.phone)} autoComplete="tel" inputMode="numeric" maxLength={18} name="phone" defaultValue={formValues.phone} onChange={(event) => { event.currentTarget.value = formatPhone(event.currentTarget.value); checkDirty(); validateContactField('phone') }} pattern="[0-9() -]*" placeholder="(416) 555-0123" type="text" />{contactErrorsByField.phone && <span className="text-sm font-normal text-destructive" id="client-phone-error">{contactErrorsByField.phone}</span>}</Label></div>
      </section>
      {client && <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="client-status-package-heading"><div className="grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-start"><div><h2 id="client-status-package-heading" className="text-lg font-semibold">Client status</h2><p className="mt-1 text-sm text-muted-foreground">Control whether this client can be scheduled.</p><Label className="mt-5 grid max-w-xs gap-2">Status<select className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring" name="status" defaultValue={formValues.status}><option value="active">Active</option><option value="archived">Archived</option></select></Label></div><div className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0"><ClientPackagePanel clientID={client.id} clientName={`${client.firstName} ${client.lastName}`} embedded /></div></div></section>}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="starting-measurements-heading"><div><h2 id="starting-measurements-heading" className="text-lg font-semibold">Starting measurements</h2><p className="mt-1 text-sm text-muted-foreground">Optional baseline information for future progress tracking.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">Height <span className="text-xs font-normal text-muted-foreground">cm · optional</span><Input defaultValue={formValues.heightCm ?? ''} inputMode="decimal" maxLength={6} name="heightCm" onChange={(event) => { event.currentTarget.value = formatDecimalInput(event.currentTarget.value); checkDirty() }} placeholder="172" type="text" /></Label><Label className="grid gap-2">Starting weight <span className="text-xs font-normal text-muted-foreground">kg · optional</span><Input defaultValue={formValues.startingWeightKg ?? ''} inputMode="decimal" maxLength={6} name="startingWeightKg" onChange={(event) => { event.currentTarget.value = formatDecimalInput(event.currentTarget.value); checkDirty() }} placeholder="72.5" type="text" /></Label><Label className="grid gap-2">Recorded on <span className="text-xs font-normal text-muted-foreground">used when weight is entered</span><Input defaultValue={formValues.startingMeasurementDate || new Date().toISOString().slice(0, 10)} name="startingMeasurementDate" type="date" /></Label><Label className="grid gap-2 sm:col-span-2">Baseline notes <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea defaultValue={formValues.startingMeasurementNotes} maxLength={500} name="startingMeasurementNotes" placeholder="Any useful context for this measurement" /></Label></div></section>
      <section className="rounded-xl border border-border bg-muted/30 p-4 sm:p-6" aria-labelledby="scheduling-preference-heading"><h2 id="scheduling-preference-heading" className="text-lg font-semibold">Scheduling preference</h2><p className="mt-1 text-sm text-muted-foreground">A preferred time window helps with planning. It does not book a session.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">Preferred start <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="time" name="preferredStartTime" defaultValue={formValues.preferredStartTime} /></Label><Label className="grid gap-2">Preferred end <span className="text-xs font-normal text-muted-foreground">optional</span><Input type="time" name="preferredEndTime" defaultValue={formValues.preferredEndTime} /></Label></div></section>
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="training-context-heading"><h2 id="training-context-heading" className="text-lg font-semibold">Training context</h2><div className="mt-5 grid gap-4"><Label className="grid gap-2">Training goals <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={2000} name="goals" defaultValue={formValues.goals} /></Label><Label className="grid gap-2">Private notes <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={4000} name="notes" defaultValue={formValues.notes} /></Label></div></section>
      {isDirty && <footer className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6 lg:left-64 lg:bottom-0 lg:px-10" aria-label="Unsaved client changes"><div className="mx-auto flex w-full max-w-7xl flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button className="min-h-11 w-full sm:w-auto" onClick={cancelChanges} type="button" variant="outline">Cancel</Button><Button className="min-h-11 w-full sm:w-auto" type="submit">{isEditing ? 'Save changes' : 'Add client'}</Button></div></footer>}
    </form>
  </section>
}

function OrganizationSetup({ email, error, onSubmit }: { email: string; error: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="text-foreground"><Card className="mx-auto mt-16 max-w-lg"><CardContent className="p-8"><p className={workspaceEyebrowClass}>TRAINER WORKSPACE</p><h1 className="mt-3 text-4xl font-semibold leading-none tracking-tight">Set up your training business</h1><p className="mt-4 leading-7 text-muted-foreground">You are signed in as <strong>{email}</strong>. Create your organization to start managing client records.</p><form className="mt-6 grid gap-4" onSubmit={onSubmit}><Label>Business name<Input name="displayName" required minLength={2} maxLength={80} autoComplete="organization" placeholder="Your training business" /></Label><Button className="justify-between sm:w-fit" type="submit">Create workspace <span aria-hidden="true">→</span></Button></form>{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}</CardContent></Card></section>
}
