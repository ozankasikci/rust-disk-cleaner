import { useState, useEffect, useCallback } from "react"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileList } from "./file-list"
import { scanCategory, deleteItems } from "@/lib/tauri"
import type { CategoryId, ScannedItem } from "@/types"

interface CategoryViewProps {
  category: CategoryId
  onStatsUpdate: (category: CategoryId, stats: { itemCount: number; totalSize: number } | null) => void
}

export function CategoryView({ category, onStatsUpdate }: CategoryViewProps) {
  const [items, setItems] = useState<ScannedItem[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelectedIds(new Set())
    setItems([])
  }, [category])

  const scan = useCallback(async () => {
    setIsScanning(true)
    try {
      const result = await scanCategory(category)
      setItems(result.items)
      onStatsUpdate(category, { itemCount: result.items.length, totalSize: result.total_size })
    } finally {
      setIsScanning(false)
    }
  }, [category, onStatsUpdate])

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    const paths = items.filter((i) => selectedIds.has(i.id)).map((i) => i.path)
    await deleteItems(paths)
    await scan()
    setSelectedIds(new Set())
  }

  if (items.length === 0 && !isScanning) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Search className="h-12 w-12 text-muted-foreground" />
        <Button onClick={scan}>Scan</Button>
      </div>
    )
  }

  if (isScanning) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <FileList
        items={items}
        selectedIds={selectedIds}
        onToggleItem={handleToggle}
        onToggleAll={() => {}}
        onOpenInFinder={() => {}}
      />
      <div className="p-4 border-t flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {selectedIds.size} selected
        </span>
        <Button
          variant="destructive"
          size="sm"
          disabled={selectedIds.size === 0}
          onClick={handleDelete}
        >
          Delete Selected
        </Button>
      </div>
    </div>
  )
}
