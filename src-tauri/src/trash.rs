use serde::{Deserialize, Serialize};
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
}

impl TrashManager {
    pub fn new() -> Self {
        let trash_dir = dirs::data_local_dir()
            .unwrap_or_default()
            .join("disk-cleaner")
            .join("trash");
        std::fs::create_dir_all(&trash_dir).ok();
        Self { trash_dir }
    }

    pub fn list_items(&self) -> Vec<TrashItem> {
        Vec::new()
    }
}
