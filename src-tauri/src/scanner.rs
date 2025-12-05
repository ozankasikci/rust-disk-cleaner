use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::collections::HashMap;

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
        self.get_dir_size_limited(path, 50)
    }

    fn get_dir_size_limited(&self, path: &PathBuf, limit: usize) -> u64 {
        if limit == 0 { return 0; }
        let mut size = 0u64;
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_symlink() { continue; }
                if p.is_file() {
                    size += fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                } else if p.is_dir() {
                    size += self.get_dir_size_limited(&p, limit - 1);
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
                if path.is_dir() && !path.is_symlink() {
                    let size = self.get_dir_size(&path);
                    if size > 1_000_000 {
                        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        items.push(ScannedItem {
                            id: path.to_string_lossy().to_string(),
                            name: name.clone(),
                            path: path.to_string_lossy().to_string(),
                            size,
                            item_type: "cache".to_string(),
                            group: Some(self.categorize_cache(&name)),
                        });
                    }
                }
            }
        }
        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    fn categorize_cache(&self, name: &str) -> String {
        let lower = name.to_lowercase();
        if lower.contains("apple") { "Apple".into() }
        else if lower.contains("google") || lower.contains("chrome") { "Google".into() }
        else if lower.contains("firefox") { "Mozilla".into() }
        else if lower.contains("spotify") { "Spotify".into() }
        else { "Other".into() }
    }

    pub fn scan_dev_artifacts(&self) -> Vec<ScannedItem> {
        Vec::new()
    }

    pub fn scan_large_files(&self, _min_mb: u64) -> Vec<ScannedItem> {
        Vec::new()
    }

    pub fn scan_downloads(&self) -> Vec<ScannedItem> {
        Vec::new()
    }

    pub fn scan_duplicates(&self) -> Vec<ScannedItem> {
        Vec::new()
    }

    pub fn scan_old_logs(&self) -> Vec<ScannedItem> {
        Vec::new()
    }

    pub fn scan_unused_apps(&self) -> Vec<ScannedItem> {
        Vec::new()
    }
}
