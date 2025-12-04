import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type ThemeId = "midnight" | "sunset" | "forest" | "ocean" | "lavender"

export interface Theme {
  id: ThemeId
  name: string
  isDark: boolean
}

export const themes: Theme[] = [
  { id: "midnight", name: "Midnight", isDark: true },
  { id: "sunset", name: "Sunset", isDark: true },
  { id: "forest", name: "Forest", isDark: true },
  { id: "ocean", name: "Ocean", isDark: true },
  { id: "lavender", name: "Lavender", isDark: true },
]

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  currentTheme: Theme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>("midnight")

  const currentTheme = themes.find((t) => t.id === theme) || themes[0]

  useEffect(() => {
    const root = document.documentElement
    themes.forEach((t) => root.classList.remove(`theme-${t.id}`))
    root.classList.add(`theme-${theme}`)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
