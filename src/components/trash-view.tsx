import { useState, useEffect } from "react"
import { Loader2, RotateCcw, Trash2, AlertTriangle, X, Clock, Archive, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ErrorBanner } from "./error-banner"
import { useTrash } from "@/hooks/use-trash"
import { formatBytes, formatDate } from "@/lib/format"

interface TrashViewProps {
  onStatsUpdate: (stats: { itemCount: number; totalSize: number } | null) => void
}

function TrashItemRow({
  item,
  isSelected,
  onToggle,
  onRestore,
  onDelete,
  disabled,
  index,
}: {
  item: { id: string; name: string; original_path: string; size: number; deleted_at: string }
  isSelected: boolean
  onToggle: () => void
  onRestore: () => void
  onDelete: () => void
  disabled: boolean
  index: number
}) {
  const sizeClass = item.size > 100_000_000 ? "text-destructive" :
                    item.size > 10_000_000 ? "text-amber-500" :
                    "text-muted-foreground"

  return (
    <div
      className="group flex items-center gap-3 px-6 py-3 transition-all duration-200 hover:bg-destructive/5 border-b border-border/30 last:border-b-0 stagger-item"
      style={{ animationDelay: `${index * 25}ms` }}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="shrink-0 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
      />

      {/* File icon with danger indicator */}
      <div aria-label="Trash" className="relative shrink-0">
        <div className="icon-container-md bg-destructive/10 text-destructive/70">
          <Archive className="h-3.5 w-3.5" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive/60 ring-2 ring-background" />
      </div>

      <div className="flex-1 w-0 min-w-0 overflow-hidden">
        <p className="text-sm font-medium truncate group-hover:text-destructive/90 transition-colors" title={item.name}>
          {item.name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate font-mono" title={item.original_path}>
          {item.original_path}
        </p>
      </div>

      <div className="text-right shrink-0 space-y-0.5">
        <p className={`text-mono-small ${sizeClass}`}>{formatBytes(item.size)}</p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
          <Clock className="h-2.5 w-2.5" />
          <span>{formatDate(item.deleted_at)}</span>
        </div>
      </div>

      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRestore}
          title="Restore to original location"
          disabled={disabled}
          className="h-7 w-7 p-0 hover:bg-success/20 hover:text-success"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          title="Delete permanently"
          disabled={disabled}
          className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
        >
          <Flame className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function TrashView({ onStatsUpdate }: TrashViewProps) {
  const { items, totalSize, isLoading, error, deleteProgress, load, restore, purge, deleteItem, deleteItems, cancelDelete } = useTrash()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    onStatsUpdate(items.length > 0 ? { itemCount: items.length, totalSize } : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, totalSize])

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

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }

  const handleRestore = async () => {
    await restore(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleDeleteSelected = async () => {
    await deleteItems(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handlePurge = async () => {
    await purge()
    setSelectedIds(new Set())
  }

  const selectedSize = items
    .filter((item) => selectedIds.has(item.id))
    .reduce((sum, item) => sum + item.size, 0)

  const isDeleting = deleteProgress?.isDeleting ?? false
  const progressPercent = deleteProgress ? (deleteProgress.current / deleteProgress.total) * 100 : 0

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="icon-container-lg bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive/50" />
              </div>
              <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 animate-spin text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">Loading trash...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {error && <ErrorBanner message={error} />}

      {items.length === 0 && !isDeleting ? (
        <div className="empty-state">
          {/* Empty trash illustration */}
          <div className="relative">
            <div className="empty-state-icon bg-muted/30 border-2 border-dashed border-border/50">
              <Trash2 className="h-7 w-7 text-muted-foreground/50" />
            </div>
            {/* Sparkle effect indicating clean state */}
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success/30 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-base font-medium">Trash is empty</p>
            <p className="text-description max-w-[280px]">
              Deleted files will appear here before permanent removal
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0">
          {/* Header summary */}
          <div className="shrink-0 px-6 py-3 border-b border-border/30 bg-destructive/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="icon-container-md bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive/70" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {items.length} {items.length === 1 ? "item" : "items"} in trash
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(totalSize)} awaiting permanent deletion
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="divide-y divide-border/30">
                {items.map((item, index) => (
                  <TrashItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    isSelected={selectedIds.has(item.id)}
                    onToggle={() => handleToggleItem(item.id)}
                    onRestore={() => restore([item.id])}
                    onDelete={() => deleteItem(item.id)}
                    disabled={isDeleting}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 border-t border-border/50 bg-background px-6 py-3">
            {isDeleting ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="icon-container-sm bg-destructive/10">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">
                        Permanently deleting...
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {deleteProgress?.current} of {deleteProgress?.total} items
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelDelete}
                    className="gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
                {deleteProgress && deleteProgress.failures.length > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    {deleteProgress.failures.length} failed
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedIds.size === items.length ? "Deselect All" : "Select All"}
                  </Button>
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{selectedIds.size} selected</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="text-mono-small font-medium text-destructive">{formatBytes(selectedSize)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={handleRestore}
                    className="gap-1.5 hover:bg-success/10 hover:text-success hover:border-success/30"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={handleDeleteSelected}
                    className="gap-1.5"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1.5">
                        <Trash2 className="h-3.5 w-3.5" />
                        Empty Trash
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-destructive/20">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <div className="icon-container-sm bg-destructive/10">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          </div>
                          Empty Trash Permanently?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            This will permanently delete <span className="font-medium text-foreground">{items.length} items</span> ({formatBytes(totalSize)}).
                          </p>
                          <p className="text-destructive/80 font-medium">
                            This action cannot be undone.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handlePurge}
                          className="bg-destructive hover:bg-destructive/90 gap-1.5"
                        >
                          <Flame className="h-3.5 w-3.5" />
                          Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
