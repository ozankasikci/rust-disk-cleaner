import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type ThemeId =
  | "midnight" | "sunset" | "forest" | "ocean" | "lavender"
  | "ember" | "arctic" | "slate" | "neon" | "sandstone"

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
  { id: "ember", name: "Ember", isDark: true },
  { id: "arctic", name: "Arctic", isDark: false },
  { id: "slate", name: "Slate", isDark: false },
  { id: "neon", name: "Neon", isDark: true },
  { id: "sandstone", name: "Sandstone", isDark: false },
]

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  currentTheme: Theme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = "rustdiskcleaner-theme"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && themes.some((t) => t.id === stored)) {
        return stored as ThemeId
      }
    }
    return "midnight"
  })

  const currentTheme = themes.find((t) => t.id === theme) || themes[0]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
    const root = document.documentElement
    themes.forEach((t) => root.classList.remove(`theme-${t.id}`))
    root.classList.add(`theme-${theme}`)

    if (currentTheme.isDark) {
      root.classList.remove("light")
    } else {
      root.classList.add("light")
    }
  }, [theme, currentTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
