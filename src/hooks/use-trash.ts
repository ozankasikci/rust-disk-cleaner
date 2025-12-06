import { useState, useCallback } from "react"
import { listTrash, restoreItems, purgeTrash, permanentlyDelete, permanentlyDeleteItems } from "@/lib/tauri"
import type { TrashItem } from "@/types"

interface DeleteProgress {
  isDeleting: boolean
  current: number
  total: number
  failures: string[]
}

export function useTrash() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress | null>(null)

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
    try {
      await restoreItems(ids)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [load])

  const purge = useCallback(async () => {
    setDeleteProgress({ isDeleting: true, current: 0, total: items.length, failures: [] })
    try {
      await purgeTrash()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleteProgress(null)
    }
  }, [items.length, load])

  const deleteItem = useCallback(async (id: string) => {
    try {
      await permanentlyDelete(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [load])

  const deleteItems = useCallback(async (ids: string[]) => {
    setDeleteProgress({ isDeleting: true, current: 0, total: ids.length, failures: [] })
    try {
      await permanentlyDeleteItems(ids)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleteProgress(null)
    }
  }, [load])

  const cancelDelete = useCallback(() => {
    setDeleteProgress(null)
  }, [])

  return { items, totalSize, isLoading, error, deleteProgress, load, restore, purge, deleteItem, deleteItems, cancelDelete }
}
