import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { themes, useTheme, type ThemeId } from "@/hooks/use-theme"

export function SettingsPopover() {
  const { theme, setTheme } = useTheme()
  const darkThemes = themes.filter(t => t.isDark)
  const lightThemes = themes.filter(t => !t.isDark)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Dark Themes</h4>
            <div className="grid grid-cols-6 gap-2">
              {darkThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${
                    theme === t.id ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                  }`}
                  style={{ backgroundColor: t.preview.bg }}
                  title={t.name}
                />
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Light Themes</h4>
            <div className="grid grid-cols-6 gap-2">
              {lightThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${
                    theme === t.id ? "border-primary ring-2 ring-primary/30" : "border-border"
                  }`}
                  style={{ backgroundColor: t.preview.bg }}
                  title={t.name}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
