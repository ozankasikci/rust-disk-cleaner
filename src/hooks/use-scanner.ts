import { useState, useCallback } from "react"
import { scanCategory } from "@/lib/tauri"
import type { ScannedItem, ScanResult } from "@/types"

interface UseScannerResult {
  items: ScannedItem[]
  totalSize: number
  isScanning: boolean
  error: string | null
  scan: () => Promise<void>
  reset: () => void
}

export function useScanner(category: string): UseScannerResult {
  const [items, setItems] = useState<ScannedItem[]>([])
  const [totalSize, setTotalSize] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scan = useCallback(async () => {
    setIsScanning(true)
    setError(null)

    try {
      const result: ScanResult = await scanCategory(category)
      setItems(result.items)
      setTotalSize(result.total_size)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsScanning(false)
    }
  }, [category])

  const reset = useCallback(() => {
    setItems([])
    setTotalSize(0)
    setError(null)
  }, [])

  return {
    items,
    totalSize,
    isScanning,
    error,
    scan,
    reset,
  }
}
