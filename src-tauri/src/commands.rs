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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_result_structure() {
        let items = vec![
            ScannedItem {
                id: "1".to_string(),
                path: std::path::PathBuf::from("/test/path1"),
                size: 1000,
                name: "file1".to_string(),
                category: "caches".to_string(),
                subcategory: "npm".to_string(),
            },
            ScannedItem {
                id: "2".to_string(),
                path: std::path::PathBuf::from("/test/path2"),
                size: 2000,
                name: "file2".to_string(),
                category: "caches".to_string(),
                subcategory: "yarn".to_string(),
            },
        ];

        let result = ScanResult {
            items: items.clone(),
            total_size: 3000,
            item_count: 2,
        };

        assert_eq!(result.items.len(), 2);
        assert_eq!(result.total_size, 3000);
        assert_eq!(result.item_count, 2);
    }

    #[test]
    fn test_scan_result_serialization() {
        let result = ScanResult {
            items: vec![],
            total_size: 0,
            item_count: 0,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"total_size\":0"));
        assert!(json.contains("\"item_count\":0"));

        let deserialized: ScanResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.total_size, 0);
        assert_eq!(deserialized.item_count, 0);
    }

    #[test]
    fn test_delete_result_structure() {
        let result = DeleteResult {
            deleted: 5,
            failed: vec!["path1".to_string(), "path2".to_string()],
        };

        assert_eq!(result.deleted, 5);
        assert_eq!(result.failed.len(), 2);
    }

    #[test]
    fn test_delete_result_serialization() {
        let result = DeleteResult {
            deleted: 3,
            failed: vec!["error1".to_string()],
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"deleted\":3"));
        assert!(json.contains("error1"));

        let deserialized: DeleteResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.deleted, 3);
        assert_eq!(deserialized.failed.len(), 1);
    }

    #[test]
    fn test_delete_result_empty() {
        let result = DeleteResult {
            deleted: 0,
            failed: vec![],
        };

        assert_eq!(result.deleted, 0);
        assert!(result.failed.is_empty());
    }

    #[test]
    fn test_scan_result_with_items() {
        let items = vec![
            ScannedItem {
                id: "test-id".to_string(),
                path: std::path::PathBuf::from("/test"),
                size: 1000,
                name: "test".to_string(),
                category: "caches".to_string(),
                subcategory: "npm".to_string(),
            },
        ];

        let total_size: u64 = items.iter().map(|i| i.size).sum();
        let item_count = items.len();

        let result = ScanResult {
            items,
            total_size,
            item_count,
        };

        assert_eq!(result.total_size, 1000);
        assert_eq!(result.item_count, 1);
    }

    #[test]
    fn test_app_state_can_be_created() {
        use std::sync::Mutex;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let trash_manager = TrashManager::with_path(temp_dir.path().to_path_buf()).unwrap();

        let state = AppState {
            trash_manager: Mutex::new(trash_manager),
        };

        // Verify we can lock and access the trash manager
        let manager = state.trash_manager.lock().unwrap();
        let items = manager.list_items();
        assert!(items.is_empty());
    }
}
