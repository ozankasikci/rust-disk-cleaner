# RustDiskCleaner

[![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-24C8DB?style=flat&logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A fast disk space analyzer and cleaner for macOS, built with Tauri, React, and Rust.

![RustDiskCleaner Screenshot](assets/screenshot.png)

## Features

- Scans directories for large files and caches
- Categorizes files (caches, logs, downloads, node_modules, etc.)
- Move files to trash with easy restoration
- Multiple color themes (dark and light variants)
- Native macOS performance with Rust backend

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Rust, Tauri v2
- **Build**: Vite

## License

MIT
