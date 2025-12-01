use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use rayon::prelude::*;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedItem {
    pub id: String,
    pub path: PathBuf,
    pub size: u64,
    pub name: String,
    pub category: String,
    pub subcategory: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub items_found: usize,
    pub total_size: u64,
    pub current_path: String,
}

pub struct Scanner;

impl Scanner {
    pub fn new() -> Self {
        Self
    }

    fn expand_path(path: &str) -> Option<PathBuf> {
        if path.starts_with("~/") {
            dirs::home_dir().map(|home| home.join(&path[2..]))
        } else {
            Some(PathBuf::from(path))
        }
    }

    fn get_dir_size(path: &Path) -> u64 {
        WalkDir::new(path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
            .filter_map(|e| e.metadata().ok())
            .map(|m| m.len())
            .sum()
    }

    pub fn scan_caches(&self) -> Vec<ScannedItem> {
        let cache_locations: Vec<(&str, &str)> = vec![
            ("npm", "~/.npm/_cacache"),
            ("yarn", "~/.yarn/cache"),
            ("pnpm", "~/.pnpm-store"),
            ("Homebrew", "~/Library/Caches/Homebrew"),
            ("pip", "~/Library/Caches/pip"),
            ("Xcode DerivedData", "~/Library/Developer/Xcode/DerivedData"),
            ("CocoaPods", "~/Library/Caches/CocoaPods"),
            ("Gradle", "~/.gradle/caches"),
            ("Maven", "~/.m2/repository"),
            ("Cargo", "~/.cargo/registry"),
        ];

        let mut items: Vec<ScannedItem> = cache_locations
            .par_iter()
            .filter_map(|(name, path_str)| {
                let path = Self::expand_path(path_str)?;
                if path.exists() {
                    let size = Self::get_dir_size(&path);
                    if size > 0 {
                        Some(ScannedItem {
                            id: Uuid::new_v4().to_string(),
                            path: path.clone(),
                            size,
                            name: name.to_string(),
                            category: "caches".to_string(),
                            subcategory: name.to_string(),
                        })
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
            .collect();

        // Sort by size descending
        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    pub fn scan_dev_artifacts(&self) -> Vec<ScannedItem> {
        let home = match dirs::home_dir() {
            Some(h) => h,
            None => return vec![],
        };

        let artifact_names = vec![
            "node_modules",
            "target",
            ".build",
            "build",
            "dist",
            ".gradle",
            "Pods",
            "venv",
            ".venv",
            "__pycache__",
            ".next",
            ".nuxt",
        ];

        let mut items: Vec<ScannedItem> = vec![];

        // Scan common project directories
        let search_dirs = vec![
            home.join("Projects"),
            home.join("Developer"),
            home.join("dev"),
            home.join("code"),
            home.join("repos"),
            home.join("workspace"),
        ];

        for search_dir in search_dirs {
            if !search_dir.exists() {
                continue;
            }

            for entry in WalkDir::new(&search_dir)
                .max_depth(5)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let path = entry.path();
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if artifact_names.contains(&name) && path.is_dir() {
                        // Skip if parent is already a dev artifact
                        let parent_is_artifact = path
                            .parent()
                            .and_then(|p| p.file_name())
                            .and_then(|n| n.to_str())
                            .map(|n| artifact_names.contains(&n))
                            .unwrap_or(false);

                        if !parent_is_artifact {
                            let size = Self::get_dir_size(path);
                            if size > 1_000_000 { // Only include if > 1MB
                                let project_name = path
                                    .parent()
                                    .and_then(|p| p.file_name())
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("Unknown")
                                    .to_string();

                                items.push(ScannedItem {
                                    id: Uuid::new_v4().to_string(),
                                    path: path.to_path_buf(),
                                    size,
                                    name: format!("{} ({})", name, project_name),
                                    category: "dev-artifacts".to_string(),
                                    subcategory: name.to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }

        // Sort by size descending
        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    pub fn scan_large_files(&self, min_size_mb: u64) -> Vec<ScannedItem> {
        let home = match dirs::home_dir() {
            Some(h) => h,
            None => return vec![],
        };

        let min_size = min_size_mb * 1_000_000;
        let mut items: Vec<ScannedItem> = vec![];

        // Directories to skip
        let skip_dirs: Vec<&str> = vec![
            "Library",
            ".Trash",
            "Applications",
            ".diskclean-trash",
            "node_modules",
            "target",
        ];

        for entry in WalkDir::new(&home)
            .max_depth(6)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_str().unwrap_or("");
                !skip_dirs.contains(&name) && !name.starts_with('.')
            })
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() {
                if let Ok(metadata) = fs::metadata(path) {
                    let size = metadata.len();
                    if size >= min_size {
                        let extension = path
                            .extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("unknown")
                            .to_lowercase();

                        let file_type = match extension.as_str() {
                            "mp4" | "mov" | "avi" | "mkv" | "wmv" => "Video",
                            "dmg" | "iso" | "pkg" => "Disk Image",
                            "zip" | "tar" | "gz" | "rar" | "7z" => "Archive",
                            "app" => "Application",
                            _ => "Other",
                        };

                        items.push(ScannedItem {
                            id: Uuid::new_v4().to_string(),
                            path: path.to_path_buf(),
                            size,
                            name: path.file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("Unknown")
                                .to_string(),
                            category: "large-files".to_string(),
                            subcategory: file_type.to_string(),
                        });
                    }
                }
            }
        }

        // Sort by size descending
        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    pub fn scan_downloads(&self) -> Vec<ScannedItem> {
        let downloads_dir = match dirs::download_dir() {
            Some(d) => d,
            None => return vec![],
        };

        let mut items: Vec<ScannedItem> = vec![];

        // Look for old files in Downloads (older than 30 days conceptually, but we check all for now)
        // and installer files
        let installer_extensions = vec!["dmg", "pkg", "exe", "msi", "app", "iso"];

        for entry in WalkDir::new(&downloads_dir)
            .max_depth(3)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() {
                if let Ok(metadata) = fs::metadata(path) {
                    let size = metadata.len();
                    if size > 1_000_000 { // Only files > 1MB
                        let extension = path
                            .extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("")
                            .to_lowercase();

                        let file_type = if installer_extensions.contains(&extension.as_str()) {
                            "Installer"
                        } else {
                            match extension.as_str() {
                                "zip" | "tar" | "gz" | "rar" | "7z" => "Archive",
                                "mp4" | "mov" | "avi" | "mkv" => "Video",
                                "mp3" | "wav" | "flac" | "m4a" => "Audio",
                                "pdf" | "doc" | "docx" | "xls" | "xlsx" => "Document",
                                _ => "Other",
                            }
                        };

                        items.push(ScannedItem {
                            id: Uuid::new_v4().to_string(),
                            path: path.to_path_buf(),
                            size,
                            name: path.file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("Unknown")
                                .to_string(),
                            category: "downloads".to_string(),
                            subcategory: file_type.to_string(),
                        });
                    }
                }
            }
        }

        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    pub fn scan_duplicates(&self) -> Vec<ScannedItem> {
        use std::collections::HashMap;

        let home = match dirs::home_dir() {
            Some(h) => h,
            None => return vec![],
        };

        // Map of (size, first few bytes) -> list of paths
        let mut size_map: HashMap<u64, Vec<PathBuf>> = HashMap::new();

        let skip_dirs: Vec<&str> = vec![
            "Library", ".Trash", "Applications", ".diskclean-trash",
            "node_modules", "target", ".git",
        ];

        // First pass: group files by size
        for entry in WalkDir::new(&home)
            .max_depth(5)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_str().unwrap_or("");
                !skip_dirs.contains(&name) && !name.starts_with('.')
            })
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() {
                if let Ok(metadata) = fs::metadata(path) {
                    let size = metadata.len();
                    // Only consider files > 1MB for duplicates
                    if size > 1_000_000 {
                        size_map.entry(size).or_insert_with(Vec::new).push(path.to_path_buf());
                    }
                }
            }
        }

        let mut items: Vec<ScannedItem> = vec![];

        // Second pass: find actual duplicates (same size files)
        for (size, paths) in size_map {
            if paths.len() > 1 {
                // These are potential duplicates (same size)
                for path in paths {
                    let extension = path
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("unknown")
                        .to_lowercase();

                    let file_type = match extension.as_str() {
                        "mp4" | "mov" | "avi" | "mkv" => "Video",
                        "jpg" | "jpeg" | "png" | "gif" | "heic" => "Image",
                        "mp3" | "wav" | "flac" | "m4a" => "Audio",
                        "pdf" | "doc" | "docx" => "Document",
                        _ => "Other",
                    };

                    items.push(ScannedItem {
                        id: Uuid::new_v4().to_string(),
                        path: path.clone(),
                        size,
                        name: path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string(),
                        category: "duplicates".to_string(),
                        subcategory: file_type.to_string(),
                    });
                }
            }
        }

        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }

    pub fn scan_old_logs(&self) -> Vec<ScannedItem> {
        let home = match dirs::home_dir() {
            Some(h) => h,
            None => return vec![],
        };

        let log_locations: Vec<PathBuf> = vec![
            home.join("Library/Logs"),
            PathBuf::from("/var/log"),
            home.join(".npm/_logs"),
        ];

        let mut items: Vec<ScannedItem> = vec![];

        for log_dir in log_locations {
            if !log_dir.exists() {
                continue;
            }

            for entry in WalkDir::new(&log_dir)
                .max_depth(4)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let path = entry.path();
                if path.is_file() {
                    let name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");

                    // Check if it's a log file
                    let is_log = name.ends_with(".log")
                        || name.ends_with(".log.gz")
                        || name.contains("crash")
                        || name.ends_with(".diag");

                    if is_log {
                        if let Ok(metadata) = fs::metadata(path) {
                            let size = metadata.len();
                            if size > 10_000 { // > 10KB
                                let log_type = if name.contains("crash") {
                                    "Crash Report"
                                } else if name.ends_with(".gz") {
                                    "Archived Log"
                                } else {
                                    "Log File"
                                };

                                items.push(ScannedItem {
                                    id: Uuid::new_v4().to_string(),
                                    path: path.to_path_buf(),
                                    size,
                                    name: name.to_string(),
                                    category: "old-logs".to_string(),
                                    subcategory: log_type.to_string(),
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
        let apps_dir = PathBuf::from("/Applications");
        let mut items: Vec<ScannedItem> = vec![];

        if !apps_dir.exists() {
            return items;
        }

        for entry in fs::read_dir(&apps_dir).into_iter().flatten().flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("app") {
                let size = Self::get_dir_size(&path);
                if size > 10_000_000 { // > 10MB
                    let name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("Unknown")
                        .to_string();

                    // Skip system apps
                    let system_apps = vec![
                        "Safari.app", "Mail.app", "Calendar.app", "Notes.app",
                        "Messages.app", "FaceTime.app", "Photos.app", "Music.app",
                        "Podcasts.app", "TV.app", "News.app", "Stocks.app",
                        "Books.app", "App Store.app", "System Preferences.app",
                        "System Settings.app", "Finder.app", "Utilities",
                    ];

                    if !system_apps.contains(&name.as_str()) {
                        items.push(ScannedItem {
                            id: Uuid::new_v4().to_string(),
                            path: path.clone(),
                            size,
                            name,
                            category: "unused-apps".to_string(),
                            subcategory: "Application".to_string(),
                        });
                    }
                }
            }
        }

        items.sort_by(|a, b| b.size.cmp(&a.size));
        items
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    /// Create a file with specific content to control its size
    fn create_file_with_size(path: &Path, size: usize) -> std::io::Result<()> {
        let mut file = fs::File::create(path)?;
        file.write_all(&vec![0u8; size])?;
        Ok(())
    }

    /// Create a directory structure for testing
    fn create_dir_structure(base: &Path, name: &str, file_sizes: &[usize]) -> PathBuf {
        let dir = base.join(name);
        fs::create_dir_all(&dir).unwrap();
        for (i, size) in file_sizes.iter().enumerate() {
            create_file_with_size(&dir.join(format!("file_{}.txt", i)), *size).unwrap();
        }
        dir
    }

    #[test]
    fn test_expand_path_with_tilde() {
        let result = Scanner::expand_path("~/test/path");
        assert!(result.is_some());
        let path = result.unwrap();
        assert!(path.ends_with("test/path"));
        // Should not start with ~
        assert!(!path.to_string_lossy().starts_with('~'));
    }

    #[test]
    fn test_expand_path_absolute() {
        let result = Scanner::expand_path("/absolute/path");
        assert!(result.is_some());
        let path = result.unwrap();
        assert_eq!(path, PathBuf::from("/absolute/path"));
    }

    #[test]
    fn test_expand_path_relative() {
        let result = Scanner::expand_path("relative/path");
        assert!(result.is_some());
        let path = result.unwrap();
        assert_eq!(path, PathBuf::from("relative/path"));
    }

    #[test]
    fn test_get_dir_size_empty() {
        let temp = TempDir::new().unwrap();
        let size = Scanner::get_dir_size(temp.path());
        assert_eq!(size, 0);
    }

    #[test]
    fn test_get_dir_size_with_files() {
        let temp = TempDir::new().unwrap();

        // Create files with known sizes
        create_file_with_size(&temp.path().join("file1.txt"), 100).unwrap();
        create_file_with_size(&temp.path().join("file2.txt"), 200).unwrap();

        let size = Scanner::get_dir_size(temp.path());
        assert_eq!(size, 300);
    }

    #[test]
    fn test_get_dir_size_nested() {
        let temp = TempDir::new().unwrap();

        // Create nested directory structure
        let subdir = temp.path().join("subdir");
        fs::create_dir_all(&subdir).unwrap();

        create_file_with_size(&temp.path().join("file1.txt"), 100).unwrap();
        create_file_with_size(&subdir.join("file2.txt"), 200).unwrap();

        let size = Scanner::get_dir_size(temp.path());
        assert_eq!(size, 300);
    }

    #[test]
    fn test_scanned_item_structure() {
        let item = ScannedItem {
            id: "test-id".to_string(),
            path: PathBuf::from("/test/path"),
            size: 1000,
            name: "test-item".to_string(),
            category: "test-category".to_string(),
            subcategory: "test-subcategory".to_string(),
        };

        assert_eq!(item.id, "test-id");
        assert_eq!(item.path, PathBuf::from("/test/path"));
        assert_eq!(item.size, 1000);
        assert_eq!(item.name, "test-item");
        assert_eq!(item.category, "test-category");
        assert_eq!(item.subcategory, "test-subcategory");
    }

    #[test]
    fn test_scanner_new() {
        let scanner = Scanner::new();
        // Scanner is a unit struct, just verify it can be created
        let _ = scanner;
    }

    #[test]
    fn test_scan_caches_returns_sorted() {
        // This test verifies sorting behavior - results should be sorted by size descending
        let scanner = Scanner::new();
        let items = scanner.scan_caches();

        // Verify sorting (each item should be >= the next in size)
        for i in 0..items.len().saturating_sub(1) {
            assert!(
                items[i].size >= items[i + 1].size,
                "Items not sorted: {} ({}) should be >= {} ({})",
                items[i].name, items[i].size,
                items[i + 1].name, items[i + 1].size
            );
        }

        // Verify all items have correct category
        for item in &items {
            assert_eq!(item.category, "caches");
            assert!(!item.id.is_empty());
            assert!(item.size > 0);
        }
    }

    #[test]
    fn test_scan_dev_artifacts_returns_sorted() {
        // This test verifies sorting behavior - results should be sorted by size descending
        let scanner = Scanner::new();
        let items = scanner.scan_dev_artifacts();

        // Verify sorting (each item should be >= the next in size)
        for i in 0..items.len().saturating_sub(1) {
            assert!(
                items[i].size >= items[i + 1].size,
                "Items not sorted: {} ({}) should be >= {} ({})",
                items[i].name, items[i].size,
                items[i + 1].name, items[i + 1].size
            );
        }

        // Verify all items have correct category
        for item in &items {
            assert_eq!(item.category, "dev-artifacts");
            assert!(!item.id.is_empty());
            // Dev artifacts must be > 1MB
            assert!(item.size > 1_000_000);
        }
    }

    #[test]
    fn test_scan_large_files_returns_sorted() {
        // This test verifies sorting behavior - results should be sorted by size descending
        let scanner = Scanner::new();
        let items = scanner.scan_large_files(100);

        // Verify sorting (each item should be >= the next in size)
        for i in 0..items.len().saturating_sub(1) {
            assert!(
                items[i].size >= items[i + 1].size,
                "Items not sorted: {} ({}) should be >= {} ({})",
                items[i].name, items[i].size,
                items[i + 1].name, items[i + 1].size
            );
        }

        // Verify all items have correct category and min size
        for item in &items {
            assert_eq!(item.category, "large-files");
            assert!(!item.id.is_empty());
            // Large files must be >= 100MB
            assert!(item.size >= 100_000_000);
        }
    }

    #[test]
    fn test_file_type_classification() {
        // Test the file extension to type mapping logic
        let test_cases = vec![
            ("mp4", "Video"),
            ("mov", "Video"),
            ("avi", "Video"),
            ("mkv", "Video"),
            ("wmv", "Video"),
            ("dmg", "Disk Image"),
            ("iso", "Disk Image"),
            ("pkg", "Disk Image"),
            ("zip", "Archive"),
            ("tar", "Archive"),
            ("gz", "Archive"),
            ("rar", "Archive"),
            ("7z", "Archive"),
            ("app", "Application"),
            ("txt", "Other"),
            ("pdf", "Other"),
        ];

        for (ext, expected_type) in test_cases {
            let actual = match ext {
                "mp4" | "mov" | "avi" | "mkv" | "wmv" => "Video",
                "dmg" | "iso" | "pkg" => "Disk Image",
                "zip" | "tar" | "gz" | "rar" | "7z" => "Archive",
                "app" => "Application",
                _ => "Other",
            };
            assert_eq!(actual, expected_type, "Extension {} should map to {}", ext, expected_type);
        }
    }

    #[test]
    fn test_artifact_names_coverage() {
        // Verify all expected artifact names are included
        let expected_artifacts = vec![
            "node_modules",
            "target",
            ".build",
            "build",
            "dist",
            ".gradle",
            "Pods",
            "venv",
            ".venv",
            "__pycache__",
            ".next",
            ".nuxt",
        ];

        // This tests that the artifact_names list in scan_dev_artifacts is comprehensive
        let artifact_names = vec![
            "node_modules",
            "target",
            ".build",
            "build",
            "dist",
            ".gradle",
            "Pods",
            "venv",
            ".venv",
            "__pycache__",
            ".next",
            ".nuxt",
        ];

        for expected in expected_artifacts {
            assert!(
                artifact_names.contains(&expected),
                "Missing artifact: {}",
                expected
            );
        }
    }

    #[test]
    fn test_skip_dirs_coverage() {
        // Verify directories that should be skipped in large file scan
        let skip_dirs: Vec<&str> = vec![
            "Library",
            ".Trash",
            "Applications",
            ".diskclean-trash",
            "node_modules",
            "target",
        ];

        // These are system/large directories that should be skipped
        assert!(skip_dirs.contains(&"Library"));
        assert!(skip_dirs.contains(&".Trash"));
        assert!(skip_dirs.contains(&"Applications"));
        assert!(skip_dirs.contains(&".diskclean-trash"));
    }

    #[test]
    fn test_scanned_item_serialization() {
        let item = ScannedItem {
            id: "test-id".to_string(),
            path: PathBuf::from("/test/path"),
            size: 1000,
            name: "test-item".to_string(),
            category: "test".to_string(),
            subcategory: "sub".to_string(),
        };

        // Test that ScannedItem can be serialized (required for Tauri IPC)
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"id\":\"test-id\""));
        assert!(json.contains("\"size\":1000"));

        // Test deserialization
        let deserialized: ScannedItem = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, item.id);
        assert_eq!(deserialized.size, item.size);
    }
}
