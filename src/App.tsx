import { useState, useCallback, useEffect } from "react"
import { HardDrive, FolderCode, FileBox, Trash2, Download, Copy, FileText, AppWindow } from "lucide-react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CategoryView } from "@/components/category-view"
import { formatBytes } from "@/lib/format"
import { listTrash } from "@/lib/tauri"
import type { CategoryId, ScannedItem } from "@/types"

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
    icon: Trash2,
  },
}

interface CategoryStats {
  itemCount: number
  totalSize: number
}

interface ScanData {
  items: ScannedItem[]
  totalSize: number
}

const SCAN_CACHE_KEY = "rustdiskcleaner-scan-cache"
const STATS_CACHE_KEY = "rustdiskcleaner-stats-cache"

function loadCachedScanResults(): Record<CategoryId, ScanData | null> {
  try {
    const cached = localStorage.getItem(SCAN_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (err) {
    console.error("Failed to load cached scan results:", err)
  }
  return {
    caches: null,
    "dev-artifacts": null,
    "large-files": null,
    downloads: null,
    duplicates: null,
    "old-logs": null,
    "unused-apps": null,
    trash: null,
  }
}

function loadCachedStats(): Record<CategoryId, CategoryStats | null> {
  try {
    const cached = localStorage.getItem(STATS_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (err) {
    console.error("Failed to load cached stats:", err)
  }
  return {
    caches: null,
    "dev-artifacts": null,
    "large-files": null,
    downloads: null,
    duplicates: null,
    "old-logs": null,
    "unused-apps": null,
    trash: null,
  }
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("caches")
  const [stats, setStats] = useState<Record<CategoryId, CategoryStats | null>>(loadCachedStats)
  // Persist scan results per category
  const [scanResults, setScanResults] = useState<Record<CategoryId, ScanData | null>>(loadCachedScanResults)
  // Track scanning state per category
  const [scanningCategories, setScanningCategories] = useState<Record<CategoryId, boolean>>({
    caches: false,
    "dev-artifacts": false,
    "large-files": false,
    downloads: false,
    duplicates: false,
    "old-logs": false,
    "unused-apps": false,
    trash: false,
  })

  // Save scan results to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(SCAN_CACHE_KEY, JSON.stringify(scanResults))
    } catch (err) {
      console.error("Failed to cache scan results:", err)
    }
  }, [scanResults])

  // Save stats to localStorage when they change (except trash which is dynamic)
  useEffect(() => {
    try {
      // Don't cache trash stats - they should always be fresh
      const statsToCache = { ...stats, trash: null }
      localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(statsToCache))
    } catch (err) {
      console.error("Failed to cache stats:", err)
    }
  }, [stats])

  const handleStatsUpdate = useCallback((category: CategoryId, newStats: CategoryStats | null) => {
    setStats((prev) => ({
      ...prev,
      [category]: newStats,
    }))
  }, [])

  const handleScanDataUpdate = useCallback((category: CategoryId, data: ScanData | null) => {
    setScanResults((prev) => ({
      ...prev,
      [category]: data,
    }))
  }, [])

  const handleScanningChange = useCallback((category: CategoryId, isScanning: boolean) => {
    setScanningCategories((prev) => ({
      ...prev,
      [category]: isScanning,
    }))
  }, [])

  // Fetch trash stats
  const refreshTrashStats = useCallback(async () => {
    try {
      const items = await listTrash()
      const totalSize = items.reduce((sum, item) => sum + item.size, 0)
      setStats((prev) => ({
        ...prev,
        trash: items.length > 0 ? { itemCount: items.length, totalSize } : null,
      }))
    } catch (err) {
      console.error("Failed to fetch trash stats:", err)
    }
  }, [])

  // Load trash stats on mount
  useEffect(() => {
    refreshTrashStats()
  }, [refreshTrashStats])

  return (
    <SidebarProvider>
      <AppSidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        stats={stats}
      />
      <main className="flex flex-1 flex-col">
        {(() => {
          const info = categoryInfo[selectedCategory]
          const currentStats = stats[selectedCategory]
          const Icon = info.icon
          return (
            <div className="flex h-20 items-center justify-between gap-4 border-b border-border/50 px-6">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <SidebarTrigger className="-ml-2 shrink-0" />
                <div className="h-6 w-px bg-border/50 shrink-0" />
                <div className="icon-container-md bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold truncate">{info.title}</h2>
                  <p className="text-xs text-muted-foreground truncate">{info.description}</p>
                </div>
              </div>
              {currentStats && currentStats.itemCount > 0 && (
                <div className="text-right shrink-0">
                  <p className="text-mono-value text-primary">
                    {formatBytes(currentStats.totalSize)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentStats.itemCount} {currentStats.itemCount === 1 ? 'item' : 'items'}
                  </p>
                </div>
              )}
            </div>
          )
        })()}
        <div className="flex-1 overflow-hidden h-0">
          <CategoryView
            category={selectedCategory}
            onStatsUpdate={handleStatsUpdate}
            scanData={scanResults[selectedCategory]}
            onScanDataUpdate={handleScanDataUpdate}
            isScanning={scanningCategories[selectedCategory]}
            onScanningChange={handleScanningChange}
            onTrashChanged={refreshTrashStats}
          />
        </div>
      </main>
    </SidebarProvider>
  )
}

export default App
