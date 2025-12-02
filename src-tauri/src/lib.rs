mod commands;
mod scanner;
mod trash;

use commands::*;
use trash::TrashManager;
use std::sync::Mutex;

pub struct AppState {
    pub trash_manager: Mutex<TrashManager>,
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            trash_manager: Mutex::new(TrashManager::new()),
        })
        .invoke_handler(tauri::generate_handler![
            scan_category,
            delete_items,
            list_trash,
            restore_items,
            purge_trash,
            permanently_delete,
            permanently_delete_items,
        ])
        .run(tauri::generate_context!())
        .expect("error running app");
}
