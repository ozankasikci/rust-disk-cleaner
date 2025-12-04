import { useState, useEffect, useCallback } from "react"
import { Loader2, Search, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileList } from "./file-list"
import { TrashView } from "./trash-view"
import { ErrorBanner } from "./error-banner"
import { formatBytes } from "@/lib/format"
import { deleteItems, scanCategory } from "@/lib/tauri"
import type { CategoryId, ScannedItem } from "@/types"

interface ScanData {
  items: ScannedItem[]
  totalSize: number
}

interface CategoryViewProps {
  category: CategoryId
  onStatsUpdate: (category: CategoryId, stats: { itemCount: number; totalSize: number } | null) => void
  scanData: ScanData | null
  onScanDataUpdate: (category: CategoryId, data: ScanData | null) => void
  isScanning: boolean
  onScanningChange: (category: CategoryId, isScanning: boolean) => void
  onTrashChanged?: () => void
}

export function CategoryView({
  category,
  onStatsUpdate,
  scanData,
  onScanDataUpdate,
  isScanning,
  onScanningChange,
  onTrashChanged,
}: CategoryViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = scanData?.items ?? []
  const totalSize = scanData?.totalSize ?? 0

  useEffect(() => {
    setSelectedIds(new Set())
    setError(null)
  }, [category])

  const scan = useCallback(async () => {
    onScanningChange(category, true)
    setError(null)
    try {
      const result = await scanCategory(category)
      onScanDataUpdate(category, { items: result.items, totalSize: result.total_size })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      onScanningChange(category, false)
    }
  }, [category, onScanDataUpdate, onScanningChange])

  useEffect(() => {
    if (items.length > 0) {
      onStatsUpdate(category, { itemCount: items.length, totalSize })
    }
  }, [items, totalSize, category, onStatsUpdate])

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((id) => next.has(id))
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleDelete = async () => {
    const selectedPaths = items
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.path)

    setIsDeleting(true)
    try {
      await deleteItems(selectedPaths)
      const remainingItems = items.filter((item) => !selectedIds.has(item.id))
      const newTotalSize = remainingItems.reduce((sum, item) => sum + item.size, 0)
      onScanDataUpdate(category, { items: remainingItems, totalSize: newTotalSize })
      onStatsUpdate(category, remainingItems.length > 0 ? { itemCount: remainingItems.length, totalSize: newTotalSize } : null)
      setSelectedIds(new Set())
      onTrashChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDeleting(false)
    }
  }

  if (category === "trash") {
    return <TrashView onStatsUpdate={(stats) => onStatsUpdate(category, stats)} />
  }

  const selectedSize = items
    .filter((item) => selectedIds.has(item.id))
    .reduce((sum, item) => sum + item.size, 0)

  return (
    <div className="flex h-full flex-col">
      {error && <ErrorBanner message={error} />}

      {items.length === 0 && !isScanning ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-4">
            <Search className="h-12 w-12 mx-auto text-muted-foreground" />
            <Button onClick={scan}>Scan</Button>
          </div>
        </div>
      ) : isScanning ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-hidden">
            <FileList
              items={items}
              selectedIds={selectedIds}
              onToggleItem={handleToggleItem}
              onToggleAll={handleToggleAll}
              onOpenInFinder={() => {}}
            />
          </div>
          <div className="shrink-0 border-t p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected ({formatBytes(selectedSize)})
              </span>
              <Button
                variant="destructive"
                disabled={selectedIds.size === 0 || isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
