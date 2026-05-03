#!/bin/bash
set -e

# Update cache-busting timestamps in index.html
script_dir="$(cd "$(dirname "$0")" && pwd)"
timestamp=$(date +%Y%m%d%H%M%S)
perl -pi -e "s/\\?v=\\d+/\\?v=$timestamp/g" "$script_dir/index.html"
echo "Updated cache-busting timestamp to: $timestamp"
