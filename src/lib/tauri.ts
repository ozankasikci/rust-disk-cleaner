import { invoke } from "@tauri-apps/api/core"

export async function scanCategory(category: string) {
  return invoke("scan_category", { category })
}
