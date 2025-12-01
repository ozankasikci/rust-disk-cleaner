mod commands;
mod scanner;

use commands::scan_category;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![scan_category])
        .run(tauri::generate_context!())
        .expect("error running app");
}
