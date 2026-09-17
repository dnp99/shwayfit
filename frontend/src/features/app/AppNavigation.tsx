import { CalendarDays, Dumbbell, LayoutDashboard, Package, Plus, Settings, Sparkles, Users } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

const desktopItems = [
  { to: '/home', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/schedule', label: 'Calendar', icon: CalendarDays },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/packages', label: 'Packages', icon: Package },
] as const

const mobileItems = [
  { to: '/home', label: 'Today', icon: LayoutDashboard },
  { to: '/schedule', label: 'Calendar', icon: CalendarDays },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/packages', label: 'Packages', icon: Package },
] as const

function ProductBrand() {
  return <NavLink className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-sidebar-foreground" to="/home" aria-label="ShwayFit Today">
    <span className="relative grid size-10 place-items-center rounded-xl bg-sidebar-primary text-brand-lime" aria-hidden="true"><Dumbbell className="size-5" /><span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-brand-lime ring-2 ring-sidebar" /></span>
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

export function DesktopSidebar({ email }: { email: string }) {
  return <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex" aria-label="Product navigation">
    <ProductBrand />
    <nav className="mt-12 grid gap-1" aria-label="Primary product navigation">
      {desktopItems.map(({ to, label, icon: Icon }) => <NavLink className={({ isActive }) => navigationClass(isActive)} key={to} to={to}>
        <Icon className="size-5" aria-hidden="true" />{label}
      </NavLink>)}
    </nav>
    <div className="mt-auto grid gap-2 border-t border-sidebar-border pt-4">
      <NavLink className={({ isActive }) => navigationClass(isActive)} to="/settings"><Settings className="size-5" aria-hidden="true" />Settings</NavLink>
      <div className="flex min-h-14 items-center gap-3 rounded-xl border border-sidebar-border px-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground" aria-hidden="true">{email.slice(0, 1).toUpperCase() || 'T'}</span>
        <p className="min-w-0 truncate text-xs text-muted-foreground" title={email}>{email || 'Trainer'}</p>
      </div>
    </div>
  </aside>
}

export function DesktopUtilityBar() {
  const navigate = useNavigate()
  return <header className="hidden min-h-20 items-center justify-between border-b border-border px-10 lg:flex">
    <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"><Sparkles className="size-5 text-primary" aria-hidden="true" />Trainer workspace</p>
    <div className="flex items-center gap-3"><ThemeToggle /><Button onClick={() => navigate('/schedule?book=1')} type="button"><Plus className="size-4" aria-hidden="true" />Book appointment</Button></div>
  </header>
}

export function MobileHeader() {
  return <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
    <ProductBrand />
    <ThemeToggle />
  </header>
}

export function MobileBottomNav() {
  return <nav className="fixed inset-x-0 bottom-0 z-30 grid min-h-16 grid-cols-5 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden" aria-label="Primary product navigation">
    {mobileItems.slice(0, 2).map(({ to, label, icon: Icon }) => <NavLink className={({ isActive }) => cn('flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[0.6875rem] font-medium transition-colors focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-[-3px]', isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} key={to} to={to}>
      <Icon className="size-5" aria-hidden="true" />{label}
    </NavLink>)}
    <NavLink className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[0.6875rem] font-medium text-foreground transition-colors focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-[-3px]" to="/clients/new"><span className="-mt-7 grid size-12 place-items-center rounded-full border border-border bg-primary text-primary-foreground shadow-sm"><Plus className="size-5" aria-hidden="true" /></span><span className="-mt-0.5">Add</span></NavLink>
    {mobileItems.slice(2).map(({ to, label, icon: Icon }) => <NavLink className={({ isActive }) => cn('flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[0.6875rem] font-medium transition-colors focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-[-3px]', isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} key={to} to={to}>
      <Icon className="size-5" aria-hidden="true" />{label}
    </NavLink>)}
  </nav>
}
