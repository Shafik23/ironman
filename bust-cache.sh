#!/bin/bash

# Update cache-busting timestamps in index.html
timestamp=$(date +%Y%m%d%H%M%S)
sed -i '' "s/\?v=[0-9]*/\?v=$timestamp/g" index.html
echo "Updated cache-busting timestamp to: $timestamp"