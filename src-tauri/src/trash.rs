//! Trash management with restore capability

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, Duration};
use uuid::Uuid;

// Internal struct for storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashItemInternal {
    pub id: String,
    pub original_path: PathBuf,
    pub trash_path: PathBuf,
    pub size: u64,
    pub name: String,
    pub deleted_at: DateTime<Utc>,
}

// Struct for frontend communication (paths as strings)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashItem {
    pub id: String,
    pub original_path: String,
    pub trash_path: String,
    pub size: u64,
    pub name: String,
    pub deleted_at: DateTime<Utc>,
}

impl From<TrashItemInternal> for TrashItem {
    fn from(item: TrashItemInternal) -> Self {
        TrashItem {
            id: item.id,
            original_path: item.original_path.to_string_lossy().to_string(),
            trash_path: item.trash_path.to_string_lossy().to_string(),
            size: item.size,
            name: item.name,
            deleted_at: item.deleted_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TrashMetadata {
    items: Vec<TrashItemInternal>,
}

pub struct TrashManager {
    trash_dir: PathBuf,
    metadata_path: PathBuf,
}

impl TrashManager {
    pub fn new() -> Result<Self, String> {
        let trash_dir = dirs::home_dir()
            .ok_or("Could not find home directory")?
            .join(".diskclean-trash");

        Self::with_path(trash_dir)
    }

    /// Create a TrashManager with a custom trash directory (useful for testing)
    pub fn with_path(trash_dir: PathBuf) -> Result<Self, String> {
        let metadata_path = trash_dir.join(".metadata.json");

        // Create trash directory if it doesn't exist
        if !trash_dir.exists() {
            fs::create_dir_all(&trash_dir)
                .map_err(|e| format!("Failed to create trash directory: {}", e))?;
        }

        Ok(Self { trash_dir, metadata_path })
    }

    fn load_metadata(&self) -> TrashMetadata {
        if self.metadata_path.exists() {
            fs::read_to_string(&self.metadata_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or(TrashMetadata { items: vec![] })
        } else {
            TrashMetadata { items: vec![] }
        }
    }

    fn save_metadata(&self, metadata: &TrashMetadata) -> Result<(), String> {
        let json = serde_json::to_string_pretty(metadata)
            .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
        fs::write(&self.metadata_path, json)
            .map_err(|e| format!("Failed to write metadata: {}", e))?;
        Ok(())
    }

    fn get_size(path: &PathBuf) -> u64 {
        if path.is_file() {
            fs::metadata(path).map(|m| m.len()).unwrap_or(0)
        } else {
            walkdir::WalkDir::new(path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file())
                .filter_map(|e| e.metadata().ok())
                .map(|m| m.len())
                .sum()
        }
    }

    pub fn move_to_trash(&self, path: PathBuf) -> Result<TrashItem, String> {
        if !path.exists() {
            return Err(format!("Path does not exist: {:?}", path));
        }

        let id = Uuid::new_v4().to_string();
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let size = Self::get_size(&path);
        let trash_path = self.trash_dir.join(&id);

        // Move to trash
        if path.is_dir() {
            // Try simple rename first (works if on same filesystem)
            match fs::rename(&path, &trash_path) {
                Ok(_) => {},
                Err(_) => {
                    // Fall back to recursive copy + delete if rename fails
                    // Create target directory first
                    fs::create_dir_all(&trash_path)
                        .map_err(|e| format!("Failed to create trash target directory: {}", e))?;

                    // Copy all contents into the target
                    let mut options = fs_extra::dir::CopyOptions::new();
                    options.content_only = true;  // Copy contents, not the dir itself
                    options.overwrite = true;
                    fs_extra::dir::copy(&path, &trash_path, &options)
                        .map_err(|e| format!("Failed to copy directory to trash: {}", e))?;

                    // Remove original
                    fs::remove_dir_all(&path)
                        .map_err(|e| format!("Failed to remove original directory: {}", e))?;
                }
            }
        } else {
            fs::rename(&path, &trash_path)
                .or_else(|_| {
                    fs::copy(&path, &trash_path)?;
                    fs::remove_file(&path)
                })
                .map_err(|e| format!("Failed to move file to trash: {}", e))?;
        }

        let item = TrashItemInternal {
            id,
            original_path: path,
            trash_path,
            size,
            name,
            deleted_at: Utc::now(),
        };

        // Update metadata
        let mut metadata = self.load_metadata();
        metadata.items.push(item.clone());
        self.save_metadata(&metadata)?;

        Ok(item.into())
    }

    pub fn list_items(&self) -> Vec<TrashItem> {
        self.load_metadata().items.into_iter().map(|i| i.into()).collect()
    }

    pub fn restore_item(&self, id: &str) -> Result<(), String> {
        let mut metadata = self.load_metadata();

        let item_index = metadata.items.iter()
            .position(|i| i.id == id)
            .ok_or("Item not found in trash")?;

        let item = &metadata.items[item_index];

        // Ensure parent directory exists
        if let Some(parent) = item.original_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
        }

        // Move back to original location
        if item.trash_path.is_dir() {
            // Try simple rename first (works if on same filesystem)
            match fs::rename(&item.trash_path, &item.original_path) {
                Ok(_) => {},
                Err(_) => {
                    // Fall back to recursive copy + delete if rename fails
                    let mut options = fs_extra::dir::CopyOptions::new();
                    options.content_only = true;
                    options.overwrite = true;
                    fs::create_dir_all(&item.original_path)
                        .map_err(|e| format!("Failed to create restore target directory: {}", e))?;
                    fs_extra::dir::copy(&item.trash_path, &item.original_path, &options)
                        .map_err(|e| format!("Failed to copy directory for restore: {}", e))?;
                    fs::remove_dir_all(&item.trash_path)
                        .map_err(|e| format!("Failed to remove trash copy after restore: {}", e))?;
                }
            }
        } else {
            fs::rename(&item.trash_path, &item.original_path)
                .map_err(|e| format!("Failed to restore file: {}", e))?;
        }

        // Remove from metadata
        metadata.items.remove(item_index);
        self.save_metadata(&metadata)?;

        Ok(())
    }

    pub fn permanently_delete(&self, id: &str) -> Result<(), String> {
        let mut metadata = self.load_metadata();

        let item_index = metadata.items.iter()
            .position(|i| i.id == id)
            .ok_or("Item not found in trash")?;

        let item = &metadata.items[item_index];

        // Delete from disk
        if item.trash_path.is_dir() {
            fs::remove_dir_all(&item.trash_path)
                .map_err(|e| format!("Failed to delete directory: {}", e))?;
        } else {
            fs::remove_file(&item.trash_path)
                .map_err(|e| format!("Failed to delete file: {}", e))?;
        }

        // Remove from metadata
        metadata.items.remove(item_index);
        self.save_metadata(&metadata)?;

        Ok(())
    }

    pub fn purge_all(&self) -> Result<u32, String> {
        let metadata = self.load_metadata();
        let count = metadata.items.len() as u32;

        for item in &metadata.items {
            if item.trash_path.exists() {
                if item.trash_path.is_dir() {
                    let _ = fs::remove_dir_all(&item.trash_path);
                } else {
                    let _ = fs::remove_file(&item.trash_path);
                }
            }
        }

        self.save_metadata(&TrashMetadata { items: vec![] })?;

        Ok(count)
    }

    pub fn purge_old_items(&self, days: i64) -> Result<u32, String> {
        let mut metadata = self.load_metadata();
        let cutoff = Utc::now() - Duration::days(days);
        let mut deleted = 0;

        metadata.items.retain(|item| {
            if item.deleted_at < cutoff {
                if item.trash_path.exists() {
                    if item.trash_path.is_dir() {
                        let _ = fs::remove_dir_all(&item.trash_path);
                    } else {
                        let _ = fs::remove_file(&item.trash_path);
                    }
                }
                deleted += 1;
                false
            } else {
                true
            }
        });

        self.save_metadata(&metadata)?;

        Ok(deleted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::TempDir;

    fn setup_test_env() -> (TempDir, TempDir, TrashManager) {
        let trash_dir = TempDir::new().unwrap();
        let source_dir = TempDir::new().unwrap();
        let manager = TrashManager::with_path(trash_dir.path().to_path_buf()).unwrap();
        (trash_dir, source_dir, manager)
    }

    fn create_test_file(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let path = dir.path().join(name);
        let mut file = File::create(&path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        path
    }

    fn create_test_dir(dir: &TempDir, name: &str) -> PathBuf {
        let path = dir.path().join(name);
        fs::create_dir_all(&path).unwrap();
        // Add some files inside
        let mut file = File::create(path.join("file1.txt")).unwrap();
        file.write_all(b"test content 1").unwrap();
        let mut file = File::create(path.join("file2.txt")).unwrap();
        file.write_all(b"test content 2").unwrap();
        path
    }

    #[test]
    fn test_move_single_file_to_trash() {
        let (_trash_dir, source_dir, manager) = setup_test_env();
        let file_path = create_test_file(&source_dir, "test.txt", "hello world");

        assert!(file_path.exists());
        let result = manager.move_to_trash(file_path.clone());
        assert!(result.is_ok());

        let item = result.unwrap();
        assert_eq!(item.name, "test.txt");
        assert!(!file_path.exists()); // Original should be gone

        let items = manager.list_items();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].name, "test.txt");
    }

    #[test]
    fn test_move_directory_to_trash() {
        let (_trash_dir, source_dir, manager) = setup_test_env();
        let dir_path = create_test_dir(&source_dir, "test_folder");

        assert!(dir_path.exists());
        let result = manager.move_to_trash(dir_path.clone());
        assert!(result.is_ok());

        let item = result.unwrap();
        assert_eq!(item.name, "test_folder");
        assert!(!dir_path.exists()); // Original should be gone

        let items = manager.list_items();
        assert_eq!(items.len(), 1);
    }

    #[test]
    fn test_move_multiple_files_to_trash() {
        let (_trash_dir, source_dir, manager) = setup_test_env();

        let file1 = create_test_file(&source_dir, "file1.txt", "content 1");
        let file2 = create_test_file(&source_dir, "file2.txt", "content 2");
        let file3 = create_test_file(&source_dir, "file3.txt", "content 3");

        manager.move_to_trash(file1.clone()).unwrap();
        manager.move_to_trash(file2.clone()).unwrap();
        manager.move_to_trash(file3.clone()).unwrap();

        let items = manager.list_items();
        assert_eq!(items.len(), 3);

        assert!(!file1.exists());
        assert!(!file2.exists());
        assert!(!file3.exists());
    }

    #[test]
    fn test_restore_file() {
        let (_trash_dir, source_dir, manager) = setup_test_env();
        let file_path = create_test_file(&source_dir, "restore_me.txt", "restore content");

        let item = manager.move_to_trash(file_path.clone()).unwrap();
        assert!(!file_path.exists());

        manager.restore_item(&item.id).unwrap();
        assert!(file_path.exists());

        let items = manager.list_items();
        assert_eq!(items.len(), 0);
    }

    #[test]
    fn test_restore_directory() {
        let (_trash_dir, source_dir, manager) = setup_test_env();
        let dir_path = create_test_dir(&source_dir, "restore_folder");

        let item = manager.move_to_trash(dir_path.clone()).unwrap();
        assert!(!dir_path.exists());

        manager.restore_item(&item.id).unwrap();
        assert!(dir_path.exists());
        assert!(dir_path.join("file1.txt").exists());
        assert!(dir_path.join("file2.txt").exists());

        let items = manager.list_items();
        assert_eq!(items.len(), 0);
    }

    #[test]
    fn test_permanently_delete_file() {
        let (trash_dir, source_dir, manager) = setup_test_env();
        let file_path = create_test_file(&source_dir, "delete_me.txt", "delete content");

        let item = manager.move_to_trash(file_path.clone()).unwrap();
        let trash_path = PathBuf::from(&item.trash_path);
        assert!(trash_path.exists());

        manager.permanently_delete(&item.id).unwrap();
        assert!(!trash_path.exists());

        let items = manager.list_items();
        assert_eq!(items.len(), 0);
    }

    #[test]
    fn test_permanently_delete_directory() {
        let (_trash_dir, source_dir, manager) = setup_test_env();
        let dir_path = create_test_dir(&source_dir, "delete_folder");

        let item = manager.move_to_trash(dir_path.clone()).unwrap();
        let trash_path = PathBuf::from(&item.trash_path);
        assert!(trash_path.exists());

        manager.permanently_delete(&item.id).unwrap();
        assert!(!trash_path.exists());

        let items = manager.list_items();
        assert_eq!(items.len(), 0);
    }

    #[test]
    fn test_permanently_delete_multiple_items() {
        let (_trash_dir, source_dir, manager) = setup_test_env();

        let file1 = create_test_file(&source_dir, "del1.txt", "c1");
        let file2 = create_test_file(&source_dir, "del2.txt", "c2");
        let file3 = create_test_file(&source_dir, "del3.txt", "c3");

        let item1 = manager.move_to_trash(file1).unwrap();
        let item2 = manager.move_to_trash(file2).unwrap();
        let item3 = manager.move_to_trash(file3).unwrap();

        assert_eq!(manager.list_items().len(), 3);

        // Delete one by one
        manager.permanently_delete(&item1.id).unwrap();
        assert_eq!(manager.list_items().len(), 2);

        manager.permanently_delete(&item2.id).unwrap();
        assert_eq!(manager.list_items().len(), 1);

        manager.permanently_delete(&item3.id).unwrap();
        assert_eq!(manager.list_items().len(), 0);
    }

    #[test]
    fn test_purge_all() {
        let (_trash_dir, source_dir, manager) = setup_test_env();

        let file1 = create_test_file(&source_dir, "purge1.txt", "c1");
        let file2 = create_test_file(&source_dir, "purge2.txt", "c2");
        let dir1 = create_test_dir(&source_dir, "purge_folder");

        manager.move_to_trash(file1).unwrap();
        manager.move_to_trash(file2).unwrap();
        manager.move_to_trash(dir1).unwrap();

        assert_eq!(manager.list_items().len(), 3);

        let purged = manager.purge_all().unwrap();
        assert_eq!(purged, 3);
        assert_eq!(manager.list_items().len(), 0);
    }

    #[test]
    fn test_move_nonexistent_path_fails() {
        let (_trash_dir, _source_dir, manager) = setup_test_env();
        let fake_path = PathBuf::from("/nonexistent/path/file.txt");

        let result = manager.move_to_trash(fake_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_restore_nonexistent_id_fails() {
        let (_trash_dir, _source_dir, manager) = setup_test_env();

        let result = manager.restore_item("nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_nonexistent_id_fails() {
        let (_trash_dir, _source_dir, manager) = setup_test_env();

        let result = manager.permanently_delete("nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_file_size_calculation() {
        let (_trash_dir, source_dir, manager) = setup_test_env();
        let content = "x".repeat(1000); // 1000 bytes
        let file_path = create_test_file(&source_dir, "sized.txt", &content);

        let item = manager.move_to_trash(file_path).unwrap();
        assert_eq!(item.size, 1000);
    }

    #[test]
    fn test_metadata_persistence() {
        let (trash_dir, source_dir, _manager) = setup_test_env();

        // First manager instance
        {
            let manager = TrashManager::with_path(trash_dir.path().to_path_buf()).unwrap();
            let file1 = create_test_file(&source_dir, "persist1.txt", "c1");
            let file2 = create_test_file(&source_dir, "persist2.txt", "c2");
            manager.move_to_trash(file1).unwrap();
            manager.move_to_trash(file2).unwrap();
        }

        // New manager instance should load persisted metadata
        {
            let manager = TrashManager::with_path(trash_dir.path().to_path_buf()).unwrap();
            let items = manager.list_items();
            assert_eq!(items.len(), 2);
        }
    }

    #[test]
    fn test_restore_to_deleted_parent_directory() {
        let (_trash_dir, source_dir, manager) = setup_test_env();

        // Create nested structure
        let nested_dir = source_dir.path().join("parent").join("child");
        fs::create_dir_all(&nested_dir).unwrap();
        let file_path = nested_dir.join("file.txt");
        let mut file = File::create(&file_path).unwrap();
        file.write_all(b"nested content").unwrap();

        let item = manager.move_to_trash(file_path.clone()).unwrap();

        // Delete the parent directory
        fs::remove_dir_all(source_dir.path().join("parent")).unwrap();

        // Restore should recreate parent directories
        manager.restore_item(&item.id).unwrap();
        assert!(file_path.exists());
    }
}
