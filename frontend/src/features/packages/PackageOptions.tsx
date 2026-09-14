import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Archive, PackagePlus } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { api } from '../../lib/api'

type PackageOption = {
  id: string
  name: string
  includedSessions: number
  status: 'active' | 'archived'
}

export function PackageOptions() {
  const [options, setOptions] = useState<PackageOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
      form.reset()
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

  return <section className="mx-auto max-w-5xl text-foreground">
    <header className="border-b border-border pb-6">
      <p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">PACKAGE OPTIONS</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Session packages</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Create the reusable session allowances you offer. Assigning a package to a client and tracking its balance comes next.</p>
    </header>
    {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(18rem,.8fr)_minmax(24rem,1.2fr)]">
      <Card aria-labelledby="new-package-heading">
        <CardHeader><div><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">NEW OPTION</p><h2 id="new-package-heading" className="mt-1 text-xl font-semibold tracking-tight">Create a package</h2></div></CardHeader>
        <CardContent><form className="grid gap-4" onSubmit={createOption}>
          <Label>Package name<Input required name="name" minLength={2} maxLength={80} placeholder="Five sessions" /></Label>
          <Label>Included sessions<Input required name="includedSessions" type="number" min={1} max={100} inputMode="numeric" placeholder="5" /></Label>
          <Button className="justify-between sm:w-fit" disabled={isSaving} type="submit"><span>{isSaving ? 'Creating…' : 'Create package'}</span><PackagePlus className="size-4" aria-hidden="true" /></Button>
        </form></CardContent>
      </Card>
      <Card aria-labelledby="package-list-heading">
        <CardHeader><div><p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">YOUR OPTIONS</p><h2 id="package-list-heading" className="mt-1 text-xl font-semibold tracking-tight">Available packages</h2></div><span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground" aria-label={`${options.length} package options`}>{options.length}</span></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading package options…</p>
            : options.length === 0 ? <p className="text-sm leading-6 text-muted-foreground">Create your first package option to prepare for client balances.</p>
              : <ul className="-mx-4 border-t border-border">{options.map((option) => <li className="flex min-h-18 items-center gap-3 border-b border-border px-4 py-3 last:border-b-0" key={option.id}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground" aria-hidden="true">{option.includedSessions}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold">{option.name}</strong><span className="mt-1 block text-xs text-muted-foreground">{option.includedSessions} {option.includedSessions === 1 ? 'session' : 'sessions'}</span></span>
                {option.status === 'active' ? <Button type="button" variant="ghost" size="sm" aria-label={`Archive ${option.name}`} onClick={() => void archiveOption(option.id)}><Archive className="size-4" aria-hidden="true" />Archive</Button> : <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">Archived</span>}
              </li>)}</ul>}
        </CardContent>
      </Card>
    </div>
  </section>
}
