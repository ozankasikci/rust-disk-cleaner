import { useState, useEffect, useCallback } from "react"
import { Loader2, Search, HardDrive, FolderCode, FileBox, Download, Copy, FileText, AppWindow } from "lucide-react"
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

const categoryInfo: Record<CategoryId, { title: string; description: string; icon: typeof HardDrive }> = {
  caches: {
    title: "Caches",
    description: "System and application caches that can be safely removed.",
    icon: HardDrive,
  },
  "dev-artifacts": {
    title: "Dev Artifacts",
    description: "Build outputs and dependency folders from development projects.",
    icon: FolderCode,
  },
  "large-files": {
    title: "Large Files",
    description: "Files larger than 100MB that might be candidates for removal.",
    icon: FileBox,
  },
  downloads: {
    title: "Downloads",
    description: "Old downloads and installer files that may no longer be needed.",
    icon: Download,
  },
  duplicates: {
    title: "Duplicates",
    description: "Identical files wasting space across your system.",
    icon: Copy,
  },
  "old-logs": {
    title: "Old Logs",
    description: "System and application log files that accumulate over time.",
    icon: FileText,
  },
  "unused-apps": {
    title: "Unused Apps",
    description: "Applications that haven't been opened in a long time.",
    icon: AppWindow,
  },
  trash: {
    title: "Trash",
    description: "Items moved to trash. Restore or permanently delete.",
    icon: HardDrive,
  },
}

export function CategoryView({ category, onStatsUpdate, scanData, onScanDataUpdate, isScanning, onScanningChange, onTrashChanged }: CategoryViewProps) {
  const info = categoryInfo[category]
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derive items and totalSize from passed scanData
  const items = scanData?.items ?? []
  const totalSize = scanData?.totalSize ?? 0

  // Reset local state when category changes (but NOT scan data or scanning state - that's in App.tsx!)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  // Report stats when items change
  useEffect(() => {
    if (items.length > 0) {
      onStatsUpdate(category, { itemCount: items.length, totalSize })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, totalSize, category])

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
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

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }

  const handleOpenInFinder = async (path: string) => {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener")
    // Reveal the file in Finder
    await revealItemInDir(path)
  }

  const handleDelete = async () => {
    const selectedPathsSet = new Set(
      items.filter((item) => selectedIds.has(item.id)).map((item) => item.path)
    )

    console.log("Deleting paths:", Array.from(selectedPathsSet))
    setIsDeleting(true)
    try {
      const result = await deleteItems(Array.from(selectedPathsSet))
      console.log("Delete result:", result)

      // Remove deleted items from local state (no rescan needed)
      const remainingItems = items.filter((item) => !selectedPathsSet.has(item.path))
      const newTotalSize = remainingItems.reduce((sum, item) => sum + item.size, 0)
      onScanDataUpdate(category, { items: remainingItems, totalSize: newTotalSize })
      onStatsUpdate(category, remainingItems.length > 0 ? { itemCount: remainingItems.length, totalSize: newTotalSize } : null)

      setSelectedIds(new Set())
      // Notify that trash has changed so sidebar updates
      onTrashChanged?.()
    } catch (err) {
      console.error("Delete failed:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedSize = items
    .filter((item) => selectedIds.has(item.id))
    .reduce((sum, item) => sum + item.size, 0)

  // Trash view is different - render TrashView
  if (category === "trash") {
    return <TrashView onStatsUpdate={(stats) => onStatsUpdate(category, stats)} />
  }

  const Icon = info.icon

  return (
    <div className="flex h-full flex-col bg-background">
      {error && (
        <ErrorBanner message={error} />
      )}

      {items.length === 0 && !isScanning ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-medium">Ready to scan</p>
            <p className="text-description max-w-xs">
              Scan your disk to find {info.title.toLowerCase()} that can be safely removed.
            </p>
          </div>
          <Button
            onClick={scan}
            disabled={isScanning}
            size="lg"
            className="gap-2 animate-pulse-glow"
          >
            <Search className="h-4 w-4" />
            Scan {info.title}
          </Button>
        </div>
      ) : isScanning ? (
        <div className="empty-state">
          <div className="relative">
            <div className="empty-state-icon bg-primary/10 animate-scanning">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <div className="icon-container-sm absolute -bottom-1 -right-1 rounded-full bg-background border-2 border-primary">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-medium">Scanning...</p>
            <p className="text-description">
              Looking for {info.title.toLowerCase()}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-hidden">
            <FileList
              items={items}
              selectedIds={selectedIds}
              onToggleItem={handleToggleItem}
              onToggleAll={handleToggleAll}
              onOpenInFinder={handleOpenInFinder}
            />
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 border-t border-border/50 bg-background px-6 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedIds.size === items.length ? "Deselect All" : "Select All"}
                </Button>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{selectedIds.size} selected</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-mono-small font-medium text-primary">{formatBytes(selectedSize)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={scan} size="sm">
                  Rescan
                </Button>
                <Button
                  variant="destructive"
                  disabled={selectedIds.size === 0 || isDeleting}
                  onClick={handleDelete}
                  className="gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    `Delete ${selectedIds.size > 0 ? `(${formatBytes(selectedSize)})` : 'Selected'}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
