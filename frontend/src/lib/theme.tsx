import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import type { ThemePreference } from '@/types/api'
import { ThemeContext } from './themeContext'
const storageKey = 'peopleflow.theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(storageKey)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    return 'system'
  }
  return 'system'
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return media().matches ? 'dark' : 'light'
  return preference
}

function paint(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#050D0E' : '#F4F8F8')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolve(readPreference()))

  useEffect(() => {
    const apply = () => {
      const next = resolve(preference)
      setResolved(next)
      paint(next)
    }
    apply()
    if (preference !== 'system') return
    const query = media()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [preference])

  const setPreference = useCallback((value: ThemePreference, origin?: { x: number; y: number }) => {
    try {
      localStorage.setItem(storageKey, value)
    } catch {
      setPreferenceState(value)
    }

    const next = resolve(value)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canAnimate = typeof document.startViewTransition === 'function' && !reduced && next !== document.documentElement.dataset.theme

    if (!canAnimate) {
      setPreferenceState(value)
      return
    }

    const x = origin?.x ?? window.innerWidth - 40
    const y = origin?.y ?? 40
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    const transition = document.startViewTransition(() => {
      paint(next)
      flushSync(() => {
        setPreferenceState(value)
        setResolved(next)
      })
    })

    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 520, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => undefined)
  }, [])

  const toggle = useCallback(
    (origin?: { x: number; y: number }) => setPreference(resolved === 'dark' ? 'light' : 'dark', origin),
    [resolved, setPreference],
  )

  const value = useMemo(() => ({ preference, resolved, setPreference, toggle }), [preference, resolved, setPreference, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
