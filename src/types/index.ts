export type CategoryId = "caches" | "dev-artifacts"

export interface ScannedItem {
  id: string
  name: string
  path: string
  size: number
  item_type: string
}
