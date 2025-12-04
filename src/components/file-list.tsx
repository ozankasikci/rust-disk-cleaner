import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatBytes } from "@/lib/format"
import type { ScannedItem } from "@/types"

interface FileListProps {
  items: ScannedItem[]
  selectedIds: Set<string>
  onToggleItem: (id: string) => void
  onToggleAll: (ids: string[]) => void
  onOpenInFinder: (path: string) => void
}

export function FileList({
  items,
  selectedIds,
  onToggleItem,
  onToggleAll,
  onOpenInFinder
}: FileListProps) {
  // Group items by their group property
  const groups = items.reduce((acc, item) => {
    const group = item.group || "Other"
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, ScannedItem[]>)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {Object.entries(groups).map(([group, groupItems]) => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-sm">{group}</h3>
              <span className="text-xs text-muted-foreground">
                {groupItems.length} items
              </span>
            </div>
            <div className="space-y-1">
              {groupItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => onToggleItem(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.path}
                    </p>
                  </div>
                  <span className="font-mono text-sm shrink-0">
                    {formatBytes(item.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
