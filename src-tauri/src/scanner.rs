use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub item_type: String,
}

pub struct Scanner {
    home_dir: PathBuf,
}

impl Scanner {
    pub fn new() -> Self {
        let home_dir = dirs::home_dir().unwrap_or_default();
        Self { home_dir }
    }

    fn get_dir_size(&self, path: &PathBuf) -> u64 {
        let mut size = 0u64;
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    size += fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                } else if path.is_dir() {
                    size += self.get_dir_size(&path);
                }
            }
        }
        size
    }

    pub fn scan_caches(&self) -> Vec<ScannedItem> {
        let mut items = Vec::new();
        let cache_dir = self.home_dir.join("Library/Caches");

        if let Ok(entries) = fs::read_dir(&cache_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let size = self.get_dir_size(&path);
                    if size > 1_000_000 {
                        items.push(ScannedItem {
                            id: path.to_string_lossy().to_string(),
                            name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                            path: path.to_string_lossy().to_string(),
                            size,
                            item_type: "cache".to_string(),
                        });
                    }
                }
            }
        }

        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    pub fn scan_dev_artifacts(&self) -> Vec<ScannedItem> {
        let mut items = Vec::new();
        let artifact_names = ["node_modules", "target", ".build", "build", "dist", ".next"];

        for base in ["Projects", "Developer", "Code"] {
            let dir = self.home_dir.join(base);
            if dir.exists() {
                self.find_artifacts(&dir, &artifact_names, &mut items, 0);
            }
        }

        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    fn find_artifacts(&self, dir: &PathBuf, names: &[&str], items: &mut Vec<ScannedItem>, depth: usize) {
        if depth > 5 { return; }

        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let name = path.file_name().unwrap_or_default().to_string_lossy();
                    if names.contains(&name.as_ref()) {
                        let size = self.get_dir_size(&path);
                        if size > 10_000_000 {
                            items.push(ScannedItem {
                                id: path.to_string_lossy().to_string(),
                                name: name.to_string(),
                                path: path.to_string_lossy().to_string(),
                                size,
                                item_type: "dev-artifact".to_string(),
                            });
                        }
                    } else if !name.starts_with('.') {
                        self.find_artifacts(&path, names, items, depth + 1);
                    }
                }
            }
        }
    }
}
