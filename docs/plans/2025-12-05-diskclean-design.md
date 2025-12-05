# DiskClean - Design Document

A Tauri desktop app that helps reclaim disk space with minimal effort.

## Core Concept

- Launch the app → sidebar shows three categories (Caches, Dev Artifacts, Large Files)
- Click a category → Rust backend scans for matching files on-demand
- Review results grouped by subcategory (e.g., "npm cache", "Xcode derived data")
- Check items to delete → click "Move to Trash"
- Files go to app-managed trash with restore capability
- Trash auto-purges after 30 days (configurable)

## Tech Stack

- **Backend:** Rust + Tauri (file scanning, categorization, trash management)
- **Frontend:** React + TypeScript + shadcn/ui + Tailwind
- **Config:** TOML files defining OS-specific cache paths
- **Cross-platform:** Mac first, Windows/Linux paths added via config

## MVP Scope

**In v1:**
- Caches detection
- Dev artifacts detection (node_modules, target, build folders)
- Large files detection (>100MB threshold)

**Not in v1:**
- Duplicate file detection
- Old/stale file detection
- Scheduled/automatic scans

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌─────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Sidebar │  │   File List      │  │  Trash Panel   │  │
│  │         │  │   (per category) │  │  (restore/     │  │
│  │ -Caches │  │                  │  │   purge)       │  │
│  │ -DevArt │  │  □ item 234 MB   │  │                │  │
│  │ -Large  │  │  □ item 1.2 GB   │  │                │  │
│  │ -Trash  │  │                  │  │                │  │
│  └─────────┘  └──────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │ Tauri IPC
┌─────────────────────────────────────────────────────────┐
│                    Rust Backend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Scanner    │  │ Categorizer │  │  Trash Manager  │  │
│  │  - walks fs │  │ - rules     │  │  - move/restore │  │
│  │  - sizes    │  │ - config    │  │  - auto-purge   │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Platform Config (TOML) - cache paths per OS        ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Rust Modules

- `scanner` - Parallel directory walking using `walkdir` + `rayon`
- `categorizer` - Matches paths against rules (regex + glob patterns)
- `trash` - Moves files to `~/.diskclean-trash/`, tracks metadata for restore
- `config` - Loads platform-specific paths from bundled TOML

### Tauri Commands

- `scan_category(category: string)` → returns file list with sizes
- `delete_items(paths: Vec<string>)` → moves to app trash
- `list_trash()` → returns trashed items with original paths
- `restore_items(ids: Vec<string>)` → restores from trash
- `purge_trash()` → permanently deletes

## Category Definitions

### 1. Caches (pattern-matched paths)

- npm/yarn/pnpm: `~/.npm/_cacache`, `~/.yarn/cache`, `~/.pnpm-store`
- Homebrew: `~/Library/Caches/Homebrew`
- pip: `~/Library/Caches/pip`
- Xcode: `~/Library/Developer/Xcode/DerivedData`
- General macOS: `~/Library/Caches/*`
- Browser caches (Chrome, Safari, Firefox - user opt-in due to login sessions)

### 2. Dev Artifacts (auto-discovered anywhere on disk)

- `node_modules/` - JavaScript dependencies
- `target/` - Rust build output
- `build/`, `dist/` - Common build folders
- `.gradle/` - Java/Android builds
- `Pods/` - iOS CocoaPods
- `venv/`, `.venv/`, `__pycache__/` - Python

### 3. Large Files (scanned with size threshold)

- Default: files > 100MB
- User can adjust threshold
- Shows file type (video, disk image, archive, other)
- Excludes system directories and apps

### Config Structure

```toml
[macos.caches]
npm = "~/.npm/_cacache"
yarn = "~/.yarn/cache"
homebrew = "~/Library/Caches/Homebrew"

[patterns.dev_artifacts]
globs = ["**/node_modules", "**/target", "**/.venv"]
```

## UI Layout

### Sidebar (left, ~200px)

- App logo/name at top
- Category buttons: Caches, Dev Artifacts, Large Files
- Trash button at bottom (shows item count badge)
- Each category shows quick stats after scan: "12 items · 4.2 GB"

### Main Content Area

- **Before scan:** Empty state with "Scan" button and description
- **During scan:** Progress indicator with "Scanning... found X items (Y GB)"
- **After scan:** Grouped list of results

### File List Structure

```
▼ npm cache                           2.1 GB
   □ ~/.npm/_cacache                  2.1 GB    [View]

▼ Xcode Derived Data                  8.4 GB
   □ MyApp-xxxxx                      3.2 GB    [View]
   □ OtherProject-xxxxx               5.2 GB    [View]
```

- Collapsible groups by subcategory
- Checkbox per item for selection
- "View" opens in Finder
- Bulk actions: "Select All" / "Delete Selected"

### Trash Panel

- List of deleted items with original path, size, deletion date
- "Restore" and "Delete Permanently" per item
- "Empty Trash" button with confirmation
- Shows auto-purge timeline: "Items deleted after 30 days"

## Error Handling

### Permission Issues

- macOS requires Full Disk Access for some directories
- Show inline warning "Grant Full Disk Access in System Settings" with link
- Continue scanning accessible paths, don't block entire scan

### Scan Interruption

- User can cancel scan anytime
- Shows partial results found so far
- "Resume" option to continue where left off

### Deletion Failures

- If file is in use or locked: skip it, show error inline
- Batch operations continue past individual failures
- Summary at end: "Moved 45/47 items (2 skipped)"

### Trash Management

- If trash folder grows very large (>50GB): show warning banner
- If original location no longer exists on restore: prompt for new location
- Metadata stored in `~/.diskclean-trash/.metadata.json`

### Protected Paths (never suggest for deletion)

- System folders (`/System`, `/Library`, `/usr`)
- Running applications
- The app's own trash folder

## Project Structure

```
ai-disk-clean/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Tauri entry point
│   │   ├── commands.rs          # Tauri IPC commands
│   │   ├── scanner.rs           # Directory walking
│   │   ├── categorizer.rs       # Rule matching
│   │   ├── trash.rs             # Trash management
│   │   └── config.rs            # Platform config loader
│   ├── configs/
│   │   ├── macos.toml
│   │   ├── windows.toml         # (future)
│   │   └── linux.toml           # (future)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── sidebar.tsx
│   │   ├── category-view.tsx
│   │   ├── file-list.tsx
│   │   ├── file-group.tsx
│   │   ├── trash-view.tsx
│   │   └── ui/                  # shadcn components
│   ├── hooks/
│   │   ├── use-scanner.ts       # Tauri command wrappers
│   │   └── use-trash.ts
│   ├── lib/
│   │   ├── tauri.ts             # Typed Tauri invoke helpers
│   │   └── format.ts            # Size formatting utils
│   └── types/
│       └── index.ts             # Shared types
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

### Key Rust Dependencies

- `walkdir` - Directory traversal
- `rayon` - Parallel iteration
- `glob` - Pattern matching
- `serde` / `toml` - Config parsing

## Implementation Phases

### Phase 1: Project Setup

- Initialize Tauri + React + TypeScript project
- Set up shadcn/ui and Tailwind
- Basic app shell with sidebar layout
- Tauri IPC skeleton (commands defined, not implemented)

### Phase 2: Scanner Core

- Rust scanner module with parallel directory walking
- Config loader for platform-specific paths
- Categorizer with glob/regex matching
- `scan_category` command returning results to frontend

### Phase 3: UI - Category Views

- Sidebar with category navigation
- File list component with grouping
- Selection state management
- Size formatting and display
- "Scan" button and progress state

### Phase 4: Trash System

- Rust trash manager (move, restore, metadata tracking)
- Trash view in frontend
- Delete selected → move to app trash
- Restore functionality
- Auto-purge logic (30-day default)

### Phase 5: Polish

- Permission error handling and guidance
- Empty states and loading states
- Scan cancellation
- "Open in Finder" action
- Settings (size threshold for large files, purge duration)

### Phase 6: Future (post-MVP)

- Windows/Linux configs
- Duplicate detection
- Old file detection
- Scheduled scans
