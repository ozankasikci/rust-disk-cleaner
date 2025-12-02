import { Settings, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useTheme, themes } from "@/hooks/use-theme"

export function SettingsPopover() {
  const { theme, setTheme } = useTheme()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-72 p-3"
        sideOffset={8}
      >
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1">Theme</h4>
            <p className="text-xs text-muted-foreground">
              Choose your preferred color theme
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`
                  group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-all
                  hover:bg-accent/50
                  ${theme === t.id ? "bg-accent ring-1 ring-primary" : ""}
                `}
                title={`${t.name} - ${t.description}`}
              >
                <div
                  className="h-8 w-8 rounded-md border border-border/50 overflow-hidden relative"
                  style={{ backgroundColor: t.preview.bg }}
                >
                  <div
                    className="absolute bottom-0 right-0 h-4 w-4 rounded-tl-md"
                    style={{ backgroundColor: t.preview.accent }}
                  />
                  {theme === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Check className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium truncate w-full text-center">
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
