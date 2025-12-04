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
    pub group: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub current: usize,
    pub total: usize,
    pub current_path: String,
}

pub struct Scanner {
    home_dir: PathBuf,
}

impl Scanner {
    pub fn new() -> Self {
        let home_dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
        Self { home_dir }
    }

    fn get_dir_size(&self, path: &PathBuf) -> u64 {
        self.get_dir_size_limited(path, 50)
    }

    fn get_dir_size_limited(&self, path: &PathBuf, depth_limit: usize) -> u64 {
        if depth_limit == 0 {
            return 0;
        }
        let mut size = 0u64;
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_symlink() {
                    continue;
                }
                if path.is_file() {
                    size += fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                } else if path.is_dir() {
                    size += self.get_dir_size_limited(&path, depth_limit - 1);
                }
            }
        }
        size
    }

    pub fn scan_caches(&self) -> Vec<ScannedItem> {
        let mut items = Vec::new();
        let cache_dirs = vec![
            self.home_dir.join("Library/Caches"),
        ];

        for cache_dir in cache_dirs {
            if let Ok(entries) = fs::read_dir(&cache_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() && !path.is_symlink() {
                        let size = self.get_dir_size(&path);
                        if size > 1_000_000 {
                            let name = path.file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string();
                            items.push(ScannedItem {
                                id: path.to_string_lossy().to_string(),
                                name: name.clone(),
                                path: path.to_string_lossy().to_string(),
                                size,
                                item_type: "cache".to_string(),
                                group: Some(self.get_cache_group(&name)),
                            });
                        }
                    }
                }
            }
        }

        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    fn get_cache_group(&self, name: &str) -> String {
        let lower = name.to_lowercase();
        if lower.contains("apple") || lower.contains("com.apple") {
            "Apple".to_string()
        } else if lower.contains("google") || lower.contains("chrome") {
            "Google".to_string()
        } else if lower.contains("firefox") || lower.contains("mozilla") {
            "Mozilla".to_string()
        } else if lower.contains("spotify") {
            "Spotify".to_string()
        } else if lower.contains("slack") {
            "Slack".to_string()
        } else if lower.contains("discord") {
            "Discord".to_string()
        } else {
            "Other".to_string()
        }
    }

    pub fn scan_dev_artifacts(&self) -> Vec<ScannedItem> {
        let mut items = Vec::new();
        let dev_dirs = vec![
            self.home_dir.join("Projects"),
            self.home_dir.join("Developer"),
            self.home_dir.join("Code"),
            self.home_dir.join("repos"),
            self.home_dir.join("src"),
        ];

        let artifact_patterns = [
            ("node_modules", "npm"),
            ("target", "rust"),
            (".build", "swift"),
            ("build", "build"),
            ("dist", "dist"),
            (".next", "nextjs"),
            ("__pycache__", "python"),
            (".pytest_cache", "python"),
            ("venv", "python"),
            (".venv", "python"),
            ("vendor", "vendor"),
            ("Pods", "cocoapods"),
        ];

        for base_dir in dev_dirs {
            if base_dir.exists() {
                self.find_dev_artifacts(&base_dir, &artifact_patterns, &mut items, 0);
            }
        }

        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    fn find_dev_artifacts(
        &self,
        dir: &PathBuf,
        patterns: &[(&str, &str)],
        items: &mut Vec<ScannedItem>,
        depth: usize,
    ) {
        if depth > 6 {
            return;
        }

        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_symlink() {
                    continue;
                }
                if path.is_dir() {
                    let name = path.file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();

                    if let Some((_, group)) = patterns.iter().find(|(p, _)| *p == name) {
                        let size = self.get_dir_size(&path);
                        if size > 10_000_000 {
                            items.push(ScannedItem {
                                id: path.to_string_lossy().to_string(),
                                name: name.clone(),
                                path: path.to_string_lossy().to_string(),
                                size,
                                item_type: "dev-artifact".to_string(),
                                group: Some(group.to_string()),
                            });
                        }
                    } else if !name.starts_with('.') && name != "node_modules" && name != "target" {
                        self.find_dev_artifacts(&path, patterns, items, depth + 1);
                    }
                }
            }
        }
    }
}
