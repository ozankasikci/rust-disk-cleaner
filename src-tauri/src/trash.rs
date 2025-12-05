use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashItem {
    pub id: String,
    pub name: String,
    pub original_path: String,
    pub size: u64,
    pub deleted_at: String,
}

pub struct TrashManager {
    trash_dir: PathBuf,
    metadata_dir: PathBuf,
}

impl TrashManager {
    pub fn new() -> Self {
        let base = dirs::data_local_dir()
            .unwrap_or_default()
            .join("disk-cleaner");
        let trash_dir = base.join("trash");
        let metadata_dir = base.join("metadata");
        fs::create_dir_all(&trash_dir).ok();
        fs::create_dir_all(&metadata_dir).ok();
        Self { trash_dir, metadata_dir }
    }

    pub fn list_items(&self) -> Vec<TrashItem> {
        Vec::new()
    }

    pub fn move_to_trash(&self, _path: PathBuf) -> Result<(), String> {
        Ok(())
    }

    pub fn restore_item(&self, _id: &str) -> Result<(), String> {
        Ok(())
    }

    pub fn permanently_delete(&self, _id: &str) -> Result<(), String> {
        Ok(())
    }

    pub fn purge_all(&self) -> Result<u32, String> {
        Ok(0)
    }
}
