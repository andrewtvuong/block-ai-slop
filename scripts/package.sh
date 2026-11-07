#!/usr/bin/env bash
# Build the Chrome Web Store upload: dist/block-ai-slop-<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
out="dist/block-ai-slop-${version}.zip"

mkdir -p dist
rm -f "$out"
zip -q -r -X "$out" manifest.json LICENSE src popup \
  icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png
echo "$out"
unzip -l "$out" | tail -n +4 | sed '$d' | sed '$d'
