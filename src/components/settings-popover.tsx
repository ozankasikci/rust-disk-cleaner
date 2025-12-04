import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { themes, useTheme } from "@/hooks/use-theme"

export function SettingsPopover() {
  const { theme, setTheme } = useTheme()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Theme</h4>
          <div className="grid grid-cols-5 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`h-6 w-6 rounded-full border-2 ${
                  theme === t.id ? "border-primary" : "border-transparent"
                }`}
                style={{ backgroundColor: t.preview?.bg }}
                title={t.name}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
