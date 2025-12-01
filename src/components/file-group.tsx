import { useState } from "react"
import { ChevronDown, FolderOpen, Folder } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { formatBytes } from "@/lib/format"
import type { ScannedItem } from "@/types"

interface FileGroupProps {
  subcategory: string
  items: ScannedItem[]
  selectedIds: Set<string>
  onToggleItem: (id: string) => void
  onToggleAll: (ids: string[]) => void
  onOpenInFinder: (path: string) => void
}

function SizeDisplay({ size }: { size: number }) {
  const formatted = formatBytes(size)
  const colorClass = size > 1_000_000_000 ? "text-destructive" :
                     size > 100_000_000 ? "text-amber-500" :
                     "text-muted-foreground"

  return (
    <span className={`text-mono-small shrink-0 min-w-16 text-right ${colorClass}`}>
      {formatted}
    </span>
  )
}

export function FileGroup({
  subcategory,
  items,
  selectedIds,
  onToggleItem,
  onToggleAll,
  onOpenInFinder,
}: FileGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const totalSize = items.reduce((sum, item) => sum + item.size, 0)
  const allSelected = items.every((item) => selectedIds.has(item.id))
  const someSelected = items.some((item) => selectedIds.has(item.id))
  const selectedCount = items.filter((item) => selectedIds.has(item.id)).length

  const handleToggleAll = () => {
    onToggleAll(items.map((item) => item.id))
  }

  const totalSizeClass = totalSize > 1_000_000_000 ? "text-destructive" :
                         totalSize > 100_000_000 ? "text-amber-500" :
                         "text-primary"

  return (
    <div className="stagger-item">
      {/* Group Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-6 py-3 overflow-hidden transition-all duration-200 hover:bg-accent/50 group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="icon-container-md shrink-0 bg-muted transition-colors group-hover:bg-accent">
          <Folder className="h-4 w-4 text-muted-foreground" />
        </div>

        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onClick={(e) => {
            e.stopPropagation()
            handleToggleAll()
          }}
          className="shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />

        <div className="flex-1 w-0 min-w-0 overflow-hidden">
          <span className="text-sm font-medium truncate block">{subcategory}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
            <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
            {selectedCount > 0 && (
              <>
                <span>·</span>
                <span className="text-primary">{selectedCount} selected</span>
              </>
            )}
          </div>
        </div>

        <span className={`text-mono-value shrink-0 min-w-20 text-right ${totalSizeClass}`}>
          {formatBytes(totalSize)}
        </span>

        <div className="icon-container-sm shrink-0 transition-transform duration-200"
             style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Expanded Items */}
      {isExpanded && (
        <div className="border-t border-border/40 bg-card/30">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="list-item-nested group/item border-b border-border/30 last:border-b-0 overflow-hidden"
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={() => onToggleItem(item.id)}
                className="shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />

              <div className="flex-1 w-0 min-w-0 overflow-hidden">
                <p className="text-sm font-medium truncate" title={item.name}>
                  {item.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate font-mono" title={item.path}>
                  {item.path}
                </p>
              </div>

              <SizeDisplay size={item.size} />

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenInFinder(item.path)
                }}
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
