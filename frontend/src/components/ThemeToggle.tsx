import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const preferenceStorageKey = 'shwayfit-theme-preference'

function initialTheme(): Theme {
  const stored = window.localStorage.getItem(preferenceStorageKey)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (window.localStorage.getItem(preferenceStorageKey)) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const followSystem = () => setTheme(mediaQuery.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', followSystem)
    return () => mediaQuery.removeEventListener('change', followSystem)
  }, [])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      onClick={() => {
        setTheme(nextTheme)
        window.localStorage.setItem(preferenceStorageKey, nextTheme)
      }}
    >
      <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
    </button>
  )
}
