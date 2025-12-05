import { invoke } from "@tauri-apps/api/core"
import type { ScanResult, TrashItem } from "@/types"

export interface DeleteResult {
  deleted: number
  failed: string[]
}

export async function scanCategory(category: string): Promise<ScanResult> {
  return invoke<ScanResult>("scan_category", { category })
}

export async function deleteItems(paths: string[]): Promise<DeleteResult> {
  return invoke<DeleteResult>("delete_items", { paths })
}

export async function listTrash(): Promise<TrashItem[]> {
  return invoke<TrashItem[]>("list_trash")
}

export async function restoreItems(ids: string[]): Promise<number> {
  return invoke<number>("restore_items", { ids })
}

export async function purgeTrash(): Promise<number> {
  return invoke<number>("purge_trash")
}

export async function permanentlyDelete(id: string): Promise<void> {
  return invoke<void>("permanently_delete", { id })
}

export async function permanentlyDeleteItems(ids: string[]): Promise<number> {
  return invoke<number>("permanently_delete_items", { ids })
}
