#!/usr/bin/env bash
# Run from frontend/ directory:  bash scripts/download-models.sh
set -e
MODELS_DIR="$(dirname "$0")/../public/models"
mkdir -p "$MODELS_DIR"
echo "Downloading Kenney City Kit GLB models..."

download() {
  local url="$1" dest="$2"
  [ -f "$dest" ] && echo "  ✓ $(basename $dest) exists" && return
  echo "  ↓ $(basename $dest)"
  curl -L --silent --fail -o "$dest" "$url" || echo "  ✗ Failed: $url"
}

BASE="https://raw.githubusercontent.com/KenneyNL/Starter-Kit-City-Builder/main/assets/models"
download "$BASE/structure-high-A.glb"   "$MODELS_DIR/office.glb"
download "$BASE/structure-high-B.glb"   "$MODELS_DIR/stadium.glb"
download "$BASE/structure-low-A.glb"    "$MODELS_DIR/house.glb"
download "$BASE/structure-low-B.glb"    "$MODELS_DIR/apartment.glb"
download "$BASE/structure-medium-A.glb" "$MODELS_DIR/park.glb"

echo ""
echo "Done! Models saved to $MODELS_DIR"
echo "If downloads failed, manually place GLB files from:"
echo "  https://kenney.nl/assets/city-kit-commercial  (office.glb, stadium.glb)"
echo "  https://kenney.nl/assets/city-kit-suburban    (house.glb)"
echo "  https://kenney.nl/assets/city-kit-industrial  (apartment.glb, park.glb)"
