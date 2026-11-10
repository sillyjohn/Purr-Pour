#!/usr/bin/env bash
set -euo pipefail

# Rebuild the in-app scene layers from the supplied original artwork.
# The charcoal wall is removed by a low-fuzz, edge-connected flood fill so
# interior dark pixel outlines remain; only the empty right-side floor is used
# as the repeatable stage floor, and the original source is never modified.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/../../attached_assets/Gemini_Generated_Image_xxoypixxoypixxoy_1794343394246.jpeg"
OUT="$ROOT/public/scene"
mkdir -p "$OUT"

magick "$SOURCE" \
  -crop 885x470+0+260 +repage \
  -fuzz 5% -fill none -draw 'alpha 0,0 floodfill' \
  -fill none -draw 'rectangle 878,366 885,470' \
  "$OUT/cafe-station-cutout.png"

# Crop an unmarked floor swatch; the tiny generated sparkle at the source edge
# is intentionally excluded. Repeating the swatch supplies floor on both sides.
magick "$SOURCE" -crop 350x140+914+628 +repage -quality 88 \
  "$OUT/cafe-floor-tile.jpg"
