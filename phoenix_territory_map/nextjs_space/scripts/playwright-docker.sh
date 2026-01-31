#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.58.1-jammy}"

TAR_EXCLUDES=(
  --exclude=.git
  --exclude=.next
  --exclude=node_modules
)

playwright_args=("$@")

printf 'Using Playwright image: %s\n' "$IMAGE"
printf 'Project root: %s\n' "$ROOT_DIR"

# Stream the repo into the container so we do not rely on bind-mounts.
# This avoids Docker path visibility issues on some hosts.
tar -cf - -C "$ROOT_DIR" "${TAR_EXCLUDES[@]}" . | \
  docker run --rm -i \
    -e HOME=/tmp \
    -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    "$IMAGE" \
    bash -c '
      set -euo pipefail
      mkdir -p /work
      tar -xf - -C /work
      cd /work
      apt-get update
      apt-get install -y unzip
      curl -fsSL "https://bun.sh/install" | bash
      export PATH="$HOME/.bun/bin:$PATH"
      bun --version
      bun install
      bunx playwright test "$@"
    ' -- "${playwright_args[@]}"
