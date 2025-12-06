export type CategoryId =
  | "caches"
  | "dev-artifacts"
  | "large-files"
  | "downloads"
  | "duplicates"
  | "old-logs"
  | "unused-apps"
  | "trash"

export interface ScannedItem {
  id: string
  name: string
  path: string
  size: number
  item_type: string
  group?: string
}

export interface ScanResult {
  items: ScannedItem[]
  total_size: number
  item_count: number
}
