#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    disk_cleaner_lib::run()
}
