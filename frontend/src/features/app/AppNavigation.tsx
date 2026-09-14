import { CalendarDays, ChevronRight, CircleEllipsis, Home, Package, Settings, Users } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Button } from '../../components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { cn } from '../../lib/utils'

const primaryItems = [
  { to: '/home', label: 'Today', icon: Home },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
] as const

const moreItems = [
  { to: '/packages', label: 'Packages', description: 'Reusable session package options', icon: Package },
  { to: '/settings', label: 'Settings', description: 'Trainer and organization preferences', icon: Settings },
] as const

function ProductBrand() {
  return <NavLink className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-sidebar-foreground" to="/home" aria-label="ShwayFit Today">
    <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-xl font-semibold text-brand-lime" aria-hidden="true">s</span>
    <span className="text-lg">ShwayFit</span>
  </NavLink>
}

function navigationClass(isActive: boolean) {
  return cn(
    'relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-3 focus-visible:outline-sidebar-ring focus-visible:outline-offset-2',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
  )
}

function MoreNavigation({ compact = false }: { compact?: boolean }) {
  const { pathname } = useLocation()
  const isActive = moreItems.some((item) => pathname.startsWith(item.to))

  return <Dialog>
    <DialogTrigger asChild>
      <Button className={cn(compact ? 'h-auto min-h-11 w-full flex-col gap-0.5 px-2 text-[0.6875rem]' : 'w-full justify-start gap-3 px-3 font-medium', isActive && 'bg-sidebar-accent text-sidebar-accent-foreground')} variant="ghost">
        <CircleEllipsis className="size-5" aria-hidden="true" />
        <span>More</span>
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <p className="text-xs font-semibold tracking-[0.175em] text-secondary-foreground">SHWAYFIT</p>
        <DialogTitle>More</DialogTitle>
        <DialogDescription>Manage the parts of your business that do not need to be in your daily navigation.</DialogDescription>
      </DialogHeader>
      <nav className="grid gap-2" aria-label="More product navigation">
        {moreItems.map(({ to, label, description, icon: Icon }) => <DialogClose asChild key={to}>
          <NavLink className="flex min-h-14 items-center gap-3 rounded-lg border border-border px-3 text-card-foreground transition-colors hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring" to={to}>
            <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Icon className="size-5" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </NavLink>
        </DialogClose>)}
      </nav>
    </DialogContent>
  </Dialog>
}

export function DesktopSidebar({ email }: { email: string }) {
  return <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex" aria-label="Product navigation">
    <ProductBrand />
    <nav className="mt-10 grid gap-1" aria-label="Primary product navigation">
      {primaryItems.map(({ to, label, icon: Icon }) => <NavLink className={({ isActive }) => navigationClass(isActive)} key={to} to={to}>
        <Icon className="size-5" aria-hidden="true" />{label}
      </NavLink>)}
    </nav>
    <div className="mt-auto grid gap-2 border-t border-sidebar-border pt-4">
      <MoreNavigation />
      <div className="flex items-center justify-between gap-2 px-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground" title={email}>{email}</p>
        <ThemeToggle />
      </div>
    </div>
  </aside>
}

export function MobileHeader() {
  return <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
    <ProductBrand />
    <ThemeToggle />
  </header>
}

export function MobileBottomNav() {
  return <nav className="fixed inset-x-0 bottom-0 z-30 grid min-h-16 grid-cols-4 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden" aria-label="Primary product navigation">
    {primaryItems.map(({ to, label, icon: Icon }) => <NavLink className={({ isActive }) => cn('flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[0.6875rem] font-medium transition-colors focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-[-3px]', isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} key={to} to={to}>
      <Icon className="size-5" aria-hidden="true" />{label}
    </NavLink>)}
    <MoreNavigation compact />
  </nav>
}
