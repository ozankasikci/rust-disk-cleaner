use crate::scanner::{Scanner, ScannedItem};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub items: Vec<ScannedItem>,
    pub total_size: u64,
    pub item_count: usize,
}

#[tauri::command]
pub async fn scan_category(category: String) -> Result<ScanResult, String> {
    let scanner = Scanner::new();

    let items = match category.as_str() {
        "caches" => scanner.scan_caches(),
        _ => return Err(format!("Unknown category: {}", category)),
    };

    let total_size: u64 = items.iter().map(|i| i.size).sum();
    let item_count = items.len();

    Ok(ScanResult { items, total_size, item_count })
}
