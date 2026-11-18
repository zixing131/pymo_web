#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

echo "=== PyMO Web KaiOS Build ==="
echo

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js not found! Please install Node.js first."
    exit 1
fi

echo "[1/4] Installing dependencies..."
npm install --save-dev @babel/cli @babel/core @babel/preset-env

echo "[2/4] Creating directories..."
rm -rf dist-kaios
mkdir -p dist-kaios/{core,graphics,audio,ui,utils,js,icons,pymo}

echo "[3/4] Transpiling JavaScript for Firefox 48..."
npx babel src --out-dir dist-kaios --config-file ./babel.kaios.json --ignore "src/*.min.js"

echo "[4/4] Copying static files..."
cp src/*.html src/*.css dist-kaios/
[ -f src/jszip.min.js ] && cp src/jszip.min.js dist-kaios/
[ -f src/regenerator-runtime.min.js ] && cp src/regenerator-runtime.min.js dist-kaios/
[ -f src/manifest.webapp ] && cp src/manifest.webapp dist-kaios/
if [ -d src/icons ]; then
    cp src/icons/*.png dist-kaios/icons/ 2>/dev/null || true
fi
if [ -d src/pymo ]; then
    cp -R src/pymo/. dist-kaios/pymo/
fi

echo
echo "=== Build Complete! ==="
echo "Output: dist-kaios/"
