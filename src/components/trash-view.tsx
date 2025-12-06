import { useState, useEffect } from "react"
import { Loader2, RotateCcw, Trash2, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTrash } from "@/hooks/use-trash"
import { formatBytes, formatDate } from "@/lib/format"

interface TrashViewProps {
  onStatsUpdate: (stats: { itemCount: number; totalSize: number } | null) => void
}

export function TrashView({ onStatsUpdate }: TrashViewProps) {
  const { items, totalSize, isLoading, load, restore, purge, deleteItem } = useTrash()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => { load() }, [load])
  useEffect(() => {
    onStatsUpdate(items.length > 0 ? { itemCount: items.length, totalSize } : null)
  }, [items, totalSize, onStatsUpdate])

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
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

  const selectedSize = items.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + i.size, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Trash2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-medium">Trash is empty</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2 border-b hover:bg-muted/30">
            <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => handleToggle(item.id)} />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">{item.original_path}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono">{formatBytes(item.size)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(item.deleted_at)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => restore([item.id])}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
              <Flame className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </ScrollArea>
      <div className="shrink-0 border-t p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map(i => i.id)))}>
            {selectedIds.size === items.length ? "Deselect All" : "Select All"}
          </Button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected · {formatBytes(selectedSize)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0} onClick={handleRestore}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            Restore
          </Button>
          <Button variant="destructive" size="sm" onClick={() => purge()}>
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Empty Trash
          </Button>
        </div>
      </div>
    </div>
  )
}
