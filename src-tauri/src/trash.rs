use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashItem {
    pub id: String,
    pub name: String,
    pub original_path: String,
    pub size: u64,
    pub deleted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TrashMetadata {
    id: String,
    name: String,
    original_path: String,
    size: u64,
    deleted_at: DateTime<Utc>,
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
        let mut items = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.metadata_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map(|e| e == "json").unwrap_or(false) {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(meta) = serde_json::from_str::<TrashMetadata>(&content) {
                            items.push(TrashItem {
                                id: meta.id,
                                name: meta.name,
                                original_path: meta.original_path,
                                size: meta.size,
                                deleted_at: meta.deleted_at.to_rfc3339(),
                            });
                        }
                    }
                }
            }
        }
        items.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
        items
    }

    pub fn move_to_trash(&self, path: PathBuf) -> Result<(), String> {
        let id = uuid::Uuid::new_v4().to_string();
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let size = self.get_size(&path);

        let dest = self.trash_dir.join(&id);
        if path.is_dir() {
            self.copy_dir(&path, &dest)?;
            fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
        } else {
            fs::copy(&path, &dest).map_err(|e| e.to_string())?;
            fs::remove_file(&path).map_err(|e| e.to_string())?;
        }

        let meta = TrashMetadata {
            id: id.clone(),
            name,
            original_path: path.to_string_lossy().to_string(),
            size,
            deleted_at: Utc::now(),
        };

        let meta_path = self.metadata_dir.join(format!("{}.json", id));
        fs::write(&meta_path, serde_json::to_string(&meta).unwrap())
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn get_size(&self, path: &PathBuf) -> u64 {
        if path.is_file() {
            fs::metadata(path).map(|m| m.len()).unwrap_or(0)
        } else {
            let mut size = 0u64;
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.flatten() {
                    size += self.get_size(&entry.path());
                }
            }
            size
        }
    }

    fn copy_dir(&self, src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
        fs::create_dir_all(dst).map_err(|e| e.to_string())?;
        if let Ok(entries) = fs::read_dir(src) {
            for entry in entries.flatten() {
                let src_path = entry.path();
                let dst_path = dst.join(entry.file_name());
                if src_path.is_dir() {
                    self.copy_dir(&src_path, &dst_path)?;
                } else {
                    fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
                }
            }
        }
        Ok(())
    }

    pub fn restore_item(&self, id: &str) -> Result<(), String> {
        let meta_path = self.metadata_dir.join(format!("{}.json", id));
        let content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
        let meta: TrashMetadata = serde_json::from_str(&content).map_err(|e| e.to_string())?;

        let src = self.trash_dir.join(id);
        let dst = PathBuf::from(&meta.original_path);

        if src.is_dir() {
            self.copy_dir(&src, &dst)?;
            fs::remove_dir_all(&src).map_err(|e| e.to_string())?;
        } else {
            fs::copy(&src, &dst).map_err(|e| e.to_string())?;
            fs::remove_file(&src).map_err(|e| e.to_string())?;
        }

        fs::remove_file(&meta_path).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn permanently_delete(&self, id: &str) -> Result<(), String> {
        let trash_path = self.trash_dir.join(id);
        let meta_path = self.metadata_dir.join(format!("{}.json", id));

        if trash_path.is_dir() {
            fs::remove_dir_all(&trash_path).map_err(|e| e.to_string())?;
        } else if trash_path.exists() {
            fs::remove_file(&trash_path).map_err(|e| e.to_string())?;
        }

        if meta_path.exists() {
            fs::remove_file(&meta_path).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub fn purge_all(&self) -> Result<u32, String> {
        let items = self.list_items();
        let mut deleted = 0u32;
        for item in items {
            if self.permanently_delete(&item.id).is_ok() {
                deleted += 1;
            }
        }
        Ok(deleted)
    }
}
