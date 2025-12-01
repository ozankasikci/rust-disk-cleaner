import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 bg-destructive/10 px-6 py-3 border-b border-destructive/20">
      <div className="icon-container-sm bg-destructive/20 shrink-0">
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
      </div>
      <span className="flex-1 text-sm text-destructive">{message}</span>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/20"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
