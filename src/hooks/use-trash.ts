import { useState, useCallback } from "react"
import { listTrash, restoreItems, purgeTrash } from "@/lib/tauri"
import type { TrashItem } from "@/types"

export function useTrash() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSize = items.reduce((sum, item) => sum + item.size, 0)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await listTrash()
      setItems(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const restore = useCallback(async (ids: string[]) => {
    await restoreItems(ids)
    await load()
  }, [load])

  const purge = useCallback(async () => {
    await purgeTrash()
    await load()
  }, [load])

  return { items, totalSize, isLoading, error, load, restore, purge }
}
