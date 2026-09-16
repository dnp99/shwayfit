import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/button'

const shortDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' })
const longDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const monthDayFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' })

function startOfWeek(date: Date) {
  const start = new Date(date)
  const offset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - offset)
  start.setHours(0, 0, 0, 0)
  return start
}

function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function weekLabel(days: Date[]) {
  const first = monthDayFormatter.format(days[0])
  const last = monthDayFormatter.format(days.at(-1) ?? days[0])
  return `${first}–${last}`
}

export function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date().getDay()
    return today === 0 || today === 6 ? 0 : today - 1
  })
  const days = useMemo(() => Array.from({ length: 5 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const selectedDay = days[selectedDayIndex]

  function moveWeek(amount: number) {
    setWeekStart((current) => addDays(current, amount * 7))
  }

  function returnToCurrentWeek() {
    setWeekStart(startOfWeek(new Date()))
    const today = new Date().getDay()
    setSelectedDayIndex(today === 0 || today === 6 ? 0 : today - 1)
  }

  return <section aria-labelledby="calendar-heading">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-primary">{weekLabel(days)}</p>
        <h1 id="calendar-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Calendar</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">Review your training week and plan upcoming sessions.</p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Calendar date controls">
        <Button aria-label="Previous week" onClick={() => moveWeek(-1)} size="icon" type="button" variant="ghost"><ChevronLeft className="size-5" aria-hidden="true" /></Button>
        <Button onClick={returnToCurrentWeek} type="button" variant="outline">This week</Button>
        <Button aria-label="Next week" onClick={() => moveWeek(1)} size="icon" type="button" variant="ghost"><ChevronRight className="size-5" aria-hidden="true" /></Button>
      </div>
    </header>

    <div className="mt-8 sm:hidden">
      <label className="grid gap-2 text-sm font-medium">Day
        <select aria-label="Calendar day" className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring" onChange={(event) => setSelectedDayIndex(Number(event.target.value))} value={selectedDayIndex}>
          {days.map((day, index) => <option key={day.toISOString()} value={index}>{longDayFormatter.format(day)}</option>)}
        </select>
      </label>
      <section className="mt-4 grid min-h-64 place-items-center rounded-xl border border-border bg-card p-6 text-center" aria-label={`${longDayFormatter.format(selectedDay)} appointments`}>
        <div><span className="mx-auto grid size-11 place-items-center rounded-full bg-secondary text-secondary-foreground"><CalendarDays className="size-5" aria-hidden="true" /></span><h2 className="mt-4 font-semibold">No appointments scheduled</h2><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Appointments will appear here when scheduling is available.</p></div>
      </section>
    </div>

    <section className="mt-8 hidden overflow-hidden rounded-xl border border-border bg-card sm:block" aria-label="Weekly calendar">
      <div className="grid grid-cols-5 border-b border-border">
        {days.map((day) => <div className="px-4 py-3 text-center text-sm font-medium" key={day.toISOString()}>{shortDayFormatter.format(day)}</div>)}
      </div>
      <div className="grid min-h-112 grid-cols-5">
        {days.map((day) => <div className="border-r border-border p-4 last:border-r-0" key={day.toISOString()}><p className="sr-only">{longDayFormatter.format(day)}</p></div>)}
      </div>
      <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">Appointments will appear here when scheduling is available.</div>
    </section>
  </section>
}
