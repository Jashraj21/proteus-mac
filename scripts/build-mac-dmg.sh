#!/usr/bin/env bash
set -e

APP_NAME="Proteus Studio"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$SRC_DIR/dist"
APP_BUNDLE="$DIST_DIR/$APP_NAME.app"
DMG_NAME="Proteus-Studio-1.0.0-mac.dmg"
DMG_PATH="$DIST_DIR/$DMG_NAME"
STAGING_DIR="$DIST_DIR/dmg_staging"

# First ensure the app bundle is up to date
bash "$SRC_DIR/scripts/build-mac-app.sh"

echo "==> Packaging DMG: $DMG_NAME..."
rm -rf "$STAGING_DIR" "$DMG_PATH"
mkdir -p "$STAGING_DIR"

# Copy App bundle and create /Applications symlink for drag-and-drop install
cp -R "$APP_BUNDLE" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"

# Create disk image
hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$STAGING_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

rm -rf "$STAGING_DIR"

echo "==> Successfully created DMG at: $DMG_PATH"
ls -lh "$DMG_PATH"
