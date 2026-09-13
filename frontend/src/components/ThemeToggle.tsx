import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const preferenceStorageKey = 'shwayfit-theme-preference'

function storedPreference(): Theme | null {
  try {
    const stored = window.localStorage.getItem(preferenceStorageKey)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function initialTheme(): Theme {
  const stored = storedPreference()
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (storedPreference()) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const followSystem = () => setTheme(mediaQuery.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', followSystem)
    return () => mediaQuery.removeEventListener('change', followSystem)
  }, [])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-secondary text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2"
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      onClick={() => {
        setTheme(nextTheme)
        try {
          window.localStorage.setItem(preferenceStorageKey, nextTheme)
        } catch {
          // Theme choice remains available for this session when storage is blocked.
        }
      }}
    >
      <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
    </button>
  )
}
