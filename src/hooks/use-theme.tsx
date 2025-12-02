import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type ThemeId = "midnight" | "sunset" | "forest"

const ThemeContext = createContext<{ theme: ThemeId; setTheme: (t: ThemeId) => void } | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>("midnight")

  useEffect(() => {
    document.documentElement.classList.add(`theme-${theme}`)
    return () => document.documentElement.classList.remove(`theme-${theme}`)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
