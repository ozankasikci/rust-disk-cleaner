import { useState, useEffect } from "react"
import { Loader2, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTrash } from "@/hooks/use-trash"
import { formatBytes } from "@/lib/format"

interface TrashViewProps {
  onStatsUpdate: (stats: { itemCount: number; totalSize: number } | null) => void
}

export function TrashView({ onStatsUpdate }: TrashViewProps) {
  const { items, totalSize, isLoading, load, restore, purge } = useTrash()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    onStatsUpdate(items.length > 0 ? { itemCount: items.length, totalSize } : null)
  }, [items, totalSize, onStatsUpdate])

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRestore = async () => {
    await restore(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Trash2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Trash is empty</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={() => handleToggle(item.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">{item.original_path}</p>
              </div>
              <span className="font-mono text-sm">{formatBytes(item.size)}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={selectedIds.size === 0}
          onClick={handleRestore}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restore
        </Button>
        <Button variant="destructive" size="sm" onClick={purge}>
          Empty Trash
        </Button>
      </div>
    </div>
  )
}
