export interface ScannedItem {
  id: string
  path: string
  size: number
  name: string
  category: string
  subcategory: string
}

export interface ScanResult {
  items: ScannedItem[]
  total_size: number
  item_count: number
}

export interface TrashItem {
  id: string
  original_path: string
  trash_path: string
  size: number
  name: string
  deleted_at: string
}

export type CategoryId = "caches" | "dev-artifacts" | "large-files" | "downloads" | "duplicates" | "old-logs" | "unused-apps" | "trash"
