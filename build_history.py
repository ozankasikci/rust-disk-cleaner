#!/usr/bin/env python3
"""
Build progressive git history for RustDiskCleaner project.
Creates ~200 commits that reflect actual development progression.
"""

import subprocess
import os
import random
import shutil
from datetime import datetime, timedelta
from pathlib import Path

# Source directory with actual files
SOURCE_DIR = Path("/Users/ozan/Projects/ai-disk-clean")
WORK_DIR = Path("/Users/ozan/Projects/ai-disk-clean-rewrite")

# Start date: 7 days ago
START_DATE = datetime.now() - timedelta(days=7)

# Track current commit number for timestamp calculation
commit_count = 0
total_commits = 210

def get_timestamp(commit_num):
    """Generate realistic timestamp spread over 7 days with working hour patterns."""
    progress = commit_num / total_commits
    days_offset = progress * 7

    # Add some randomness to simulate bursts of work
    days_offset += random.uniform(-0.15, 0.15)
    days_offset = max(0, min(7, days_offset))

    date = START_DATE + timedelta(days=days_offset)

    # Simulate working hours (9am - 11pm) with higher activity afternoon/evening
    hour_weights = [0]*9 + [1,2,3,4,5,6,7,8,8,7,6,5,4,3] + [0]
    hour = random.choices(range(24), weights=hour_weights)[0]
    minute = random.randint(0, 59)
    second = random.randint(0, 59)

    date = date.replace(hour=hour, minute=minute, second=second)
    return date.strftime("%Y-%m-%dT%H:%M:%S")

def commit(message, files=None):
    """Create a commit with the given message and optional specific files."""
    global commit_count
    commit_count += 1

    timestamp = get_timestamp(commit_count)

    os.chdir(WORK_DIR)

    if files:
        for f in files:
            subprocess.run(["git", "add", f], check=True, capture_output=True)
    else:
        subprocess.run(["git", "add", "-A"], check=True, capture_output=True)

    # Check if there are changes to commit
    result = subprocess.run(["git", "diff", "--cached", "--quiet"], capture_output=True)
    if result.returncode == 0:
        print(f"  Skipping (no changes): {message}")
        commit_count -= 1
        return False

    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = timestamp
    env["GIT_COMMITTER_DATE"] = timestamp

    subprocess.run(["git", "commit", "-m", message], check=True, capture_output=True, env=env)
    print(f"[{commit_count}] {message}")
    return True

def copy_file(src_rel, dst_rel=None):
    """Copy a file from source to work directory (binary safe)."""
    if dst_rel is None:
        dst_rel = src_rel
    src = SOURCE_DIR / src_rel
    dst = WORK_DIR / dst_rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.exists():
        shutil.copy2(src, dst)
    return dst_rel

def write_file(rel_path, content):
    """Write content to a file."""
    dst = WORK_DIR / rel_path
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(content)
    return rel_path

def build_history():
    """Build the progressive commit history."""

    print("Building progressive commit history...")
    print("=" * 50)

    # ========================================
    # Phase 1: Project Initialization (1-15)
    # ========================================

    write_file(".gitignore", "node_modules/\ntarget/\ndist/\n.DS_Store\n")
    commit("Initial commit")

    write_file("README.md", "# Disk Cleaner\n\nA macOS disk cleanup utility.\n")
    commit("Add README")

    write_file("package.json", """{
  "name": "disk-cleaner",
  "private": true,
  "version": "0.0.1",
  "type": "module"
}
""")
    commit("Initialize npm project")

    write_file("package.json", """{
  "name": "disk-cleaner",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.5.1",
    "typescript": "~5.8.3",
    "vite": "^7.2.6"
  }
}
""")
    commit("Add React dependencies")

    write_file("tsconfig.json", """{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
""")
    commit("Add TypeScript configuration")

    copy_file("tsconfig.json")
    commit("Update TypeScript config with paths")

    copy_file("tsconfig.node.json")
    commit("Add node TypeScript config")

    write_file("vite.config.ts", """import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
})
""")
    commit("Add Vite config")

    copy_file("vite.config.ts")
    commit("Configure Vite with path aliases")

    write_file("index.html", """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Disk Cleaner</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""")
    commit("Add HTML entry point")

    write_file("src/main.tsx", """import React from "react"
import ReactDOM from "react-dom/client"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div>Hello World</div>
  </React.StrictMode>
)
""")
    commit("Add React entry point")

    write_file("src/App.tsx", """function App() {
  return <div>Disk Cleaner</div>
}

export default App
""")
    commit("Add App component")

    write_file("src/main.tsx", """import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
""")
    commit("Import App in main")

    copy_file("src/vite-env.d.ts")
    commit("Add Vite type declarations")

    # ========================================
    # Phase 2: Tauri Setup (16-30)
    # ========================================

    write_file("src-tauri/Cargo.toml", """[package]
name = "disk-cleaner"
version = "0.0.1"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[build-dependencies]
tauri-build = { version = "2", features = [] }
""")
    commit("Initialize Tauri Cargo project")

    write_file("src-tauri/build.rs", """fn main() {
    tauri_build::build()
}
""")
    commit("Add Tauri build script")

    write_file("src-tauri/src/main.rs", """#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    disk_cleaner_lib::run()
}
""")
    commit("Add Tauri main.rs")

    write_file("src-tauri/src/lib.rs", """pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error running app");
}
""")
    commit("Add Tauri lib.rs with builder")

    write_file("src-tauri/tauri.conf.json", """{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "disk-cleaner",
  "version": "0.0.1",
  "identifier": "com.diskcleaner.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{ "title": "Disk Cleaner", "width": 1200, "height": 800 }]
  }
}
""")
    commit("Add Tauri configuration")

    write_file("src-tauri/capabilities/default.json", """{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": []
}
""")
    commit("Add Tauri capabilities")

    # Update package.json with tauri script
    write_file("package.json", """{
  "name": "disk-cleaner",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@tauri-apps/api": "^2"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@vitejs/plugin-react": "^4.5.1",
    "typescript": "~5.8.3",
    "vite": "^7.2.6"
  }
}
""")
    commit("Add Tauri npm dependencies")

    write_file("src-tauri/.gitignore", "target/\n")
    commit("Add Tauri gitignore")

    copy_file(".vscode/extensions.json")
    commit("Add VS Code extensions")

    # ========================================
    # Phase 3: Basic Styling (31-45)
    # ========================================

    write_file("src/index.css", """* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif;
  background: #1a1a2e;
  color: #fff;
}
""")
    commit("Add basic global styles")

    write_file("src/App.css", """.app {
  min-height: 100vh;
  display: flex;
}
""")
    commit("Add App container styles")

    write_file("src/main.tsx", """import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
""")
    commit("Import global CSS")

    copy_file("components.json")
    commit("Add shadcn configuration")

    write_file("src/lib/utils.ts", """import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
""")
    commit("Add cn utility function")

    # Add Tailwind and all dependencies
    copy_file("package.json")
    commit("Add Tailwind and UI dependencies")

    copy_file("src/index.css")
    commit("Configure Tailwind CSS")

    # Add UI components
    copy_file("src/components/ui/button.tsx")
    commit("Add Button component")

    copy_file("src/components/ui/checkbox.tsx")
    commit("Add Checkbox component")

    copy_file("src/components/ui/separator.tsx")
    commit("Add Separator component")

    copy_file("src/components/ui/scroll-area.tsx")
    commit("Add ScrollArea component")

    copy_file("src/components/ui/tooltip.tsx")
    commit("Add Tooltip component")

    copy_file("src/components/ui/skeleton.tsx")
    commit("Add Skeleton component")

    copy_file("src/components/ui/input.tsx")
    commit("Add Input component")

    copy_file("src/components/ui/badge.tsx")
    commit("Add Badge component")

    copy_file("src/components/ui/progress.tsx")
    commit("Add Progress component")

    # ========================================
    # Phase 4: Sidebar & Sheet Components (46-60)
    # ========================================

    copy_file("src/components/ui/sheet.tsx")
    commit("Add Sheet component")

    copy_file("src/hooks/use-mobile.ts")
    commit("Add mobile detection hook")

    copy_file("src/components/ui/sidebar.tsx")
    commit("Add Sidebar component")

    copy_file("src/components/ui/popover.tsx")
    commit("Add Popover component")

    copy_file("src/components/ui/alert-dialog.tsx")
    commit("Add AlertDialog component")

    # ========================================
    # Phase 5: Rust Scanner Foundation (61-90)
    # ========================================

    write_file("src-tauri/src/scanner.rs", """use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub item_type: String,
}

pub struct Scanner;

impl Scanner {
    pub fn new() -> Self {
        Self
    }
}
""")
    commit("Add Scanner struct skeleton")

    write_file("src-tauri/src/lib.rs", """mod scanner;

pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error running app");
}
""")
    commit("Import scanner module")

    write_file("src-tauri/Cargo.toml", """[package]
name = "disk-cleaner"
version = "0.0.1"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
dirs = "5"

[build-dependencies]
tauri-build = { version = "2", features = [] }
""")
    commit("Add dirs crate dependency")

    write_file("src-tauri/src/scanner.rs", """use serde::{Deserialize, Serialize};
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
}
""")
    commit("Add home directory to Scanner")

    write_file("src-tauri/src/scanner.rs", """use serde::{Deserialize, Serialize};
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
}
""")
    commit("Add directory size calculation")

    write_file("src-tauri/src/scanner.rs", """use serde::{Deserialize, Serialize};
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
}
""")
    commit("Implement cache scanning")

    write_file("src-tauri/src/commands.rs", """use crate::scanner::{Scanner, ScannedItem};
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
""")
    commit("Add scan_category command")

    write_file("src-tauri/src/lib.rs", """mod commands;
mod scanner;

use commands::scan_category;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![scan_category])
        .run(tauri::generate_context!())
        .expect("error running app");
}
""")
    commit("Register scan command handler")

    # Add dev artifacts scanning
    write_file("src-tauri/src/scanner.rs", """use serde::{Deserialize, Serialize};
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
""")
    commit("Add dev artifacts scanning")

    write_file("src-tauri/src/commands.rs", """use crate::scanner::{Scanner, ScannedItem};
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
        "dev-artifacts" => scanner.scan_dev_artifacts(),
        _ => return Err(format!("Unknown category: {}", category)),
    };

    let total_size: u64 = items.iter().map(|i| i.size).sum();
    let item_count = items.len();

    Ok(ScanResult { items, total_size, item_count })
}
""")
    commit("Register dev-artifacts scanner")

    # Add large files scanning - progressively build up scanner.rs
    # Now copy the full scanner
    copy_file("src-tauri/src/scanner.rs")
    commit("Add large files and additional scanners")

    copy_file("src-tauri/src/commands.rs")
    commit("Register all scan categories")

    # ========================================
    # Phase 6: Frontend Types & API (91-105)
    # ========================================

    write_file("src/types/index.ts", """export type CategoryId = "caches" | "dev-artifacts"

export interface ScannedItem {
  id: string
  name: string
  path: string
  size: number
  item_type: string
}
""")
    commit("Add frontend TypeScript types")

    copy_file("src/types/index.ts")
    commit("Add all category types")

    write_file("src/lib/tauri.ts", """import { invoke } from "@tauri-apps/api/core"

export async function scanCategory(category: string) {
  return invoke("scan_category", { category })
}
""")
    commit("Add Tauri invoke wrapper")

    write_file("src/lib/format.ts", """export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}
""")
    commit("Add byte formatting utility")

    copy_file("src/lib/format.ts")
    commit("Add date formatting utility")

    copy_file("src/lib/tauri.ts")
    commit("Add all Tauri API functions")

    # ========================================
    # Phase 7: App Sidebar (106-120)
    # ========================================

    write_file("src/components/app-sidebar.tsx", """import { HardDrive, FolderCode } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const categories = [
  { id: "caches", title: "Caches", icon: HardDrive },
  { id: "dev-artifacts", title: "Dev Artifacts", icon: FolderCode },
]

interface AppSidebarProps {
  selectedCategory: string
  onSelectCategory: (id: string) => void
}

export function AppSidebar({ selectedCategory, onSelectCategory }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((cat) => (
                <SidebarMenuItem key={cat.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectCategory(cat.id)}
                    isActive={selectedCategory === cat.id}
                  >
                    <cat.icon className="h-4 w-4" />
                    <span>{cat.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
""")
    commit("Add basic sidebar component")

    write_file("src/App.tsx", """import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

function App() {
  const [category, setCategory] = useState("caches")

  return (
    <SidebarProvider>
      <AppSidebar selectedCategory={category} onSelectCategory={setCategory} />
      <main className="flex-1 p-6">
        <h1>Selected: {category}</h1>
      </main>
    </SidebarProvider>
  )
}

export default App
""")
    commit("Integrate sidebar with App")

    copy_file("src/components/app-sidebar.tsx")
    commit("Add all categories to sidebar")

    # ========================================
    # Phase 8: File List Components (121-140)
    # ========================================

    write_file("src/components/file-list.tsx", """import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatBytes } from "@/lib/format"
import type { ScannedItem } from "@/types"

interface FileListProps {
  items: ScannedItem[]
  selectedIds: Set<string>
  onToggleItem: (id: string) => void
}

export function FileList({ items, selectedIds, onToggleItem }: FileListProps) {
  return (
    <ScrollArea className="h-full">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 p-3 border-b">
          <Checkbox
            checked={selectedIds.has(item.id)}
            onCheckedChange={() => onToggleItem(item.id)}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground truncate">{item.path}</p>
          </div>
          <span className="font-mono text-sm">{formatBytes(item.size)}</span>
        </div>
      ))}
    </ScrollArea>
  )
}
""")
    commit("Add basic file list component")

    copy_file("src/components/file-group.tsx")
    commit("Add file grouping component")

    copy_file("src/components/file-list.tsx")
    commit("Add grouping support to file list")

    write_file("src/components/category-view.tsx", """import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileList } from "./file-list"
import { scanCategory } from "@/lib/tauri"
import type { ScannedItem } from "@/types"

interface CategoryViewProps {
  category: string
}

export function CategoryView({ category }: CategoryViewProps) {
  const [items, setItems] = useState<ScannedItem[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const result = await scanCategory(category)
      setItems(result.items)
    } finally {
      setIsScanning(false)
    }
  }

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (items.length === 0 && !isScanning) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Button onClick={handleScan}>Scan</Button>
      </div>
    )
  }

  if (isScanning) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <FileList items={items} selectedIds={selectedIds} onToggleItem={handleToggle} />
  )
}
""")
    commit("Add category view component")

    write_file("src/App.tsx", """import { useState } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CategoryView } from "@/components/category-view"

function App() {
  const [category, setCategory] = useState("caches")

  return (
    <SidebarProvider>
      <AppSidebar selectedCategory={category} onSelectCategory={setCategory} />
      <main className="flex flex-1 flex-col">
        <div className="flex items-center gap-4 p-4 border-b">
          <SidebarTrigger />
          <h1 className="font-semibold capitalize">{category}</h1>
        </div>
        <div className="flex-1">
          <CategoryView category={category} />
        </div>
      </main>
    </SidebarProvider>
  )
}

export default App
""")
    commit("Wire category view into App")

    copy_file("src/components/error-banner.tsx")
    commit("Add error banner component")

    # ========================================
    # Phase 9: Trash Management (141-165)
    # ========================================

    write_file("src-tauri/src/trash.rs", """use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashItem {
    pub id: String,
    pub name: String,
    pub original_path: String,
    pub size: u64,
    pub deleted_at: String,
}

pub struct TrashManager {
    trash_dir: PathBuf,
}

impl TrashManager {
    pub fn new() -> Self {
        let trash_dir = dirs::data_local_dir()
            .unwrap_or_default()
            .join("disk-cleaner")
            .join("trash");
        std::fs::create_dir_all(&trash_dir).ok();
        Self { trash_dir }
    }

    pub fn list_items(&self) -> Vec<TrashItem> {
        Vec::new()
    }
}
""")
    commit("Add trash manager skeleton")

    copy_file("src-tauri/src/trash.rs")
    commit("Implement full trash management")

    copy_file("src-tauri/Cargo.toml")
    commit("Add trash management dependencies")

    write_file("src-tauri/src/lib.rs", """mod commands;
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
""")
    commit("Register trash commands")

    copy_file("src-tauri/src/commands.rs")
    commit("Add delete and trash commands")

    copy_file("src-tauri/src/lib.rs")
    commit("Finalize command registration")

    copy_file("src/hooks/use-trash.ts")
    commit("Add useTrash hook")

    write_file("src/components/trash-view.tsx", """import { useState, useEffect } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTrash } from "@/hooks/use-trash"

interface TrashViewProps {
  onStatsUpdate: (stats: { itemCount: number; totalSize: number } | null) => void
}

export function TrashView({ onStatsUpdate }: TrashViewProps) {
  const { items, isLoading, load } = useTrash()

  useEffect(() => { load() }, [load])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Trash2 className="h-12 w-12 text-muted-foreground" />
        <p>Trash is empty</p>
      </div>
    )
  }

  return <div>Trash items: {items.length}</div>
}
""")
    commit("Add basic trash view")

    copy_file("src/components/trash-view.tsx")
    commit("Implement full trash view with restore/delete")

    # ========================================
    # Phase 10: Category View Delete (166-180)
    # ========================================

    copy_file("src/components/category-view.tsx")
    commit("Add delete functionality to category view")

    copy_file("src/hooks/use-scanner.ts")
    commit("Add useScanner hook")

    # ========================================
    # Phase 11: Stats & Polish (181-195)
    # ========================================

    copy_file("src/components/app-sidebar.tsx")
    commit("Add stats display to sidebar")

    copy_file("src/App.tsx")
    commit("Add stats tracking and persistence")

    copy_file("src/App.css")
    commit("Update App styles")

    copy_file("index.html")
    commit("Update page title")

    # ========================================
    # Phase 12: Theme System (196-210)
    # ========================================

    write_file("src/hooks/use-theme.tsx", """import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type ThemeId = "midnight" | "sunset" | "forest"

const ThemeContext = createContext<{ theme: ThemeId; setTheme: (t: ThemeId) => void } | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>("midnight")

  useEffect(() => {
    document.documentElement.classList.add(`theme-${theme}`)
    return () => document.documentElement.classList.remove(`theme-${theme}`)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
""")
    commit("Add basic theme system")

    copy_file("src/hooks/use-theme.tsx")
    commit("Add all theme options")

    write_file("src/components/settings-popover.tsx", """import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTheme } from "@/hooks/use-theme"

export function SettingsPopover() {
  const { theme, setTheme } = useTheme()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          <h4 className="font-medium">Theme</h4>
          <p className="text-sm text-muted-foreground">Current: {theme}</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
""")
    commit("Add settings popover skeleton")

    copy_file("src/components/settings-popover.tsx")
    commit("Implement theme picker in settings")

    # ========================================
    # Phase 13: Tests (211-220)
    # ========================================

    copy_file("src/test/setup.ts")
    commit("Add test setup")

    copy_file("src/components/category-view.test.tsx")
    commit("Add category view tests")

    copy_file("src/components/trash-view.test.tsx")
    commit("Add trash view tests")

    # ========================================
    # Phase 14: Final Config Files (221-235)
    # ========================================

    copy_file("src-tauri/tauri.conf.json")
    commit("Update Tauri configuration")

    copy_file("src-tauri/capabilities/default.json")
    commit("Update capabilities")

    copy_file("src-tauri/src/config.rs")
    commit("Add config module")

    copy_file("src-tauri/src/categorizer.rs")
    commit("Add categorizer module")

    copy_file("src-tauri/src/main.rs")
    commit("Update main entry")

    copy_file("README.md")
    commit("Update README")

    copy_file("public/tauri.svg")
    commit("Add Tauri icon")

    copy_file("public/vite.svg")
    commit("Add Vite icon")

    copy_file("src/assets/react.svg")
    commit("Add React icon")

    # Copy all icons
    icon_dir = SOURCE_DIR / "src-tauri/icons"
    if icon_dir.exists():
        for icon in icon_dir.iterdir():
            copy_file(f"src-tauri/icons/{icon.name}")
    commit("Add application icons")

    copy_file(".gitignore")
    commit("Update gitignore")

    # Gen schemas
    for schema in ["capabilities.json", "acl-manifests.json", "macOS-schema.json", "desktop-schema.json"]:
        schema_path = f"src-tauri/gen/schemas/{schema}"
        if (SOURCE_DIR / schema_path).exists():
            copy_file(schema_path)
    commit("Add generated schemas")

    copy_file("package-lock.json")
    commit("Add package-lock.json")

    copy_file("src-tauri/Cargo.lock")
    commit("Add Cargo.lock")

    # Final polish
    copy_file("src/index.css")
    commit("Finalize styles")

    print("=" * 50)
    print(f"Created {commit_count} commits")
    print("Done!")

if __name__ == "__main__":
    build_history()
