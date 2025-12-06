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

export function FileList({ items, selectedIds, onToggleItem, onToggleAll }: FileListProps) {
  const groups = items.reduce((acc, item) => {
    const group = item.group || "Other"
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, ScannedItem[]>)

  const sortedGroups = Object.entries(groups).sort((a, b) => {
    const sizeA = a[1].reduce((sum, i) => sum + i.size, 0)
    const sizeB = b[1].reduce((sum, i) => sum + i.size, 0)
    return sizeB - sizeA
  })

  return (
    <ScrollArea className="h-full">
      {sortedGroups.map(([name, groupItems]) => (
        <FileGroup
          key={name}
          name={name}
          items={groupItems}
          selectedIds={selectedIds}
          onToggleItem={onToggleItem}
          onToggleAll={onToggleAll}
        />
      ))}
    </ScrollArea>
  )
}
