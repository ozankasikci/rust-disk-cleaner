# DiskClean Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Tauri desktop app that scans for unnecessary files (caches, dev artifacts, large files) and provides safe deletion with app-managed trash.

**Architecture:** Rust backend handles file scanning, categorization, and trash management via Tauri IPC. React frontend with shadcn/ui displays results in sidebar navigation layout with grouped file lists.

**Tech Stack:** Rust, Tauri v2, React, TypeScript, Vite, shadcn/ui, Tailwind CSS, walkdir, rayon, glob

---

## Phase 1: Project Setup

### Task 1.1: Initialize Tauri Project

**Files:**
- Create: Project structure via `create-tauri-app`

**Step 1: Create Tauri project with React TypeScript**

```bash
cd /Users/ozan/Projects/ai-disk-clean
npm create tauri-app@latest . -- --template react-ts --manager npm
```

When prompted:
- Project name: `ai-disk-clean` (or accept default since we're in the directory)
- Package manager: `npm`
- UI template: `React`
- UI flavor: `TypeScript`

**Step 2: Verify project structure exists**

```bash
ls -la src-tauri/src/
```

Expected: `main.rs` and `lib.rs` files exist

**Step 3: Install dependencies and verify it builds**

```bash
npm install
npm run tauri dev
```

Expected: App window opens with default Tauri React template

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: initialize Tauri project with React TypeScript"
```

---

### Task 1.2: Configure shadcn/ui and Tailwind

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Modify: `src/index.css`
- Create: `components.json`

**Step 1: Install Tailwind CSS and Vite plugin**

```bash
npm install tailwindcss @tailwindcss/vite
npm install -D @types/node
```

**Step 2: Update vite.config.ts**

Replace contents of `vite.config.ts`:

```typescript
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}))
```

**Step 3: Update tsconfig.json with path aliases**

Add to `tsconfig.json` compilerOptions:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 4: Update tsconfig.app.json with path aliases**

Add to `tsconfig.app.json` compilerOptions:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 5: Replace src/index.css with Tailwind import**

```css
@import "tailwindcss";
```

**Step 6: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

**Step 7: Add required shadcn components**

```bash
npx shadcn@latest add button checkbox scroll-area sidebar separator badge progress
```

**Step 8: Verify build works**

```bash
npm run tauri dev
```

Expected: App opens without errors

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: configure shadcn/ui and Tailwind CSS"
```

---

### Task 1.3: Create App Shell with Sidebar Layout

**Files:**
- Create: `src/components/app-sidebar.tsx`
- Create: `src/components/category-view.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Step 1: Create AppSidebar component**

Create `src/components/app-sidebar.tsx`:

```tsx
import { HardDrive, FolderCode, FileBox, Trash2 } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"

export type CategoryId = "caches" | "dev-artifacts" | "large-files" | "trash"

interface AppSidebarProps {
  selectedCategory: CategoryId
  onSelectCategory: (category: CategoryId) => void
}

const categories = [
  {
    id: "caches" as const,
    title: "Caches",
    icon: HardDrive,
  },
  {
    id: "dev-artifacts" as const,
    title: "Dev Artifacts",
    icon: FolderCode,
  },
  {
    id: "large-files" as const,
    title: "Large Files",
    icon: FileBox,
  },
]

export function AppSidebar({ selectedCategory, onSelectCategory }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">DiskClean</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((category) => (
                <SidebarMenuItem key={category.id}>
                  <SidebarMenuButton
                    isActive={selectedCategory === category.id}
                    onClick={() => onSelectCategory(category.id)}
                  >
                    <category.icon className="h-4 w-4" />
                    <span>{category.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={selectedCategory === "trash"}
              onClick={() => onSelectCategory("trash")}
            >
              <Trash2 className="h-4 w-4" />
              <span>Trash</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
```

**Step 2: Create CategoryView placeholder component**

Create `src/components/category-view.tsx`:

```tsx
import { Button } from "@/components/ui/button"
import type { CategoryId } from "./app-sidebar"

interface CategoryViewProps {
  category: CategoryId
}

const categoryInfo: Record<CategoryId, { title: string; description: string }> = {
  caches: {
    title: "Caches",
    description: "System and application caches that can be safely removed.",
  },
  "dev-artifacts": {
    title: "Dev Artifacts",
    description: "Build outputs and dependency folders from development projects.",
  },
  "large-files": {
    title: "Large Files",
    description: "Files larger than 100MB that might be candidates for removal.",
  },
  trash: {
    title: "Trash",
    description: "Items moved to DiskClean trash. Restore or permanently delete.",
  },
}

export function CategoryView({ category }: CategoryViewProps) {
  const info = categoryInfo[category]

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h2 className="text-2xl font-semibold">{info.title}</h2>
        <p className="text-sm text-muted-foreground">{info.description}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No items scanned yet.</p>
        <Button>Scan {info.title}</Button>
      </div>
    </div>
  )
}
```

**Step 3: Update App.tsx with sidebar layout**

Replace `src/App.tsx`:

```tsx
import { useState } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar, CategoryId } from "@/components/app-sidebar"
import { CategoryView } from "@/components/category-view"

function App() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("caches")

  return (
    <SidebarProvider>
      <AppSidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      <main className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
        </div>
        <div className="flex-1">
          <CategoryView category={selectedCategory} />
        </div>
      </main>
    </SidebarProvider>
  )
}

export default App
```

**Step 4: Ensure main.tsx has proper imports**

Verify `src/main.tsx` imports styles:

```tsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Step 5: Install lucide-react icons**

```bash
npm install lucide-react
```

**Step 6: Run and verify layout**

```bash
npm run tauri dev
```

Expected: App shows sidebar with categories, main content area with placeholder

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: create app shell with sidebar navigation"
```

---

### Task 1.4: Set Up Rust Backend Structure

**Files:**
- Create: `src-tauri/src/commands.rs`
- Create: `src-tauri/src/scanner.rs`
- Create: `src-tauri/src/categorizer.rs`
- Create: `src-tauri/src/trash.rs`
- Create: `src-tauri/src/config.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add Rust dependencies to Cargo.toml**

Add to `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
walkdir = "2"
rayon = "1.10"
glob = "0.3"
serde_json = "1"
dirs = "5"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
```

**Step 2: Create scanner.rs module**

Create `src-tauri/src/scanner.rs`:

```rust
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedItem {
    pub id: String,
    pub path: PathBuf,
    pub size: u64,
    pub name: String,
    pub category: String,
    pub subcategory: String,
}

pub struct Scanner {
    // Will be implemented in Phase 2
}

impl Scanner {
    pub fn new() -> Self {
        Self {}
    }
}
```

**Step 3: Create categorizer.rs module**

Create `src-tauri/src/categorizer.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryConfig {
    pub name: String,
    pub paths: Vec<String>,
    pub patterns: Vec<String>,
}

pub struct Categorizer {
    // Will be implemented in Phase 2
}

impl Categorizer {
    pub fn new() -> Self {
        Self {}
    }
}
```

**Step 4: Create trash.rs module**

Create `src-tauri/src/trash.rs`:

```rust
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashItem {
    pub id: String,
    pub original_path: PathBuf,
    pub trash_path: PathBuf,
    pub size: u64,
    pub name: String,
    pub deleted_at: DateTime<Utc>,
}

pub struct TrashManager {
    trash_dir: PathBuf,
}

impl TrashManager {
    pub fn new() -> Result<Self, String> {
        let trash_dir = dirs::home_dir()
            .ok_or("Could not find home directory")?
            .join(".diskclean-trash");

        Ok(Self { trash_dir })
    }

    pub fn trash_dir(&self) -> &PathBuf {
        &self.trash_dir
    }
}
```

**Step 5: Create config.rs module**

Create `src-tauri/src/config.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformConfig {
    pub caches: HashMap<String, String>,
    pub dev_artifacts: Vec<String>,
}

impl Default for PlatformConfig {
    fn default() -> Self {
        let mut caches = HashMap::new();

        // macOS cache locations
        caches.insert("npm".to_string(), "~/.npm/_cacache".to_string());
        caches.insert("yarn".to_string(), "~/.yarn/cache".to_string());
        caches.insert("pnpm".to_string(), "~/.pnpm-store".to_string());
        caches.insert("homebrew".to_string(), "~/Library/Caches/Homebrew".to_string());
        caches.insert("pip".to_string(), "~/Library/Caches/pip".to_string());
        caches.insert("xcode".to_string(), "~/Library/Developer/Xcode/DerivedData".to_string());

        Self {
            caches,
            dev_artifacts: vec![
                "node_modules".to_string(),
                "target".to_string(),
                "build".to_string(),
                "dist".to_string(),
                ".gradle".to_string(),
                "Pods".to_string(),
                "venv".to_string(),
                ".venv".to_string(),
                "__pycache__".to_string(),
            ],
        }
    }
}
```

**Step 6: Create commands.rs module**

Create `src-tauri/src/commands.rs`:

```rust
use crate::scanner::ScannedItem;
use crate::trash::TrashItem;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub items: Vec<ScannedItem>,
    pub total_size: u64,
}

#[tauri::command]
pub async fn scan_category(category: String) -> Result<ScanResult, String> {
    // Placeholder - will be implemented in Phase 2
    Ok(ScanResult {
        items: vec![],
        total_size: 0,
    })
}

#[tauri::command]
pub async fn delete_items(paths: Vec<String>) -> Result<u32, String> {
    // Placeholder - will be implemented in Phase 4
    Ok(0)
}

#[tauri::command]
pub async fn list_trash() -> Result<Vec<TrashItem>, String> {
    // Placeholder - will be implemented in Phase 4
    Ok(vec![])
}

#[tauri::command]
pub async fn restore_items(ids: Vec<String>) -> Result<u32, String> {
    // Placeholder - will be implemented in Phase 4
    Ok(0)
}

#[tauri::command]
pub async fn purge_trash() -> Result<u32, String> {
    // Placeholder - will be implemented in Phase 4
    Ok(0)
}
```

**Step 7: Update lib.rs to register modules and commands**

Replace `src-tauri/src/lib.rs`:

```rust
mod commands;
mod config;
mod scanner;
mod categorizer;
mod trash;

use commands::{scan_category, delete_items, list_trash, restore_items, purge_trash};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_category,
            delete_items,
            list_trash,
            restore_items,
            purge_trash
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 8: Build and verify Rust compiles**

```bash
npm run tauri dev
```

Expected: App builds and runs without Rust compilation errors

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: set up Rust backend module structure"
```

---

## Phase 2: Scanner Core

### Task 2.1: Implement Cache Scanner

**Files:**
- Modify: `src-tauri/src/scanner.rs`
- Modify: `src-tauri/src/commands.rs`

**Step 1: Implement cache scanning in scanner.rs**

Replace `src-tauri/src/scanner.rs`:

```rust
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

        cache_locations
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
            .collect()
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
}
```

**Step 2: Update commands.rs to use scanner**

Replace `src-tauri/src/commands.rs`:

```rust
use crate::scanner::{Scanner, ScannedItem};
use crate::trash::TrashItem;
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
        "large-files" => scanner.scan_large_files(100), // 100MB threshold
        _ => return Err(format!("Unknown category: {}", category)),
    };

    let total_size: u64 = items.iter().map(|i| i.size).sum();
    let item_count = items.len();

    Ok(ScanResult {
        items,
        total_size,
        item_count,
    })
}

#[tauri::command]
pub async fn delete_items(paths: Vec<String>) -> Result<u32, String> {
    // Placeholder - will be implemented in Phase 4
    Ok(0)
}

#[tauri::command]
pub async fn list_trash() -> Result<Vec<TrashItem>, String> {
    // Placeholder - will be implemented in Phase 4
    Ok(vec![])
}

#[tauri::command]
pub async fn restore_items(ids: Vec<String>) -> Result<u32, String> {
    // Placeholder - will be implemented in Phase 4
    Ok(0)
}

#[tauri::command]
pub async fn purge_trash() -> Result<u32, String> {
    // Placeholder - will be implemented in Phase 4
    Ok(0)
}
```

**Step 3: Build and verify scanner compiles**

```bash
npm run tauri dev
```

Expected: App builds without errors

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement cache, dev artifacts, and large files scanner"
```

---

## Phase 3: UI - Category Views

### Task 3.1: Create TypeScript Types and Tauri Helpers

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/tauri.ts`
- Create: `src/lib/format.ts`

**Step 1: Create TypeScript types**

Create `src/types/index.ts`:

```typescript
export interface ScannedItem {
  id: string
  path: string
  size: number
  name: string
  category: string
  subcategory: string
}

export interface ScanResult {
  items: ScannedItem[]
  total_size: number
  item_count: number
}

export interface TrashItem {
  id: string
  original_path: string
  trash_path: string
  size: number
  name: string
  deleted_at: string
}

export type CategoryId = "caches" | "dev-artifacts" | "large-files" | "trash"
```

**Step 2: Create Tauri invoke helpers**

Create `src/lib/tauri.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core"
import type { ScanResult, TrashItem } from "@/types"

export async function scanCategory(category: string): Promise<ScanResult> {
  return invoke<ScanResult>("scan_category", { category })
}

export async function deleteItems(paths: string[]): Promise<number> {
  return invoke<number>("delete_items", { paths })
}

export async function listTrash(): Promise<TrashItem[]> {
  return invoke<TrashItem[]>("list_trash")
}

export async function restoreItems(ids: string[]): Promise<number> {
  return invoke<number>("restore_items", { ids })
}

export async function purgeTrash(): Promise<number> {
  return invoke<number>("purge_trash")
}
```

**Step 3: Create formatting utilities**

Create `src/lib/format.ts`:

```typescript
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const k = 1000
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
```

**Step 4: Create src/lib directory if needed and verify**

```bash
mkdir -p src/lib src/types
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add TypeScript types and Tauri helpers"
```

---

### Task 3.2: Create File List Components

**Files:**
- Create: `src/components/file-group.tsx`
- Create: `src/components/file-list.tsx`

**Step 1: Create FileGroup component**

Create `src/components/file-group.tsx`:

```tsx
import { useState } from "react"
import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { formatBytes } from "@/lib/format"
import type { ScannedItem } from "@/types"

interface FileGroupProps {
  subcategory: string
  items: ScannedItem[]
  selectedIds: Set<string>
  onToggleItem: (id: string) => void
  onToggleAll: (ids: string[]) => void
  onOpenInFinder: (path: string) => void
}

export function FileGroup({
  subcategory,
  items,
  selectedIds,
  onToggleItem,
  onToggleAll,
  onOpenInFinder,
}: FileGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const totalSize = items.reduce((sum, item) => sum + item.size, 0)
  const allSelected = items.every((item) => selectedIds.has(item.id))
  const someSelected = items.some((item) => selectedIds.has(item.id))

  const handleToggleAll = () => {
    onToggleAll(items.map((item) => item.id))
  }

  return (
    <div className="border-b last:border-b-0">
      <div
        className="flex cursor-pointer items-center gap-2 px-4 py-3 hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onClick={(e) => {
            e.stopPropagation()
            handleToggleAll()
          }}
        />
        <span className="flex-1 font-medium">{subcategory}</span>
        <span className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
        <span className="text-sm font-medium">{formatBytes(totalSize)}</span>
      </div>

      {isExpanded && (
        <div className="bg-muted/20">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 border-t px-4 py-2 pl-10"
            >
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={() => onToggleItem(item.id)}
              />
              <span className="flex-1 truncate text-sm" title={item.path}>
                {item.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatBytes(item.size)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenInFinder(item.path)}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create FileList component**

Create `src/components/file-list.tsx`:

```tsx
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileGroup } from "./file-group"
import type { ScannedItem } from "@/types"

interface FileListProps {
  items: ScannedItem[]
  selectedIds: Set<string>
  onToggleItem: (id: string) => void
  onToggleAll: (ids: string[]) => void
  onOpenInFinder: (path: string) => void
}

export function FileList({
  items,
  selectedIds,
  onToggleItem,
  onToggleAll,
  onOpenInFinder,
}: FileListProps) {
  // Group items by subcategory
  const groups = items.reduce<Record<string, ScannedItem[]>>((acc, item) => {
    const key = item.subcategory
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {})

  // Sort groups by total size
  const sortedGroups = Object.entries(groups).sort((a, b) => {
    const sizeA = a[1].reduce((sum, item) => sum + item.size, 0)
    const sizeB = b[1].reduce((sum, item) => sum + item.size, 0)
    return sizeB - sizeA
  })

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y">
        {sortedGroups.map(([subcategory, groupItems]) => (
          <FileGroup
            key={subcategory}
            subcategory={subcategory}
            items={groupItems}
            selectedIds={selectedIds}
            onToggleItem={onToggleItem}
            onToggleAll={onToggleAll}
            onOpenInFinder={onOpenInFinder}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: create FileGroup and FileList components"
```

---

### Task 3.3: Implement Category View with Scanning

**Files:**
- Modify: `src/components/category-view.tsx`
- Create: `src/hooks/use-scanner.ts`

**Step 1: Create useScanner hook**

Create `src/hooks/use-scanner.ts`:

```typescript
import { useState, useCallback } from "react"
import { scanCategory } from "@/lib/tauri"
import type { ScannedItem, ScanResult } from "@/types"

interface UseScannerResult {
  items: ScannedItem[]
  totalSize: number
  isScanning: boolean
  error: string | null
  scan: () => Promise<void>
  reset: () => void
}

export function useScanner(category: string): UseScannerResult {
  const [items, setItems] = useState<ScannedItem[]>([])
  const [totalSize, setTotalSize] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scan = useCallback(async () => {
    setIsScanning(true)
    setError(null)

    try {
      const result: ScanResult = await scanCategory(category)
      setItems(result.items)
      setTotalSize(result.total_size)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsScanning(false)
    }
  }, [category])

  const reset = useCallback(() => {
    setItems([])
    setTotalSize(0)
    setError(null)
  }, [])

  return {
    items,
    totalSize,
    isScanning,
    error,
    scan,
    reset,
  }
}
```

**Step 2: Update CategoryView component**

Replace `src/components/category-view.tsx`:

```tsx
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileList } from "./file-list"
import { useScanner } from "@/hooks/use-scanner"
import { formatBytes } from "@/lib/format"
import type { CategoryId } from "@/types"

interface CategoryViewProps {
  category: CategoryId
}

const categoryInfo: Record<CategoryId, { title: string; description: string }> = {
  caches: {
    title: "Caches",
    description: "System and application caches that can be safely removed.",
  },
  "dev-artifacts": {
    title: "Dev Artifacts",
    description: "Build outputs and dependency folders from development projects.",
  },
  "large-files": {
    title: "Large Files",
    description: "Files larger than 100MB that might be candidates for removal.",
  },
  trash: {
    title: "Trash",
    description: "Items moved to DiskClean trash. Restore or permanently delete.",
  },
}

export function CategoryView({ category }: CategoryViewProps) {
  const info = categoryInfo[category]
  const { items, totalSize, isScanning, error, scan, reset } = useScanner(category)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Reset selection when category changes
  useEffect(() => {
    setSelectedIds(new Set())
    reset()
  }, [category, reset])

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggleAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((id) => next.has(id))
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }

  const handleOpenInFinder = async (path: string) => {
    const { open } = await import("@tauri-apps/plugin-opener")
    // Open parent directory
    const parentPath = path.split("/").slice(0, -1).join("/")
    await open(parentPath)
  }

  const selectedSize = items
    .filter((item) => selectedIds.has(item.id))
    .reduce((sum, item) => sum + item.size, 0)

  // Trash view is different - will be implemented in Phase 4
  if (category === "trash") {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-6 py-4">
          <h2 className="text-2xl font-semibold">{info.title}</h2>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Trash view coming soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{info.title}</h2>
            <p className="text-sm text-muted-foreground">{info.description}</p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {items.length} items · {formatBytes(totalSize)}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 px-6 py-3 text-destructive">
          Error: {error}
        </div>
      )}

      {items.length === 0 && !isScanning ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">No items scanned yet.</p>
          <Button onClick={scan} disabled={isScanning}>
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              `Scan ${info.title}`
            )}
          </Button>
        </div>
      ) : isScanning ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Scanning for {info.title.toLowerCase()}...</p>
        </div>
      ) : (
        <>
          <FileList
            items={items}
            selectedIds={selectedIds}
            onToggleItem={handleToggleItem}
            onToggleAll={handleToggleAll}
            onOpenInFinder={handleOpenInFinder}
          />

          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedIds.size === items.length ? "Deselect All" : "Select All"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected · {formatBytes(selectedSize)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={scan}>
                Rescan
              </Button>
              <Button
                variant="destructive"
                disabled={selectedIds.size === 0}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

**Step 3: Install Tauri opener plugin**

```bash
npm install @tauri-apps/plugin-opener
```

**Step 4: Enable opener plugin in Tauri capabilities**

Add to `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default"
  ]
}
```

**Step 5: Build and test**

```bash
npm run tauri dev
```

Expected: App shows categories, clicking "Scan" triggers backend scan, results display in grouped list

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement category view with scanning and file selection"
```

---

### Task 3.4: Update Sidebar with Scan Stats

**Files:**
- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/App.tsx`

**Step 1: Update AppSidebar to show stats**

Replace `src/components/app-sidebar.tsx`:

```tsx
import { HardDrive, FolderCode, FileBox, Trash2 } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { formatBytes } from "@/lib/format"
import type { CategoryId } from "@/types"

interface CategoryStats {
  itemCount: number
  totalSize: number
}

interface AppSidebarProps {
  selectedCategory: CategoryId
  onSelectCategory: (category: CategoryId) => void
  stats: Record<CategoryId, CategoryStats | null>
}

const categories = [
  {
    id: "caches" as const,
    title: "Caches",
    icon: HardDrive,
  },
  {
    id: "dev-artifacts" as const,
    title: "Dev Artifacts",
    icon: FolderCode,
  },
  {
    id: "large-files" as const,
    title: "Large Files",
    icon: FileBox,
  },
]

export function AppSidebar({ selectedCategory, onSelectCategory, stats }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">DiskClean</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((category) => {
                const stat = stats[category.id]
                return (
                  <SidebarMenuItem key={category.id}>
                    <SidebarMenuButton
                      isActive={selectedCategory === category.id}
                      onClick={() => onSelectCategory(category.id)}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <category.icon className="h-4 w-4" />
                        <span>{category.title}</span>
                      </div>
                      {stat && stat.itemCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {formatBytes(stat.totalSize)}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={selectedCategory === "trash"}
              onClick={() => onSelectCategory("trash")}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <span>Trash</span>
              </div>
              {stats.trash && stats.trash.itemCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.trash.itemCount}
                </Badge>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
```

**Step 2: Update App.tsx to manage stats**

Replace `src/App.tsx`:

```tsx
import { useState, useCallback } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CategoryView } from "@/components/category-view"
import type { CategoryId } from "@/types"

interface CategoryStats {
  itemCount: number
  totalSize: number
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("caches")
  const [stats, setStats] = useState<Record<CategoryId, CategoryStats | null>>({
    caches: null,
    "dev-artifacts": null,
    "large-files": null,
    trash: null,
  })

  const handleStatsUpdate = useCallback((category: CategoryId, newStats: CategoryStats | null) => {
    setStats((prev) => ({
      ...prev,
      [category]: newStats,
    }))
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        stats={stats}
      />
      <main className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
        </div>
        <div className="flex-1">
          <CategoryView
            category={selectedCategory}
            onStatsUpdate={handleStatsUpdate}
          />
        </div>
      </main>
    </SidebarProvider>
  )
}

export default App
```

**Step 3: Update CategoryView to report stats**

Add `onStatsUpdate` prop to CategoryView. Update `src/components/category-view.tsx`:

Add to interface:
```tsx
interface CategoryViewProps {
  category: CategoryId
  onStatsUpdate: (category: CategoryId, stats: { itemCount: number; totalSize: number } | null) => void
}
```

Add useEffect to report stats:
```tsx
// Add after the existing useEffect
useEffect(() => {
  if (items.length > 0) {
    onStatsUpdate(category, { itemCount: items.length, totalSize })
  }
}, [items, totalSize, category, onStatsUpdate])
```

**Step 4: Build and test**

```bash
npm run tauri dev
```

Expected: After scanning, sidebar shows size badge next to category

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: show scan stats in sidebar"
```

---

## Phase 4: Trash System

### Task 4.1: Implement Trash Manager in Rust

**Files:**
- Modify: `src-tauri/src/trash.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Implement full TrashManager**

Replace `src-tauri/src/trash.rs`:

```rust
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, Duration};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashItem {
    pub id: String,
    pub original_path: PathBuf,
    pub trash_path: PathBuf,
    pub size: u64,
    pub name: String,
    pub deleted_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TrashMetadata {
    items: Vec<TrashItem>,
}

pub struct TrashManager {
    trash_dir: PathBuf,
    metadata_path: PathBuf,
}

impl TrashManager {
    pub fn new() -> Result<Self, String> {
        let trash_dir = dirs::home_dir()
            .ok_or("Could not find home directory")?
            .join(".diskclean-trash");

        let metadata_path = trash_dir.join(".metadata.json");

        // Create trash directory if it doesn't exist
        if !trash_dir.exists() {
            fs::create_dir_all(&trash_dir)
                .map_err(|e| format!("Failed to create trash directory: {}", e))?;
        }

        Ok(Self { trash_dir, metadata_path })
    }

    fn load_metadata(&self) -> TrashMetadata {
        if self.metadata_path.exists() {
            fs::read_to_string(&self.metadata_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or(TrashMetadata { items: vec![] })
        } else {
            TrashMetadata { items: vec![] }
        }
    }

    fn save_metadata(&self, metadata: &TrashMetadata) -> Result<(), String> {
        let json = serde_json::to_string_pretty(metadata)
            .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
        fs::write(&self.metadata_path, json)
            .map_err(|e| format!("Failed to write metadata: {}", e))?;
        Ok(())
    }

    fn get_size(path: &PathBuf) -> u64 {
        if path.is_file() {
            fs::metadata(path).map(|m| m.len()).unwrap_or(0)
        } else {
            walkdir::WalkDir::new(path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file())
                .filter_map(|e| e.metadata().ok())
                .map(|m| m.len())
                .sum()
        }
    }

    pub fn move_to_trash(&self, path: PathBuf) -> Result<TrashItem, String> {
        if !path.exists() {
            return Err(format!("Path does not exist: {:?}", path));
        }

        let id = Uuid::new_v4().to_string();
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let size = Self::get_size(&path);
        let trash_path = self.trash_dir.join(&id);

        // Move to trash
        if path.is_dir() {
            fs_extra::dir::move_dir(&path, &trash_path, &fs_extra::dir::CopyOptions::new())
                .map_err(|e| format!("Failed to move directory to trash: {}", e))?;
        } else {
            fs::rename(&path, &trash_path)
                .or_else(|_| {
                    fs::copy(&path, &trash_path)?;
                    fs::remove_file(&path)
                })
                .map_err(|e| format!("Failed to move file to trash: {}", e))?;
        }

        let item = TrashItem {
            id,
            original_path: path,
            trash_path,
            size,
            name,
            deleted_at: Utc::now(),
        };

        // Update metadata
        let mut metadata = self.load_metadata();
        metadata.items.push(item.clone());
        self.save_metadata(&metadata)?;

        Ok(item)
    }

    pub fn list_items(&self) -> Vec<TrashItem> {
        self.load_metadata().items
    }

    pub fn restore_item(&self, id: &str) -> Result<(), String> {
        let mut metadata = self.load_metadata();

        let item_index = metadata.items.iter()
            .position(|i| i.id == id)
            .ok_or("Item not found in trash")?;

        let item = &metadata.items[item_index];

        // Ensure parent directory exists
        if let Some(parent) = item.original_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
        }

        // Move back to original location
        if item.trash_path.is_dir() {
            fs_extra::dir::move_dir(&item.trash_path, &item.original_path, &fs_extra::dir::CopyOptions::new())
                .map_err(|e| format!("Failed to restore directory: {}", e))?;
        } else {
            fs::rename(&item.trash_path, &item.original_path)
                .map_err(|e| format!("Failed to restore file: {}", e))?;
        }

        // Remove from metadata
        metadata.items.remove(item_index);
        self.save_metadata(&metadata)?;

        Ok(())
    }

    pub fn permanently_delete(&self, id: &str) -> Result<(), String> {
        let mut metadata = self.load_metadata();

        let item_index = metadata.items.iter()
            .position(|i| i.id == id)
            .ok_or("Item not found in trash")?;

        let item = &metadata.items[item_index];

        // Delete from disk
        if item.trash_path.is_dir() {
            fs::remove_dir_all(&item.trash_path)
                .map_err(|e| format!("Failed to delete directory: {}", e))?;
        } else {
            fs::remove_file(&item.trash_path)
                .map_err(|e| format!("Failed to delete file: {}", e))?;
        }

        // Remove from metadata
        metadata.items.remove(item_index);
        self.save_metadata(&metadata)?;

        Ok(())
    }

    pub fn purge_all(&self) -> Result<u32, String> {
        let metadata = self.load_metadata();
        let count = metadata.items.len() as u32;

        for item in &metadata.items {
            if item.trash_path.exists() {
                if item.trash_path.is_dir() {
                    let _ = fs::remove_dir_all(&item.trash_path);
                } else {
                    let _ = fs::remove_file(&item.trash_path);
                }
            }
        }

        self.save_metadata(&TrashMetadata { items: vec![] })?;

        Ok(count)
    }

    pub fn purge_old_items(&self, days: i64) -> Result<u32, String> {
        let mut metadata = self.load_metadata();
        let cutoff = Utc::now() - Duration::days(days);
        let mut deleted = 0;

        metadata.items.retain(|item| {
            if item.deleted_at < cutoff {
                if item.trash_path.exists() {
                    if item.trash_path.is_dir() {
                        let _ = fs::remove_dir_all(&item.trash_path);
                    } else {
                        let _ = fs::remove_file(&item.trash_path);
                    }
                }
                deleted += 1;
                false
            } else {
                true
            }
        });

        self.save_metadata(&metadata)?;

        Ok(deleted)
    }
}
```

**Step 2: Add fs_extra dependency to Cargo.toml**

Add to `src-tauri/Cargo.toml`:

```toml
fs_extra = "1.3"
```

**Step 3: Update commands.rs with trash operations**

Replace `src-tauri/src/commands.rs`:

```rust
use crate::scanner::{Scanner, ScannedItem};
use crate::trash::{TrashManager, TrashItem};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;
use std::sync::Mutex;

pub struct AppState {
    pub trash_manager: Mutex<TrashManager>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub items: Vec<ScannedItem>,
    pub total_size: u64,
    pub item_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteResult {
    pub deleted: u32,
    pub failed: Vec<String>,
}

#[tauri::command]
pub async fn scan_category(category: String) -> Result<ScanResult, String> {
    let scanner = Scanner::new();

    let items = match category.as_str() {
        "caches" => scanner.scan_caches(),
        "dev-artifacts" => scanner.scan_dev_artifacts(),
        "large-files" => scanner.scan_large_files(100),
        _ => return Err(format!("Unknown category: {}", category)),
    };

    let total_size: u64 = items.iter().map(|i| i.size).sum();
    let item_count = items.len();

    Ok(ScanResult {
        items,
        total_size,
        item_count,
    })
}

#[tauri::command]
pub async fn delete_items(
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<DeleteResult, String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    let mut deleted = 0u32;
    let mut failed: Vec<String> = vec![];

    for path_str in paths {
        let path = PathBuf::from(&path_str);
        match trash_manager.move_to_trash(path) {
            Ok(_) => deleted += 1,
            Err(e) => failed.push(format!("{}: {}", path_str, e)),
        }
    }

    Ok(DeleteResult { deleted, failed })
}

#[tauri::command]
pub async fn list_trash(state: State<'_, AppState>) -> Result<Vec<TrashItem>, String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    Ok(trash_manager.list_items())
}

#[tauri::command]
pub async fn restore_items(
    ids: Vec<String>,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    let mut restored = 0u32;

    for id in ids {
        if trash_manager.restore_item(&id).is_ok() {
            restored += 1;
        }
    }

    Ok(restored)
}

#[tauri::command]
pub async fn purge_trash(state: State<'_, AppState>) -> Result<u32, String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    trash_manager.purge_all()
}

#[tauri::command]
pub async fn permanently_delete(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let trash_manager = state.trash_manager.lock()
        .map_err(|_| "Failed to lock trash manager")?;

    trash_manager.permanently_delete(&id)
}
```

**Step 4: Update lib.rs with state management**

Replace `src-tauri/src/lib.rs`:

```rust
mod commands;
mod config;
mod scanner;
mod categorizer;
mod trash;

use commands::{
    scan_category, delete_items, list_trash, restore_items, purge_trash, permanently_delete,
    AppState,
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
            permanently_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 5: Build and verify**

```bash
npm run tauri dev
```

Expected: App builds without Rust errors

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement trash manager with move, restore, and purge"
```

---

### Task 4.2: Create Trash View in Frontend

**Files:**
- Create: `src/components/trash-view.tsx`
- Create: `src/hooks/use-trash.ts`
- Modify: `src/lib/tauri.ts`
- Modify: `src/components/category-view.tsx`

**Step 1: Update Tauri helpers**

Add to `src/lib/tauri.ts`:

```typescript
export async function permanentlyDelete(id: string): Promise<void> {
  return invoke<void>("permanently_delete", { id })
}
```

**Step 2: Create useTrash hook**

Create `src/hooks/use-trash.ts`:

```typescript
import { useState, useCallback } from "react"
import { listTrash, restoreItems, purgeTrash, permanentlyDelete } from "@/lib/tauri"
import type { TrashItem } from "@/types"

interface UseTrashResult {
  items: TrashItem[]
  totalSize: number
  isLoading: boolean
  error: string | null
  load: () => Promise<void>
  restore: (ids: string[]) => Promise<void>
  purge: () => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

export function useTrash(): UseTrashResult {
  const [items, setItems] = useState<TrashItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSize = items.reduce((sum, item) => sum + item.size, 0)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await listTrash()
      setItems(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const restore = useCallback(async (ids: string[]) => {
    try {
      await restoreItems(ids)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [load])

  const purge = useCallback(async () => {
    try {
      await purgeTrash()
      setItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    try {
      await permanentlyDelete(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [load])

  return {
    items,
    totalSize,
    isLoading,
    error,
    load,
    restore,
    purge,
    deleteItem,
  }
}
```

**Step 3: Create TrashView component**

Create `src/components/trash-view.tsx`:

```tsx
import { useState, useEffect } from "react"
import { Loader2, RotateCcw, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useTrash } from "@/hooks/use-trash"
import { formatBytes, formatDate } from "@/lib/format"

interface TrashViewProps {
  onStatsUpdate: (stats: { itemCount: number; totalSize: number } | null) => void
}

export function TrashView({ onStatsUpdate }: TrashViewProps) {
  const { items, totalSize, isLoading, error, load, restore, purge, deleteItem } = useTrash()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    onStatsUpdate(items.length > 0 ? { itemCount: items.length, totalSize } : null)
  }, [items, totalSize, onStatsUpdate])

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }

  const handleRestore = async () => {
    await restore(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handlePurge = async () => {
    await purge()
    setSelectedIds(new Set())
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-6 py-4">
          <h2 className="text-2xl font-semibold">Trash</h2>
          <p className="text-sm text-muted-foreground">
            Items moved to DiskClean trash. Restore or permanently delete.
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Trash</h2>
            <p className="text-sm text-muted-foreground">
              Items moved to DiskClean trash. Restore or permanently delete.
            </p>
          </div>
          {items.length > 0 && (
            <Badge variant="secondary">
              {items.length} items · {formatBytes(totalSize)}
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 px-6 py-3 text-destructive">
          Error: {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Trash2 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Trash is empty</p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => handleToggleItem(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.original_path}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{formatBytes(item.size)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.deleted_at)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restore([item.id])}
                      title="Restore"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                      title="Delete permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedIds.size === items.length ? "Deselect All" : "Select All"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={selectedIds.size === 0}
                onClick={handleRestore}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore Selected
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Empty Trash
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Empty Trash?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {items.length} items ({formatBytes(totalSize)}).
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurge}>
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

**Step 4: Add AlertDialog component from shadcn**

```bash
npx shadcn@latest add alert-dialog
```

**Step 5: Update CategoryView to use TrashView**

Update `src/components/category-view.tsx` to render TrashView for trash category:

Add import at top:
```tsx
import { TrashView } from "./trash-view"
```

Replace the trash section in the component:
```tsx
if (category === "trash") {
  return <TrashView onStatsUpdate={(stats) => onStatsUpdate(category, stats)} />
}
```

**Step 6: Build and test**

```bash
npm run tauri dev
```

Expected: Trash view shows items, restore and delete work

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement trash view with restore and purge"
```

---

### Task 4.3: Connect Delete Button to Trash

**Files:**
- Modify: `src/components/category-view.tsx`
- Modify: `src/lib/tauri.ts`

**Step 1: Update CategoryView delete handler**

In `src/components/category-view.tsx`, add the delete handler:

Add import:
```tsx
import { deleteItems } from "@/lib/tauri"
```

Add state for delete operation:
```tsx
const [isDeleting, setIsDeleting] = useState(false)
```

Add delete handler:
```tsx
const handleDelete = async () => {
  const selectedPaths = items
    .filter((item) => selectedIds.has(item.id))
    .map((item) => item.path)

  setIsDeleting(true)
  try {
    const result = await deleteItems(selectedPaths)
    // Remove deleted items from list
    const deletedPaths = new Set(selectedPaths.slice(0, result.deleted))
    const remainingItems = items.filter((item) => !deletedPaths.has(item.path))
    // Trigger rescan to update the list
    await scan()
    setSelectedIds(new Set())
  } catch (err) {
    console.error("Delete failed:", err)
  } finally {
    setIsDeleting(false)
  }
}
```

Update delete button:
```tsx
<Button
  variant="destructive"
  disabled={selectedIds.size === 0 || isDeleting}
  onClick={handleDelete}
>
  {isDeleting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Deleting...
    </>
  ) : (
    "Delete Selected"
  )}
</Button>
```

**Step 2: Build and test full flow**

```bash
npm run tauri dev
```

Expected:
1. Scan a category
2. Select items
3. Click Delete Selected
4. Items move to trash
5. Trash view shows the items
6. Can restore or permanently delete

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: connect delete button to trash system"
```

---

## Phase 5: Polish

### Task 5.1: Add Loading and Empty States

**Files:**
- Modify: `src/components/category-view.tsx`
- Modify: `src/components/trash-view.tsx`

**Step 1: Enhance loading states with better visuals**

Already implemented in previous tasks. Verify they look good.

**Step 2: Commit if any changes**

```bash
git add -A
git commit -m "polish: enhance loading and empty states"
```

---

### Task 5.2: Add Error Handling UI

**Files:**
- Create: `src/components/error-banner.tsx`
- Modify: Various components

**Step 1: Create ErrorBanner component**

Create `src/components/error-banner.tsx`:

```tsx
import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 bg-destructive/10 px-6 py-3 text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm">{message}</span>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
```

**Step 2: Use ErrorBanner in components**

Update category-view.tsx and trash-view.tsx to use ErrorBanner.

**Step 3: Commit**

```bash
git add -A
git commit -m "polish: add error banner component"
```

---

### Task 5.3: Final UI Polish with Frontend Design

**Files:**
- Various component files

**Step 1: Apply frontend-design skill for final polish**

Use the frontend-design skill to review and enhance the UI components for production quality.

Focus areas:
- Consistent spacing and typography
- Hover and focus states
- Transitions and animations
- Dark mode support (if time permits)

**Step 2: Commit**

```bash
git add -A
git commit -m "polish: final UI enhancements"
```

---

### Task 5.4: Build and Test Production Build

**Step 1: Create production build**

```bash
npm run tauri build
```

**Step 2: Test the built application**

Open the built app from `src-tauri/target/release/bundle/`

**Step 3: Verify all features work**

- [ ] Sidebar navigation
- [ ] Scan each category
- [ ] Select/deselect items
- [ ] Delete items (moves to trash)
- [ ] View trash
- [ ] Restore from trash
- [ ] Empty trash

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: verify production build"
```

---

## Summary

This plan implements DiskClean in 5 phases:

1. **Project Setup** - Tauri + React + shadcn/ui scaffold
2. **Scanner Core** - Rust backend for scanning caches, dev artifacts, large files
3. **UI - Category Views** - File list with grouping, selection, scanning
4. **Trash System** - App-managed trash with restore and purge
5. **Polish** - Error handling, loading states, UI refinements

Each task is self-contained with specific files, code, and verification steps.
