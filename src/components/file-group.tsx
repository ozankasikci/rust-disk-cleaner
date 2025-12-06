import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react"
import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { formatBytes } from "@/lib/format"
import type { ScannedItem } from "@/types"

interface FileGroupProps {
  name: string
  items: ScannedItem[]
  selectedIds: Set<string>
  onToggleItem: (id: string) => void
  onToggleAll: (ids: string[]) => void
}

export function FileGroup({ name, items, selectedIds, onToggleItem, onToggleAll }: FileGroupProps) {
  const [expanded, setExpanded] = useState(true)
  const totalSize = items.reduce((sum, item) => sum + item.size, 0)
  const selectedCount = items.filter(i => selectedIds.has(i.id)).length
  const allSelected = selectedCount === items.length

  return (
    <div className="border-b border-border/30">
      <div
        className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Checkbox
          checked={allSelected}
          onCheckedChange={() => onToggleAll(items.map(i => i.id))}
          onClick={(e) => e.stopPropagation()}
        />
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium flex-1">{name}</span>
        <span className="text-xs text-muted-foreground">{items.length} items</span>
        <span className="text-xs font-mono">{formatBytes(totalSize)}</span>
      </div>
      {expanded && (
        <div className="pl-8">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-muted/20">
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={() => onToggleItem(item.id)}
              />
              <span className="truncate flex-1 text-sm">{item.name}</span>
              <span className="text-xs font-mono text-muted-foreground">{formatBytes(item.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
