#!/usr/bin/env bash
set -euo pipefail

MODELS_DIR="${1:-public/models}"

if [[ ! -d "$MODELS_DIR" ]]; then
  echo "Dossier introuvable: $MODELS_DIR" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx est requis (Node.js/npm)." >&2
  exit 1
fi

shopt -s nullglob
inputs=("$MODELS_DIR"/*.glb)

if [[ ${#inputs[@]} -eq 0 ]]; then
  echo "Aucun .glb trouve dans $MODELS_DIR"
  exit 0
fi

for input in "${inputs[@]}"; do
  if [[ "$input" == *.draco.glb ]]; then
    continue
  fi

  output="${input%.glb}.draco.glb"
  echo "Compression: $input -> $output"

  npx gltf-transform optimize "$input" "$output" \
    --compress draco \
    --texture-compress webp \
    --texture-size 2048 \
    --prune \
    --join \
    --weld

done

echo "Termine."
