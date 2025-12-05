import { invoke } from "@tauri-apps/api/core"
import type { ScanResult, TrashItem } from "@/types"

export async function scanCategory(category: string): Promise<ScanResult> {
  return invoke("scan_category", { category })
}

export async function deleteItems(paths: string[]): Promise<{ deleted: number; failed: string[] }> {
  return invoke("delete_items", { paths })
}

export async function listTrash(): Promise<TrashItem[]> {
  return invoke("list_trash")
}

export async function restoreItems(ids: string[]): Promise<number> {
  return invoke("restore_items", { ids })
}
