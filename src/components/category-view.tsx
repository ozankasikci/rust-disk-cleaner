import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileList } from "./file-list"
import { scanCategory } from "@/lib/tauri"
import type { ScannedItem } from "@/types"

interface CategoryViewProps {
  category: string
}

export function CategoryView({ category }: CategoryViewProps) {
  const [items, setItems] = useState<ScannedItem[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const result = await scanCategory(category)
      setItems(result.items)
    } finally {
      setIsScanning(false)
    }
  }

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (items.length === 0 && !isScanning) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Button onClick={handleScan}>Scan</Button>
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
    <FileList items={items} selectedIds={selectedIds} onToggleItem={handleToggle} />
  )
}
