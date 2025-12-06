# RustDiskCleaner

A fast disk space analyzer and cleaner for macOS, built with Tauri, React, and Rust.

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
