import { useEffect, useState } from 'react'

type ThemePreference = 'system' | 'light' | 'dark'

const preferenceStorageKey = 'shwayfit-theme-preference'

function storedPreference(): ThemePreference {
  const value = window.localStorage.getItem(preferenceStorageKey)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function resolvedTheme(preference: ThemePreference) {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeSelect() {
  const [preference, setPreference] = useState<ThemePreference>(storedPreference)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      document.documentElement.dataset.theme = resolvedTheme(preference)
    }

    applyTheme()
    window.localStorage.setItem(preferenceStorageKey, preference)
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [preference])

  return (
    <label className="theme-select-label">
      <span className="visually-hidden">Colour theme</span>
      <select className="theme-select" value={preference} onChange={(event) => setPreference(event.target.value as ThemePreference)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  )
}
