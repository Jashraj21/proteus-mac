#!/usr/bin/env bash
set -e

APP_NAME="Proteus Studio"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$SRC_DIR/dist"
APP_BUNDLE="$DIST_DIR/$APP_NAME.app"

echo "==> Building $APP_NAME.app for macOS..."

mkdir -p "$DIST_DIR"
rm -rf "$APP_BUNDLE"

# Copy Electron app template
cp -R "$SRC_DIR/node_modules/electron/dist/Electron.app" "$APP_BUNDLE"

# Rename executable to match app name
mv "$APP_BUNDLE/Contents/MacOS/Electron" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

# Copy application source code into app directory
mkdir -p "$APP_BUNDLE/Contents/Resources/app"
cp -R "$SRC_DIR/package.json" "$SRC_DIR/main.js" "$SRC_DIR/preload.js" "$SRC_DIR/src" "$APP_BUNDLE/Contents/Resources/app/"

# Remove default_app.asar to ensure our custom app/ directory is loaded
rm -f "$APP_BUNDLE/Contents/Resources/default_app.asar"

# Update Info.plist metadata
plutil -replace CFBundleDisplayName -string "$APP_NAME" "$APP_BUNDLE/Contents/Info.plist"
plutil -replace CFBundleName -string "$APP_NAME" "$APP_BUNDLE/Contents/Info.plist"
plutil -replace CFBundleExecutable -string "$APP_NAME" "$APP_BUNDLE/Contents/Info.plist"
plutil -replace CFBundleIdentifier -string "com.labcenter.proteus.studio" "$APP_BUNDLE/Contents/Info.plist"

# Replace icon with authentic Proteus icon if available
if [ -f "$SRC_DIR/src/assets/Proteus.icns" ]; then
  cp "$SRC_DIR/src/assets/Proteus.icns" "$APP_BUNDLE/Contents/Resources/electron.icns"
  cp "$SRC_DIR/src/assets/Proteus.icns" "$APP_BUNDLE/Contents/Resources/app.icns"
  plutil -replace CFBundleIconFile -string "app.icns" "$APP_BUNDLE/Contents/Info.plist"
fi

# Ad-hoc sign for Apple Silicon macOS
echo "==> Signing application bundle with codesign..."
codesign --force --deep --sign - "$APP_BUNDLE"

# Install into /Applications
echo "==> Installing into /Applications/$APP_NAME.app..."
rm -rf "/Applications/$APP_NAME.app"
cp -R "$APP_BUNDLE" "/Applications/$APP_NAME.app"

# Also copy into ~/Applications for user convenience
mkdir -p "$HOME/Applications"
rm -rf "$HOME/Applications/$APP_NAME.app"
cp -R "$APP_BUNDLE" "$HOME/Applications/$APP_NAME.app"

# Register with macOS Launch Services so it appears in Spotlight and Launchpad
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "/Applications/$APP_NAME.app" || true

echo "==> Proteus Studio.app is now installed and ready to open from Applications!"
