mod commands;
mod config;
mod scanner;
mod categorizer;
mod trash;

use commands::{
    scan_category, delete_items, list_trash, restore_items, purge_trash, permanently_delete,
    permanently_delete_items, AppState,
};
use trash::TrashManager;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let trash_manager = TrashManager::new()
        .expect("Failed to initialize trash manager");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            trash_manager: Mutex::new(trash_manager),
        })
        .invoke_handler(tauri::generate_handler![
            scan_category,
            delete_items,
            list_trash,
            restore_items,
            purge_trash,
            permanently_delete,
            permanently_delete_items
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
