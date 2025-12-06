#!/bin/bash
set -e

# Release script for RustDiskCleaner
# This script builds, signs, notarizes, creates DMGs, publishes to GitHub, and updates Homebrew

# Load environment variables from .env if it exists
if [ -f "$(dirname "$0")/../.env" ]; then
    source "$(dirname "$0")/../.env"
fi

# Configuration
APP_NAME="RustDiskCleaner"
BUNDLE_ID="com.ozan.rustdiskcleaner"
SIGNING_IDENTITY="Developer ID Application: Ozan Kasikci (H69JJG55Y6)"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
HOMEBREW_TAP_REPO="ozankasikci/homebrew-tap"
GITHUB_REPO="ozankasikci/rust-disk-cleaner"

# Get version from tauri.conf.json
VERSION=$(grep '"version"' "$TAURI_DIR/tauri.conf.json" | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')

echo "=== RustDiskCleaner Release Script ==="
echo "Version: $VERSION"
echo "Project root: $PROJECT_ROOT"
echo ""

# Check for required credentials
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo "Error: Missing Apple credentials. Please set:"
    echo "  APPLE_ID - Your Apple ID email"
    echo "  APPLE_PASSWORD - App-specific password"
    echo "  APPLE_TEAM_ID - Your Team ID"
    exit 1
fi

# Function to build for a specific architecture
build_arch() {
    local arch=$1
    local target=$2

    echo "=== Building for $arch ($target) ==="
    cd "$PROJECT_ROOT"
    npm run tauri build -- --target "$target"
    echo "Build complete for $arch"
}

# Function to sign app with hardened runtime
sign_app() {
    local arch=$1
    local target=$2
    local app_path="$TAURI_DIR/target/$target/release/bundle/macos/${APP_NAME}.app"

    echo "=== Signing app for $arch ==="
    codesign --force --deep --sign "$SIGNING_IDENTITY" --timestamp --options runtime "$app_path"
    echo "Signed: $app_path"
}

# Function to create DMG from signed app
create_dmg() {
    local arch=$1
    local target=$2
    local dmg_name="${APP_NAME}_${VERSION}_${arch}.dmg"
    local app_path="$TAURI_DIR/target/$target/release/bundle/macos/${APP_NAME}.app"
    local output_dir="$PROJECT_ROOT/release"
    local dmg_path="$output_dir/$dmg_name"

    echo "=== Creating DMG for $arch ==="
    mkdir -p "$output_dir"
    rm -f "$dmg_path"
    hdiutil create -volname "$APP_NAME" -srcfolder "$app_path" -ov -format UDZO "$dmg_path"
    echo "DMG created at $dmg_path"
}

# Function to sign DMG
sign_dmg() {
    local arch=$1
    local dmg_name="${APP_NAME}_${VERSION}_${arch}.dmg"
    local dmg_path="$PROJECT_ROOT/release/$dmg_name"

    echo "=== Signing DMG for $arch ==="
    codesign --force --sign "$SIGNING_IDENTITY" --timestamp "$dmg_path"
    echo "Signed: $dmg_path"
}

# Function to notarize DMG
notarize_dmg() {
    local arch=$1
    local dmg_name="${APP_NAME}_${VERSION}_${arch}.dmg"
    local dmg_path="$PROJECT_ROOT/release/$dmg_name"

    echo "=== Notarizing DMG for $arch ==="
    xcrun notarytool submit "$dmg_path" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_PASSWORD" \
        --team-id "$APPLE_TEAM_ID" \
        --wait

    echo "=== Stapling notarization ticket for $arch ==="
    xcrun stapler staple "$dmg_path"
    echo "Notarization complete for $arch"
}

# Function to calculate SHA256
calc_sha256() {
    local arch=$1
    local dmg_name="${APP_NAME}_${VERSION}_${arch}.dmg"
    local dmg_path="$PROJECT_ROOT/release/$dmg_name"

    shasum -a 256 "$dmg_path" | awk '{print $1}'
}

# Function to create GitHub release
create_github_release() {
    local aarch64_dmg="$PROJECT_ROOT/release/${APP_NAME}_${VERSION}_aarch64.dmg"
    local aarch64_sha=$(calc_sha256 "aarch64")

    echo "=== Creating GitHub Release ==="

    # Delete existing release and tag if they exist
    gh release delete "v$VERSION" --repo "$GITHUB_REPO" --yes 2>/dev/null || true
    git tag -d "v$VERSION" 2>/dev/null || true
    git push origin --delete "v$VERSION" 2>/dev/null || true

    # Create and push tag
    git tag "v$VERSION"
    git push origin "v$VERSION"

    # Create release with DMG
    gh release create "v$VERSION" \
        "$aarch64_dmg" \
        --repo "$GITHUB_REPO" \
        --title "v$VERSION" \
        --notes "## Downloads

- **Apple Silicon (M1/M2/M3)**: \`${APP_NAME}_${VERSION}_aarch64.dmg\`

## SHA256 Checksums
\`\`\`
$aarch64_sha  ${APP_NAME}_${VERSION}_aarch64.dmg
\`\`\`

## Install via Homebrew
\`\`\`bash
brew tap ozankasikci/tap
brew install --cask rust-disk-cleaner
\`\`\`
"

    echo "GitHub release created: https://github.com/$GITHUB_REPO/releases/tag/v$VERSION"
}

# Function to update Homebrew tap
update_homebrew() {
    local aarch64_sha=$(calc_sha256 "aarch64")
    local tmp_dir=$(mktemp -d)

    echo "=== Updating Homebrew Tap ==="

    cd "$tmp_dir"
    gh repo clone "$HOMEBREW_TAP_REPO" homebrew-tap

    cat > homebrew-tap/Casks/rust-disk-cleaner.rb << EOF
cask "rust-disk-cleaner" do
  version "$VERSION"
  sha256 "$aarch64_sha"

  url "https://github.com/$GITHUB_REPO/releases/download/v#{version}/${APP_NAME}_#{version}_aarch64.dmg"

  depends_on arch: :arm64

  name "RustDiskCleaner"
  desc "Fast disk space analyzer and cleaner for macOS"
  homepage "https://github.com/$GITHUB_REPO"

  app "${APP_NAME}.app"

  zap trash: [
    "~/Library/Preferences/com.ozan.rustdiskcleaner.plist",
    "~/Library/Saved Application State/com.ozan.rustdiskcleaner.savedState",
  ]
end
EOF

    cd homebrew-tap
    git add Casks/rust-disk-cleaner.rb
    git commit -m "bump rust-disk-cleaner to v$VERSION"
    git push

    cd "$PROJECT_ROOT"
    rm -rf "$tmp_dir"

    echo "Homebrew tap updated to v$VERSION"
}

# Main release process
main() {
    local skip_build=false
    local skip_notarize=false
    local skip_github=false
    local skip_homebrew=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                skip_build=true
                shift
                ;;
            --skip-notarize)
                skip_notarize=true
                shift
                ;;
            --skip-github)
                skip_github=true
                shift
                ;;
            --skip-homebrew)
                skip_homebrew=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-build      Skip the build step (use existing builds)"
                echo "  --skip-notarize   Skip notarization (for testing)"
                echo "  --skip-github     Skip GitHub release creation"
                echo "  --skip-homebrew   Skip Homebrew tap update"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    local arch="aarch64"
    local target="aarch64-apple-darwin"

    # Build
    if [ "$skip_build" = false ]; then
        build_arch "$arch" "$target"
    fi

    # Sign app
    sign_app "$arch" "$target"

    # Create DMG
    create_dmg "$arch" "$target"

    # Sign DMG
    sign_dmg "$arch"

    # Notarize DMG
    if [ "$skip_notarize" = false ]; then
        notarize_dmg "$arch"
    fi

    # Print summary
    echo ""
    echo "=== Build Complete ==="
    echo "Version: $VERSION"
    echo ""
    echo "DMG file in $PROJECT_ROOT/release/:"
    local dmg_name="${APP_NAME}_${VERSION}_${arch}.dmg"
    local sha=$(calc_sha256 "$arch")
    echo "  $dmg_name"
    echo "    SHA256: $sha"

    # Create GitHub release
    if [ "$skip_github" = false ]; then
        create_github_release
    fi

    # Update Homebrew tap
    if [ "$skip_homebrew" = false ]; then
        update_homebrew
    fi

    echo ""
    echo "=== Release Complete ==="
    echo "Version: $VERSION"
    echo "GitHub: https://github.com/$GITHUB_REPO/releases/tag/v$VERSION"
    echo "Homebrew: brew install --cask ozankasikci/tap/rust-disk-cleaner"
}

main "$@"
