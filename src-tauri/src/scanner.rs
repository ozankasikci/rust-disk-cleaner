use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub item_type: String,
    pub group: Option<String>,
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
                let p = entry.path();
                if p.is_file() {
                    size += fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                } else if p.is_dir() && !p.is_symlink() {
                    size += self.get_dir_size(&p);
                }
            }
        }
        size
    }

    pub fn scan_caches(&self) -> Vec<ScannedItem> { Vec::new() }
    pub fn scan_dev_artifacts(&self) -> Vec<ScannedItem> { Vec::new() }
    pub fn scan_large_files(&self, _min_mb: u64) -> Vec<ScannedItem> { Vec::new() }
    pub fn scan_downloads(&self) -> Vec<ScannedItem> { Vec::new() }
    pub fn scan_duplicates(&self) -> Vec<ScannedItem> { Vec::new() }

    pub fn scan_old_logs(&self) -> Vec<ScannedItem> {
        let mut items = Vec::new();
        let log_dirs = vec![
            self.home_dir.join("Library/Logs"),
            PathBuf::from("/var/log"),
        ];

        for log_dir in log_dirs {
            if let Ok(entries) = fs::read_dir(&log_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

                    if name.ends_with(".log") || name.ends_with(".log.gz") {
                        if let Ok(meta) = fs::metadata(&path) {
                            if meta.len() > 1_000_000 {
                                items.push(ScannedItem {
                                    id: path.to_string_lossy().to_string(),
                                    name,
                                    path: path.to_string_lossy().to_string(),
                                    size: meta.len(),
                                    item_type: "log".to_string(),
                                    group: Some("System Logs".into()),
                                });
                            }
                        }
                    }
                }
            }
        }
        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    pub fn scan_unused_apps(&self) -> Vec<ScannedItem> {
        Vec::new()
    }
}
