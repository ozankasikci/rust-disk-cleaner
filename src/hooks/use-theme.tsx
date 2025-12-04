import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type ThemeId =
  | "midnight"
  | "sunset"
  | "forest"
  | "ocean"
  | "lavender"
  | "ember"
  | "arctic"
  | "slate"
  | "neon"
  | "sandstone"
  | "rose"
  | "mint"
  | "cloud"
  | "honey"
  | "sky"
  | "dusk"
  | "storm"
  | "copper"
  | "moss"
  | "plum"

export interface Theme {
  id: ThemeId
  name: string
  description: string
  isDark: boolean
  preview: {
    bg: string
    accent: string
  }
}

export const themes: Theme[] = [
  // Dark themes
  { id: "midnight", name: "Midnight", description: "Deep dark with teal", isDark: true, preview: { bg: "#1a1a2e", accent: "#4fd1c5" } },
  { id: "sunset", name: "Sunset", description: "Warm coral tones", isDark: true, preview: { bg: "#1f1a1a", accent: "#f97316" } },
  { id: "forest", name: "Forest", description: "Deep greens", isDark: true, preview: { bg: "#1a1f1a", accent: "#22c55e" } },
  { id: "ocean", name: "Ocean", description: "Cool blues", isDark: true, preview: { bg: "#1a1a2e", accent: "#3b82f6" } },
  { id: "lavender", name: "Lavender", description: "Soft purples", isDark: true, preview: { bg: "#1f1a2e", accent: "#a855f7" } },
  { id: "ember", name: "Ember", description: "Fiery warmth", isDark: true, preview: { bg: "#1f1a1a", accent: "#ef4444" } },
  { id: "neon", name: "Neon", description: "Electric vibes", isDark: true, preview: { bg: "#0f0f1a", accent: "#ec4899" } },
  // Mid-dark themes
  { id: "dusk", name: "Dusk", description: "Twilight purple", isDark: true, preview: { bg: "#2d2a3d", accent: "#8b5cf6" } },
  { id: "storm", name: "Storm", description: "Blue-gray moody", isDark: true, preview: { bg: "#2a2f38", accent: "#6b7280" } },
  { id: "copper", name: "Copper", description: "Warm bronze", isDark: true, preview: { bg: "#2d2520", accent: "#d97706" } },
  { id: "moss", name: "Moss", description: "Earthy green", isDark: true, preview: { bg: "#252d25", accent: "#65a30d" } },
  { id: "plum", name: "Plum", description: "Deep berry", isDark: true, preview: { bg: "#2d2030", accent: "#c026d3" } },
  // Light themes
  { id: "arctic", name: "Arctic", description: "Light icy blue", isDark: false, preview: { bg: "#f0f9ff", accent: "#0ea5e9" } },
  { id: "slate", name: "Slate", description: "Clean neutrals", isDark: false, preview: { bg: "#f8fafc", accent: "#64748b" } },
  { id: "sandstone", name: "Sandstone", description: "Warm and earthy", isDark: false, preview: { bg: "#faf7f5", accent: "#d97706" } },
  { id: "rose", name: "Rose", description: "Soft pink", isDark: false, preview: { bg: "#fff1f2", accent: "#e11d48" } },
  { id: "mint", name: "Mint", description: "Fresh green", isDark: false, preview: { bg: "#f0fdf4", accent: "#10b981" } },
  { id: "cloud", name: "Cloud", description: "Soft white", isDark: false, preview: { bg: "#fafafa", accent: "#71717a" } },
  { id: "honey", name: "Honey", description: "Golden warmth", isDark: false, preview: { bg: "#fffbeb", accent: "#f59e0b" } },
  { id: "sky", name: "Sky", description: "Bright blue", isDark: false, preview: { bg: "#f0f9ff", accent: "#0284c7" } },
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
    return "storm"
  })

  const currentTheme = themes.find((t) => t.id === theme) || themes[0]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)

    // Remove all theme classes and add current one
    const root = document.documentElement
    themes.forEach((t) => root.classList.remove(`theme-${t.id}`))
    root.classList.add(`theme-${theme}`)

    // Handle light/dark mode class
    if (currentTheme.isDark) {
      root.classList.remove("light")
    } else {
      root.classList.add("light")
    }
  }, [theme, currentTheme])

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
