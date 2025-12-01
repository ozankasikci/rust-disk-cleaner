use crate::scanner::{Scanner, ScannedItem};
use crate::trash::{TrashManager, TrashItem};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;
use std::sync::Mutex;

pub struct AppState {
    pub trash_manager: Mutex<TrashManager>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub items: Vec<ScannedItem>,
    pub total_size: u64,
    pub item_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteResult {
    pub deleted: u32,
    pub failed: Vec<String>,
}

#[tauri::command]
pub async fn scan_category(category: String) -> Result<ScanResult, String> {
    let scanner = Scanner::new();

    let items = match category.as_str() {
        "caches" => scanner.scan_caches(),
        "dev-artifacts" => scanner.scan_dev_artifacts(),
        "large-files" => scanner.scan_large_files(100),
        "downloads" => scanner.scan_downloads(),
        "duplicates" => scanner.scan_duplicates(),
        "old-logs" => scanner.scan_old_logs(),
        "unused-apps" => scanner.scan_unused_apps(),
        _ => return Err(format!("Unknown category: {}", category)),
    };

    let total_size: u64 = items.iter().map(|i| i.size).sum();
    let item_count = items.len();

    Ok(ScanResult {
        items,
        total_size,
        item_count,
    })
}

#[tauri::command]
pub async fn delete_items(
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<DeleteResult, String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    let mut deleted = 0u32;
    let mut failed: Vec<String> = vec![];

    for path_str in paths {
        let path = PathBuf::from(&path_str);
        match trash_manager.move_to_trash(path) {
            Ok(_) => deleted += 1,
            Err(e) => failed.push(format!("{}: {}", path_str, e)),
        }
    }

    Ok(DeleteResult { deleted, failed })
}

#[tauri::command]
pub async fn list_trash(state: State<'_, AppState>) -> Result<Vec<TrashItem>, String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    Ok(trash_manager.list_items())
}

#[tauri::command]
pub async fn restore_items(
    ids: Vec<String>,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    let mut restored = 0u32;

    for id in ids {
        if trash_manager.restore_item(&id).is_ok() {
            restored += 1;
        }
    }

    Ok(restored)
}

#[tauri::command]
pub async fn purge_trash(state: State<'_, AppState>) -> Result<u32, String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    trash_manager.purge_all()
}

#[tauri::command]
pub async fn permanently_delete(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    trash_manager.permanently_delete(&id)
}

#[tauri::command]
pub async fn permanently_delete_items(
    ids: Vec<String>,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    let mut deleted = 0u32;

    for id in ids {
        if trash_manager.permanently_delete(&id).is_ok() {
            deleted += 1;
        }
    }

    Ok(deleted)
}
