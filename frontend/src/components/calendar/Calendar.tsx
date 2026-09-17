import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, PencilLine, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { api } from '../../lib/api'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { cn } from '../../lib/utils'

type CalendarView = 'today' | 'week' | 'month'
type Client = { id: string; firstName: string; lastName: string; status: 'active' | 'archived' }
type Appointment = { id: string; clientId: string; startAt: string; durationMinutes: number; notes?: string; status: 'scheduled' | 'completed' }
type ClientPackage = { id: string; packageName: string; includedSessions: number; remainingSessions: number; status: 'active' | 'completed' }
type AppointmentCompletion = { appointment: Appointment; clientPackage: ClientPackage }

const hourHeight = 64
const hours = Array.from({ length: 24 }, (_, hour) => hour)
const dayHeaderFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const todayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const rangeFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

function atStartOfDay(date: Date) { const result = new Date(date); result.setHours(0, 0, 0, 0); return result }
function addDays(date: Date, amount: number) { const result = new Date(date); result.setDate(result.getDate() + amount); return result }
function addMonths(date: Date, amount: number) { const result = new Date(date); result.setDate(1); result.setMonth(result.getMonth() + amount); return result }
function startOfWeek(date: Date) { const result = atStartOfDay(date); result.setDate(result.getDate() - ((result.getDay() + 6) % 7)); return result }
function isSameDay(first: Date, second: Date) { return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate() }
function formatHour(hour: number) { return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(2026, 0, 1, hour)) }
function toLocalDateTimeValue(date: Date) { const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16) }
function atHour(date: Date, hour: number) { const result = atStartOfDay(date); result.setHours(hour, 0, 0, 0); return result }

function monthDays(date: Date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay())
  return Array.from({ length: 35 }, (_, index) => addDays(gridStart, index))
}

function periodDays(view: CalendarView, date: Date) {
  if (view === 'today') return [date]
  return Array.from({ length: 5 }, (_, index) => addDays(startOfWeek(date), index))
}

function periodLabel(view: CalendarView, date: Date, days: Date[]) {
  if (view === 'today') return todayFormatter.format(date)
  if (view === 'month') return monthFormatter.format(date)
  return `${rangeFormatter.format(days[0])} – ${rangeFormatter.format(days.at(-1) ?? days[0])}`
}

function appointmentRange(view: CalendarView, date: Date) {
  if (view === 'month') { const days = monthDays(date); return { from: days[0], to: addDays(days.at(-1) ?? days[0], 1) } }
  const days = periodDays(view, date)
  return { from: days[0], to: addDays(days.at(-1) ?? days[0], 1) }
}

function clientName(clientID: string, clients: Client[]) {
  const client = clients.find((item) => item.id === clientID)
  return client ? `${client.firstName} ${client.lastName}` : 'Client'
}

function CalendarViewToggle({ onChange, value }: { onChange: (view: CalendarView) => void; value: CalendarView }) {
  const items: Array<{ label: string; value: CalendarView }> = [{ label: 'Today', value: 'today' }, { label: 'Week', value: 'week' }, { label: 'Month', value: 'month' }]
  return <div aria-label="Calendar view" className="inline-flex w-fit rounded-lg bg-muted p-1" role="tablist">{items.map((item) => <button aria-selected={value === item.value} className={cn('min-h-11 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2', value === item.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')} key={item.value} onClick={() => onChange(item.value)} role="tab" type="button">{item.label}</button>)}</div>
}

function TimeGrid({ appointments, clients, days, onBookSlot, onSelectAppointment }: { appointments: Appointment[]; clients: Client[]; days: Date[]; onBookSlot: (startAt: Date) => void; onSelectAppointment: (appointment: Appointment) => void }) {
  const gridTemplateColumns = `4rem repeat(${days.length}, minmax(0, 1fr))`
  const today = new Date()
  return <div aria-label="Calendar time grid" className="overflow-x-auto rounded-xl border border-border bg-card"><div className="min-w-[27.5rem]" style={{ minWidth: days.length === 1 ? '27.5rem' : '51.25rem' }}>
    <div className="grid border-b border-border bg-muted/40" style={{ gridTemplateColumns }}><div />{days.map((day) => <div className={cn('p-3 text-center text-sm', isSameDay(day, today) ? 'font-semibold text-primary' : 'text-muted-foreground')} key={day.toISOString()}>{dayHeaderFormatter.format(day)}</div>)}</div>
    <div className="grid" style={{ gridTemplateColumns }}><div className="relative bg-muted/20" style={{ height: hours.length * hourHeight }}>{hours.map((hour) => <span className="absolute left-0 w-full -translate-y-1/2 pr-3 text-right text-xs text-muted-foreground" key={hour} style={{ top: hour * hourHeight }}>{formatHour(hour)}</span>)}</div>
      {days.map((day) => <div className="relative border-l border-border" key={day.toISOString()} style={{ height: hours.length * hourHeight }}><p className="sr-only">{todayFormatter.format(day)}</p>{hours.map((hour) => <span aria-hidden="true" className="absolute left-0 w-full border-t border-border/80" key={hour} style={{ top: hour * hourHeight }} />)}{hours.map((hour) => <button aria-label={`Book appointment on ${todayFormatter.format(day)} at ${formatHour(hour)}`} className="absolute inset-x-px z-0 min-h-11 rounded-sm transition-colors hover:bg-accent/45 focus-visible:z-20 focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-[-3px]" key={`slot-${hour}`} onClick={() => onBookSlot(atHour(day, hour))} style={{ top: hour * hourHeight, height: hourHeight }} type="button"><span className="sr-only">Book at {formatHour(hour)}</span></button>)}{appointments.filter((appointment) => isSameDay(new Date(appointment.startAt), day)).map((appointment) => { const start = new Date(appointment.startAt); const minutes = start.getHours() * 60 + start.getMinutes(); return <button aria-label={`View ${clientName(appointment.clientId, clients)} appointment`} className={cn('absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 px-2 py-1.5 text-left text-xs shadow-sm transition-colors focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2', appointment.status === 'completed' ? 'border-success bg-success/10 text-foreground' : 'border-primary bg-accent hover:bg-accent/80')} key={appointment.id} onClick={() => onSelectAppointment(appointment)} style={{ top: Math.max(4, minutes / 60 * hourHeight + 4), height: Math.max(44, appointment.durationMinutes / 60 * hourHeight - 6) }} type="button"><p className="font-semibold">{timeFormatter.format(start)}</p><p className="mt-0.5 truncate font-medium">{clientName(appointment.clientId, clients)}</p><p className="mt-0.5 truncate text-muted-foreground">{appointment.status === 'completed' ? 'Completed' : `${appointment.durationMinutes} min`}</p></button> })}</div>)}</div>
  </div></div>
}

function MonthGrid({ appointments, clients, date, onSelectDay }: { appointments: Appointment[]; clients: Client[]; date: Date; onSelectDay: (date: Date) => void }) {
  const days = useMemo(() => monthDays(date), [date])
  const today = new Date()
  return <div aria-label="Calendar month grid" className="overflow-x-auto rounded-xl border border-border bg-card"><div className="min-w-[45rem]"><div className="grid grid-cols-7 border-b border-border bg-muted/40">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div className="p-3 text-center text-xs font-medium text-muted-foreground" key={day}>{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => { const scheduled = appointments.filter((appointment) => isSameDay(new Date(appointment.startAt), day)); return <button className={cn('min-h-28 border-r border-b border-border p-2 text-left transition-colors hover:bg-accent/25 focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-[-3px]', day.getMonth() !== date.getMonth() && 'bg-muted/25 text-muted-foreground')} key={day.toISOString()} onClick={() => onSelectDay(day)} type="button"><span className={cn('grid size-7 place-items-center rounded-full text-sm', isSameDay(day, today) && 'bg-primary text-primary-foreground')}>{day.getDate()}</span>{scheduled.slice(0, 2).map((appointment) => <span className="mt-1 block truncate rounded bg-accent px-1.5 py-1 text-xs text-accent-foreground" key={appointment.id}>{timeFormatter.format(new Date(appointment.startAt))} {clientName(appointment.clientId, clients)}</span>)}</button> })}</div></div></div>
}

function BookingDialog({ appointments, clients, initialClientID, initialStartAt, onBooked, onOpenChange, open }: { appointments: Appointment[]; clients: Client[]; initialClientID: string; initialStartAt: Date | null; onBooked: (appointment: Appointment) => void; onOpenChange: (open: boolean) => void; open: boolean }) {
  const [clientID, setClientID] = useState(initialClientID)
  const [startAt, setStartAt] = useState(() => toLocalDateTimeValue(initialStartAt ?? new Date()))
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const start = new Date(startAt)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const overlaps = Number.isNaN(start.getTime()) ? 0 : appointments.filter((appointment) => { const otherStart = new Date(appointment.startAt); const otherEnd = new Date(otherStart.getTime() + appointment.durationMinutes * 60_000); return start < otherEnd && end > otherStart }).length

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (Number.isNaN(start.getTime())) { setError('Choose a valid appointment time.'); return }
    try { setIsSaving(true); setError(null); const appointment = await api('/api/v1/organizations/current/appointments', { method: 'POST', body: JSON.stringify({ clientId: clientID, startAt: start.toISOString(), durationMinutes, notes }) }) as Appointment; onBooked(appointment); onOpenChange(false) } catch (caught) { setError(caught instanceof Error ? caught.message : 'ShwayFit could not book this appointment.') } finally { setIsSaving(false) }
  }

  return <Dialog onOpenChange={onOpenChange} open={open}><DialogContent><DialogHeader><DialogTitle>Book an appointment</DialogTitle><DialogDescription>Booking does not use a package session. Completion is recorded separately.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={(event) => void submit(event)}><Label className="grid gap-2">Client<select className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring" onChange={(event) => setClientID(event.target.value)} required value={clientID}><option value="">Select a client</option>{clients.filter((client) => client.status === 'active').map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>)}</select></Label><div className="grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">Start time<Input onChange={(event) => setStartAt(event.target.value)} required type="datetime-local" value={startAt} /></Label><Label className="grid gap-2">Duration<select className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring" onChange={(event) => setDurationMinutes(Number(event.target.value))} value={durationMinutes}>{[30, 45, 60, 75, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></Label></div>{overlaps > 0 && <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground" role="status">This overlaps with {overlaps} scheduled appointment{overlaps === 1 ? '' : 's'}. You can still book it.</p>}<Label className="grid gap-2">Notes <span className="text-xs font-normal text-muted-foreground">optional</span><Textarea maxLength={2000} onChange={(event) => setNotes(event.target.value)} value={notes} /></Label>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<DialogFooter><Button onClick={() => onOpenChange(false)} type="button" variant="outline">Cancel</Button><Button disabled={isSaving || !clientID} type="submit">{isSaving ? 'Booking…' : 'Book appointment'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function CompleteAppointmentDialog({ appointment, client, onCompleted, onOpenChange }: { appointment: Appointment | null; client?: Client; onCompleted: (completion: AppointmentCompletion) => void; onOpenChange: (open: boolean) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const open = appointment !== null

  async function complete() {
    if (!appointment) return
    try {
      setIsSaving(true)
      setError(null)
      const key = crypto.randomUUID()
      const completion = await api(`/api/v1/organizations/current/appointments/${appointment.id}/complete`, { method: 'POST', headers: { 'Idempotency-Key': key } }) as AppointmentCompletion
      onCompleted(completion)
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ShwayFit could not complete this session.')
    } finally {
      setIsSaving(false)
    }
  }

  return <Dialog onOpenChange={onOpenChange} open={open}><DialogContent><DialogHeader><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">SESSION COMPLETION</p><DialogTitle>{appointment?.status === 'completed' ? 'Session completed' : 'Complete session?'}</DialogTitle><DialogDescription>{client ? `${client.firstName} ${client.lastName}` : 'Client'} · {appointment ? timeFormatter.format(new Date(appointment.startAt)) : ''}</DialogDescription></DialogHeader>{appointment?.status === 'completed' ? <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-foreground">This session is already complete. Its package debit has been recorded.</p> : <><p className="text-sm leading-6 text-muted-foreground">Completing this session uses one remaining package session. This action cannot be undone from the calendar.</p>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<DialogFooter><Button disabled={isSaving} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancel</Button><Button disabled={isSaving} onClick={() => void complete()} type="button"><CalendarCheck aria-hidden="true" className="size-4" />{isSaving ? 'Completing…' : 'Complete session'}</Button></DialogFooter></>}</DialogContent></Dialog>
}

export function Calendar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<CalendarView>('week')
  const [anchorDate, setAnchorDate] = useState(() => atStartOfDay(new Date()))
  const [clients, setClients] = useState<Client[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [error, setError] = useState<string | null>(null)
  const isBooking = searchParams.get('book') === '1'
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [slotStartAt, setSlotStartAt] = useState<Date | null>(null)
  const days = useMemo(() => periodDays(view, anchorDate), [anchorDate, view])
  const range = useMemo(() => appointmentRange(view, anchorDate), [anchorDate, view])

  useEffect(() => { let current = true; void Promise.all([api('/api/v1/organizations/current/clients') as Promise<{ clients: Client[] }>, api(`/api/v1/organizations/current/appointments?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`) as Promise<{ appointments: Appointment[] }>]).then(([clientResult, appointmentResult]) => { if (current) { setClients(clientResult.clients); setAppointments(appointmentResult.appointments); setError(null) } }).catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : 'ShwayFit could not load the calendar.') }); return () => { current = false } }, [range.from, range.to])

  function movePeriod(amount: number) { setAnchorDate((current) => view === 'month' ? addMonths(current, amount) : addDays(current, amount * (view === 'week' ? 7 : 1))) }
  function selectMonthDay(date: Date) { setAnchorDate(atStartOfDay(date)); setView('today') }
  function setBooking(open: boolean) {
    if (!open) setSlotStartAt(null)
    navigate(open ? `/schedule?book=1${searchParams.get('client') ? `&client=${encodeURIComponent(searchParams.get('client') ?? '')}` : ''}` : '/schedule', { replace: true })
  }
  function openBookingAt(startAt?: Date) { setSlotStartAt(startAt ?? null); setBooking(true) }

  return <section aria-labelledby="calendar-heading"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-primary">Trainer schedule</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl" id="calendar-heading">Calendar</h1><p className="mt-2 text-muted-foreground">Manage training sessions across your schedule.</p></div><Button onClick={() => openBookingAt()} type="button"><Plus aria-hidden="true" className="size-4" />Book appointment</Button></header><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CalendarViewToggle onChange={setView} value={view} /><div aria-label="Calendar date controls" className="flex items-center gap-2"><Button aria-label="Previous period" onClick={() => movePeriod(-1)} size="icon" type="button" variant="outline"><ChevronLeft aria-hidden="true" className="size-4" /></Button><p aria-live="polite" className="min-w-36 text-center text-sm font-medium">{periodLabel(view, anchorDate, days)}</p><Button aria-label="Next period" onClick={() => movePeriod(1)} size="icon" type="button" variant="outline"><ChevronRight aria-hidden="true" className="size-4" /></Button><Button className="hidden sm:inline-flex" onClick={() => setAnchorDate(atStartOfDay(new Date()))} size="sm" type="button" variant="outline">Go to current</Button></div><Button className="sm:hidden" onClick={() => setAnchorDate(atStartOfDay(new Date()))} type="button" variant="outline">Go to current</Button></div><div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-sm text-foreground"><PencilLine aria-hidden="true" className="size-4 shrink-0 text-primary" /><p><span className="font-medium">Click an open time slot to book.</span> Select an appointment to complete it.</p></div>{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}<div className="mt-5">{view === 'month' ? <MonthGrid appointments={appointments} clients={clients} date={anchorDate} onSelectDay={selectMonthDay} /> : <TimeGrid appointments={appointments} clients={clients} days={days} onBookSlot={openBookingAt} onSelectAppointment={setSelectedAppointment} />}</div>{appointments.length === 0 && <section aria-label="Calendar availability" className="mt-5 grid place-items-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-full bg-secondary text-secondary-foreground"><CalendarDays aria-hidden="true" className="size-5" /></span><h2 className="mt-4 font-semibold">No appointments scheduled</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Book a session to begin building this schedule.</p></div></section>}<BookingDialog key={`${isBooking}-${searchParams.get('client') ?? ''}-${slotStartAt?.toISOString() ?? 'now'}`} appointments={appointments} clients={clients} initialClientID={searchParams.get('client') ?? ''} initialStartAt={slotStartAt} onBooked={(appointment) => setAppointments((current) => [...current, appointment])} onOpenChange={setBooking} open={isBooking} /><CompleteAppointmentDialog appointment={selectedAppointment} client={clients.find((client) => client.id === selectedAppointment?.clientId)} onCompleted={(completion) => { setAppointments((current) => current.map((appointment) => appointment.id === completion.appointment.id ? completion.appointment : appointment)); setSelectedAppointment(completion.appointment) }} onOpenChange={(open) => { if (!open) setSelectedAppointment(null) }} /></section>
}
