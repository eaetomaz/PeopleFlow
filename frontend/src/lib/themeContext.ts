import { createContext, useContext } from 'react'
import type { ThemePreference } from '@/types/api'

export interface ThemeContextValue {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (value: ThemePreference, origin?: { x: number; y: number }) => void
  toggle: (origin?: { x: number; y: number }) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme fora do ThemeProvider')
  return context
}
