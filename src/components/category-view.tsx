import { useState, useEffect, useCallback } from "react"
import { Loader2, Search, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileList } from "./file-list"
import { ErrorBanner } from "./error-banner"
import { formatBytes } from "@/lib/format"
import { deleteItems, scanCategory } from "@/lib/tauri"
import type { CategoryId, ScannedItem } from "@/types"

const categoryInfo: Record<string, { title: string; description: string }> = {
  caches: { title: "Caches", description: "System and app caches" },
  "dev-artifacts": { title: "Dev Artifacts", description: "Build outputs" },
  "large-files": { title: "Large Files", description: "Files over 100MB" },
  downloads: { title: "Downloads", description: "Old downloads" },
  duplicates: { title: "Duplicates", description: "Duplicate files" },
  "old-logs": { title: "Old Logs", description: "Log files" },
  "unused-apps": { title: "Unused Apps", description: "Unused applications" },
}

interface CategoryViewProps {
  category: CategoryId
  onStatsUpdate: (category: CategoryId, stats: { itemCount: number; totalSize: number } | null) => void
  scanData: { items: ScannedItem[]; totalSize: number } | null
  onScanDataUpdate: (category: CategoryId, data: { items: ScannedItem[]; totalSize: number } | null) => void
  isScanning: boolean
  onScanningChange: (category: CategoryId, isScanning: boolean) => void
  onTrashChanged?: () => void
}

export function CategoryView(props: CategoryViewProps) {
  const { category, onStatsUpdate, scanData, onScanDataUpdate, isScanning, onScanningChange, onTrashChanged } = props
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = scanData?.items ?? []
  const info = categoryInfo[category] || { title: category, description: "" }

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

  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      const allSelected = ids.every(id => next.has(id))
      if (allSelected) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  const handleDelete = async () => {
    const selectedPaths = items.filter(i => selectedIds.has(i.id)).map(i => i.path)
    setIsDeleting(true)
    try {
      await deleteItems(selectedPaths)
      const remaining = items.filter(i => !selectedIds.has(i.id))
      const newTotal = remaining.reduce((s, i) => s + i.size, 0)
      onScanDataUpdate(category, { items: remaining, totalSize: newTotal })
      onStatsUpdate(category, remaining.length > 0 ? { itemCount: remaining.length, totalSize: newTotal } : null)
      setSelectedIds(new Set())
      onTrashChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedSize = items.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + i.size, 0)

  if (items.length === 0 && !isScanning) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-medium">Ready to scan</p>
          <p className="text-description">{info.description}</p>
        </div>
        <Button onClick={scan} className="animate-pulse-glow">
          <Search className="h-4 w-4 mr-2" />
          Scan {info.title}
        </Button>
      </div>
    )
  }

  if (isScanning) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon animate-scanning">
          <HardDrive className="h-7 w-7 text-primary" />
        </div>
        <p>Scanning...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {error && <ErrorBanner message={error} />}
      <div className="flex-1 overflow-hidden">
        <FileList
          items={items}
          selectedIds={selectedIds}
          onToggleItem={handleToggleItem}
          onToggleAll={handleToggleAll}
          onOpenInFinder={() => {}}
        />
      </div>
      <div className="shrink-0 border-t p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map(i => i.id)))}>
            {selectedIds.size === items.length ? "Deselect All" : "Select All"}
          </Button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected · {formatBytes(selectedSize)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={scan}>Rescan</Button>
          <Button variant="destructive" disabled={selectedIds.size === 0 || isDeleting} onClick={handleDelete}>
            {isDeleting ? "Deleting..." : `Delete (${formatBytes(selectedSize)})`}
          </Button>
        </div>
      </div>
    </div>
  )
}
