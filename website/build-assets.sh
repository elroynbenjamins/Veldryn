#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p website/assets
copy() { test -s "$1"; cp "$1" "website/assets/$2"; }
copy apps/mobile/assets/app-icon-v1/icon-1024.png icon.png
copy apps/mobile/assets/events-startup-v1/branding/veldryn_logo@2x.webp logo.webp
copy apps/mobile/assets/card-backgrounds/kingdom_approach_wide_v2.webp kingdom.webp
copy apps/mobile/assets/card-backgrounds/kingdom_approach_portrait.webp kingdom-mobile.webp
copy apps/mobile/assets/world/chapters-v1/asterfall-heartlands-pixel-v1.webp asterfall.webp
copy apps/mobile/assets/world/regions-v2/sunscar-pixel-v1.jpg sunscar.jpg
copy apps/mobile/assets/world/regions-v2/frostmarch-pixel-v1.jpg frostmarch.jpg
copy apps/mobile/assets/card-backgrounds/guild_plaza_portrait.webp guild.webp
printf 'Website assets staged successfully.\n'
