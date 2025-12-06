import { useState, useCallback, useEffect } from "react"
import { HardDrive, FolderCode, FileBox, Trash2, Download, Copy, FileText, AppWindow } from "lucide-react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CategoryView } from "@/components/category-view"
import { TrashView } from "@/components/trash-view"
import { formatBytes } from "@/lib/format"
import { listTrash } from "@/lib/tauri"
import type { CategoryId, ScannedItem } from "@/types"

const categoryInfo: Record<CategoryId, { title: string; icon: typeof HardDrive }> = {
  caches: { title: "Caches", icon: HardDrive },
  "dev-artifacts": { title: "Dev Artifacts", icon: FolderCode },
  "large-files": { title: "Large Files", icon: FileBox },
  downloads: { title: "Downloads", icon: Download },
  duplicates: { title: "Duplicates", icon: Copy },
  "old-logs": { title: "Old Logs", icon: FileText },
  "unused-apps": { title: "Unused Apps", icon: AppWindow },
  trash: { title: "Trash", icon: Trash2 },
}

interface CategoryStats {
  itemCount: number
  totalSize: number
}

interface ScanData {
  items: ScannedItem[]
  totalSize: number
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("caches")
  const [stats, setStats] = useState<Record<CategoryId, CategoryStats | null>>({
    caches: null, "dev-artifacts": null, "large-files": null, downloads: null,
    duplicates: null, "old-logs": null, "unused-apps": null, trash: null,
  })
  const [scanResults, setScanResults] = useState<Record<CategoryId, ScanData | null>>({
    caches: null, "dev-artifacts": null, "large-files": null, downloads: null,
    duplicates: null, "old-logs": null, "unused-apps": null, trash: null,
  })
  const [scanningCategories, setScanningCategories] = useState<Record<CategoryId, boolean>>({
    caches: false, "dev-artifacts": false, "large-files": false, downloads: false,
    duplicates: false, "old-logs": false, "unused-apps": false, trash: false,
  })

  const handleStatsUpdate = useCallback((category: CategoryId, newStats: CategoryStats | null) => {
    setStats(prev => ({ ...prev, [category]: newStats }))
  }, [])

  const handleScanDataUpdate = useCallback((category: CategoryId, data: ScanData | null) => {
    setScanResults(prev => ({ ...prev, [category]: data }))
  }, [])

  const handleScanningChange = useCallback((category: CategoryId, isScanning: boolean) => {
    setScanningCategories(prev => ({ ...prev, [category]: isScanning }))
  }, [])

  const refreshTrashStats = useCallback(async () => {
    try {
      const items = await listTrash()
      const totalSize = items.reduce((s, i) => s + i.size, 0)
      setStats(prev => ({ ...prev, trash: items.length > 0 ? { itemCount: items.length, totalSize } : null }))
    } catch {}
  }, [])

  useEffect(() => { refreshTrashStats() }, [refreshTrashStats])

  const info = categoryInfo[selectedCategory]
  const Icon = info.icon
  const currentStats = stats[selectedCategory]

  return (
    <SidebarProvider>
      <AppSidebar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} stats={stats} />
      <main className="flex flex-1 flex-col">
        <div className="flex h-16 items-center justify-between gap-4 border-b px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border" />
            <div className="icon-container-md bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-semibold">{info.title}</h2>
          </div>
          {currentStats && (
            <div className="text-right">
              <p className="text-mono-value text-primary">{formatBytes(currentStats.totalSize)}</p>
              <p className="text-xs text-muted-foreground">{currentStats.itemCount} items</p>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {selectedCategory === "trash" ? (
            <TrashView onStatsUpdate={(s) => handleStatsUpdate("trash", s)} />
          ) : (
            <CategoryView
              category={selectedCategory}
              onStatsUpdate={handleStatsUpdate}
              scanData={scanResults[selectedCategory]}
              onScanDataUpdate={handleScanDataUpdate}
              isScanning={scanningCategories[selectedCategory]}
              onScanningChange={handleScanningChange}
              onTrashChanged={refreshTrashStats}
            />
          )}
        </div>
      </main>
    </SidebarProvider>
  )
}

export default App
