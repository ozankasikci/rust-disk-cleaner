import { ScrollArea } from "@/components/ui/scroll-area"
import { FileGroup } from "./file-group"
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
  onOpenInFinder,
}: FileListProps) {
  // Group items by subcategory
  const groups = items.reduce<Record<string, ScannedItem[]>>((acc, item) => {
    const key = item.subcategory
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {})

  // Sort groups by total size
  const sortedGroups = Object.entries(groups).sort((a, b) => {
    const sizeA = a[1].reduce((sum, item) => sum + item.size, 0)
    const sizeB = b[1].reduce((sum, item) => sum + item.size, 0)
    return sizeB - sizeA
  })

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border/40">
        {sortedGroups.map(([subcategory, groupItems]) => (
          <FileGroup
            key={subcategory}
            subcategory={subcategory}
            items={groupItems}
            selectedIds={selectedIds}
            onToggleItem={onToggleItem}
            onToggleAll={onToggleAll}
            onOpenInFinder={onOpenInFinder}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
