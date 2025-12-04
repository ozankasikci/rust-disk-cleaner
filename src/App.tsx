import { useState, useCallback } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CategoryView } from "@/components/category-view"
import type { CategoryId, ScannedItem } from "@/types"

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
    caches: null,
    "dev-artifacts": null,
    "large-files": null,
    downloads: null,
    duplicates: null,
    "old-logs": null,
    "unused-apps": null,
    trash: null,
  })
  const [scanResults, setScanResults] = useState<Record<CategoryId, ScanData | null>>({
    caches: null,
    "dev-artifacts": null,
    "large-files": null,
    downloads: null,
    duplicates: null,
    "old-logs": null,
    "unused-apps": null,
    trash: null,
  })
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

  const handleStatsUpdate = useCallback((category: CategoryId, newStats: CategoryStats | null) => {
    setStats((prev) => ({ ...prev, [category]: newStats }))
  }, [])

  const handleScanDataUpdate = useCallback((category: CategoryId, data: ScanData | null) => {
    setScanResults((prev) => ({ ...prev, [category]: data }))
  }, [])

  const handleScanningChange = useCallback((category: CategoryId, isScanning: boolean) => {
    setScanningCategories((prev) => ({ ...prev, [category]: isScanning }))
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        stats={stats}
      />
      <main className="flex flex-1 flex-col">
        <div className="flex items-center gap-4 p-4 border-b">
          <SidebarTrigger />
          <h1 className="font-semibold">{selectedCategory}</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <CategoryView
            category={selectedCategory}
            onStatsUpdate={handleStatsUpdate}
            scanData={scanResults[selectedCategory]}
            onScanDataUpdate={handleScanDataUpdate}
            isScanning={scanningCategories[selectedCategory]}
            onScanningChange={handleScanningChange}
          />
        </div>
      </main>
    </SidebarProvider>
  )
}

export default App
