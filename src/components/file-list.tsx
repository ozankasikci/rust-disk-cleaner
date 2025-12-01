import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatBytes } from "@/lib/format"
import type { ScannedItem } from "@/types"

interface FileListProps {
  items: ScannedItem[]
  selectedIds: Set<string>
  onToggleItem: (id: string) => void
}

export function FileList({ items, selectedIds, onToggleItem }: FileListProps) {
  return (
    <ScrollArea className="h-full">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 p-3 border-b">
          <Checkbox
            checked={selectedIds.has(item.id)}
            onCheckedChange={() => onToggleItem(item.id)}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground truncate">{item.path}</p>
          </div>
          <span className="font-mono text-sm">{formatBytes(item.size)}</span>
        </div>
      ))}
    </ScrollArea>
  )
}
