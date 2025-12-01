import { useState, useEffect } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTrash } from "@/hooks/use-trash"

interface TrashViewProps {
  onStatsUpdate: (stats: { itemCount: number; totalSize: number } | null) => void
}

export function TrashView({ onStatsUpdate }: TrashViewProps) {
  const { items, isLoading, load } = useTrash()

  useEffect(() => { load() }, [load])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Trash2 className="h-12 w-12 text-muted-foreground" />
        <p>Trash is empty</p>
      </div>
    )
  }

  return <div>Trash items: {items.length}</div>
}
