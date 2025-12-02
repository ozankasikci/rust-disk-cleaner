import { useState, useCallback, useRef } from "react"
import { listTrash, restoreItems, permanentlyDelete } from "@/lib/tauri"
import type { TrashItem } from "@/types"

export interface DeleteProgress {
  current: number
  total: number
  isDeleting: boolean
  failures: string[]
}

interface UseTrashResult {
  items: TrashItem[]
  totalSize: number
  isLoading: boolean
  error: string | null
  deleteProgress: DeleteProgress | null
  load: () => Promise<void>
  restore: (ids: string[]) => Promise<void>
  purge: () => Promise<void>
  deleteItem: (id: string) => Promise<void>
  deleteItems: (ids: string[]) => Promise<{ completed: number; failures: string[] }>
  cancelDelete: () => void
}

export function useTrash(): UseTrashResult {
  const [items, setItems] = useState<TrashItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress | null>(null)
  const cancelRef = useRef(false)

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
      // Remove restored items from local state instead of rescanning
      setItems(prev => prev.filter(item => !ids.includes(item.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const purge = useCallback(async () => {
    // For purge, we delete items one by one to show progress
    const itemsToDelete = [...items]
    const total = itemsToDelete.length
    const failures: string[] = []
    const deletedIds: string[] = []

    cancelRef.current = false
    setDeleteProgress({ current: 0, total, isDeleting: true, failures: [] })

    for (let i = 0; i < itemsToDelete.length; i++) {
      if (cancelRef.current) {
        break
      }

      const item = itemsToDelete[i]
      try {
        await permanentlyDelete(item.id)
        deletedIds.push(item.id)
      } catch (err) {
        failures.push(`${item.name}: ${err instanceof Error ? err.message : String(err)}`)
      }

      setDeleteProgress({ current: i + 1, total, isDeleting: true, failures: [...failures] })
    }

    setDeleteProgress(null)

    // Remove successfully deleted items from local state
    if (deletedIds.length > 0) {
      setItems(prev => prev.filter(item => !deletedIds.includes(item.id)))
    }

    if (failures.length > 0) {
      setError(`Failed to delete ${failures.length} item(s):\n${failures.join('\n')}`)
    }
  }, [items])

  const deleteItem = useCallback(async (id: string) => {
    try {
      await permanentlyDelete(id)
      // Remove from local state instead of rescanning
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const deleteItems = useCallback(async (ids: string[]) => {
    const total = ids.length
    const failures: string[] = []
    const deletedIds: string[] = []

    cancelRef.current = false
    setDeleteProgress({ current: 0, total, isDeleting: true, failures: [] })

    // Get item names for better error messages
    const itemMap = new Map(items.map(item => [item.id, item.name]))

    for (let i = 0; i < ids.length; i++) {
      if (cancelRef.current) {
        break
      }

      const id = ids[i]
      const itemName = itemMap.get(id) || id

      try {
        await permanentlyDelete(id)
        deletedIds.push(id)
      } catch (err) {
        failures.push(`${itemName}: ${err instanceof Error ? err.message : String(err)}`)
      }

      setDeleteProgress({ current: i + 1, total, isDeleting: true, failures: [...failures] })
    }

    setDeleteProgress(null)

    // Remove successfully deleted items from local state
    if (deletedIds.length > 0) {
      setItems(prev => prev.filter(item => !deletedIds.includes(item.id)))
    }

    if (failures.length > 0) {
      setError(`Failed to delete ${failures.length} item(s):\n${failures.join('\n')}`)
    }

    return { completed: deletedIds.length, failures }
  }, [items])

  const cancelDelete = useCallback(() => {
    cancelRef.current = true
  }, [])

  return {
    items,
    totalSize,
    isLoading,
    error,
    deleteProgress,
    load,
    restore,
    purge,
    deleteItem,
    deleteItems,
    cancelDelete,
  }
}
