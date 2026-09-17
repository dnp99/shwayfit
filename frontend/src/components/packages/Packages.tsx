import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Archive, Package, PackagePlus } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { api } from '../../lib/api'

type PackageOption = {
  id: string
  name: string
  includedSessions: number
  status: 'active' | 'archived'
}

type PackageFilter = PackageOption['status']

export function Packages() {
  const [options, setOptions] = useState<PackageOption[]>([])
  const [filter, setFilter] = useState<PackageFilter>('active')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const needsFirstPackage = !isLoading && options.length === 0
  const activeCount = options.filter((option) => option.status === 'active').length
  const archivedCount = options.filter((option) => option.status === 'archived').length
  const visibleOptions = useMemo(() => options.filter((option) => option.status === filter), [filter, options])

  useEffect(() => {
    void api('/api/v1/organizations/current/package-options')
      .then((result) => setOptions((result as { packageOptions: PackageOption[] }).packageOptions))
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'ShwayFit could not load package options.'))
      .finally(() => setIsLoading(false))
  }, [])

  async function createOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    try {
      setIsSaving(true)
      setError(null)
      const option = await api('/api/v1/organizations/current/package-options', {
        method: 'POST',
        body: JSON.stringify({ name: values.get('name'), includedSessions: Number(values.get('includedSessions')) }),
      }) as PackageOption
      setOptions((current) => [...current, option].sort((a, b) => a.name.localeCompare(b.name)))
      setFilter('active')
      form.reset()
      setIsDialogOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ShwayFit could not create this package option.')
    } finally {
      setIsSaving(false)
    }
  }

  async function archiveOption(optionID: string) {
    try {
      setError(null)
      const option = await api(`/api/v1/organizations/current/package-options/${optionID}/archive`, { method: 'PATCH' }) as PackageOption
      setOptions((current) => current.map((item) => item.id === option.id ? option : item))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ShwayFit could not archive this package option.')
    }
  }

  return <section className="mx-auto max-w-7xl text-foreground">
    <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-primary">Business setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Session packages</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Create reusable session allowances, then assign them to individual clients.</p>
      </div>
      <PackageOptionDialog isOpen={isDialogOpen} needsFirstPackage={needsFirstPackage} isSaving={isSaving} onOpenChange={setIsDialogOpen} onSubmit={createOption} />
    </header>

    {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}

    <section className="mt-6 rounded-xl border border-border bg-secondary/60 p-5 sm:p-6" aria-labelledby="package-template-heading">
      <h2 className="text-lg font-semibold" id="package-template-heading">Package options are templates</h2>
      <p className="mt-2 leading-7 text-muted-foreground">A client’s remaining balance and session history are managed from their profile.</p>
    </section>

    <section className="mt-10" aria-labelledby="package-list-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight" id="package-list-heading">Available packages</h2>
          <p className="mt-2 text-muted-foreground">{activeCount} active {activeCount === 1 ? 'option' : 'options'}</p>
        </div>
        <div className="inline-flex min-h-11 w-full rounded-lg bg-muted p-1 sm:w-auto" role="tablist" aria-label="Package status">
          <button aria-selected={filter === 'active'} className={`min-h-9 flex-1 rounded-md px-3 text-sm font-medium transition-colors sm:flex-none ${filter === 'active' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setFilter('active')} role="tab" type="button">Active <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">{activeCount}</span></button>
          <button aria-selected={filter === 'archived'} className={`min-h-9 flex-1 rounded-md px-3 text-sm font-medium transition-colors sm:flex-none ${filter === 'archived' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setFilter('archived')} role="tab" type="button">Archived <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">{archivedCount}</span></button>
        </div>
      </div>

      <div className="mt-6" role="tabpanel">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading package options…</p>
          : visibleOptions.length === 0 ? <EmptyPackageState filter={filter} onCreate={() => setIsDialogOpen(true)} />
            : <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleOptions.map((option) => <li key={option.id}><PackageOptionCard onArchive={() => void archiveOption(option.id)} option={option} /></li>)}</ul>}
      </div>
    </section>
  </section>
}

function PackageOptionCard({ option, onArchive }: { option: PackageOption; onArchive: () => void }) {
  return <Card className="h-full"><CardContent className="flex h-full min-h-64 flex-col p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><Package aria-hidden="true" className="size-6" /></span>{option.status === 'archived' && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Archived</span>}</div><div className="mt-8"><h3 className="text-xl font-semibold tracking-tight">{option.name}</h3><p className="mt-2 leading-6 text-muted-foreground">Reusable session allowance for a client package.</p></div><div className="mt-6 rounded-xl bg-muted/70 p-4"><p className="text-3xl font-semibold tracking-tight">{option.includedSessions}</p><p className="mt-1 text-sm text-muted-foreground">{option.includedSessions === 1 ? 'Session included' : 'Sessions included'}</p></div><div className="mt-auto flex items-center justify-between gap-3 pt-6"><span className={option.status === 'active' ? 'inline-flex items-center gap-2 text-sm font-medium text-success before:size-2 before:rounded-full before:bg-success' : 'text-sm font-medium text-muted-foreground'}>{option.status === 'active' ? 'Active' : 'Archived'}</span>{option.status === 'active' && <Button className="min-h-11" onClick={onArchive} type="button" variant="ghost"><Archive aria-hidden="true" className="size-4" />Archive</Button>}</div></CardContent></Card>
}

function EmptyPackageState({ filter, onCreate }: { filter: PackageFilter; onCreate: () => void }) {
  if (filter === 'archived') return <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">No archived package options.</div>
  return <div className="grid gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-6 sm:p-8"><PackagePlus className="size-6 text-primary" aria-hidden="true" /><p className="font-medium text-foreground">Start with one package you already offer.</p><p className="max-w-xl leading-6 text-muted-foreground">For example, add a single session or a five-session package. You can add more options any time.</p><Button className="mt-1 min-h-11 w-full sm:w-fit" onClick={onCreate} type="button"><PackagePlus aria-hidden="true" className="size-4" />Create package</Button></div>
}

function PackageOptionDialog({ isOpen, onOpenChange, isSaving, needsFirstPackage, onSubmit }: { isOpen: boolean; onOpenChange: (open: boolean) => void; isSaving: boolean; needsFirstPackage: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogTrigger asChild><Button className="min-h-11" type="button"><PackagePlus className="size-4" aria-hidden="true" />{needsFirstPackage ? 'Create your first package' : 'Create package'}</Button></DialogTrigger><DialogContent><DialogHeader><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">PACKAGE OPTION</p><DialogTitle>{needsFirstPackage ? 'Create your first package' : 'Create a package'}</DialogTitle><DialogDescription>Choose the name your clients recognize and the number of sessions it includes.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}><Label>Package name<Input autoFocus={needsFirstPackage} required name="name" minLength={2} maxLength={80} placeholder="Five sessions" /></Label><Label>Included sessions<Input required name="includedSessions" type="number" min={1} max={100} inputMode="numeric" placeholder="5" /></Label><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button disabled={isSaving} type="submit">{isSaving ? 'Creating…' : 'Create package'}</Button></DialogFooter></form></DialogContent></Dialog>
}
