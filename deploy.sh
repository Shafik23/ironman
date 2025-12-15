#!/bin/bash
#
# deploy.sh - Deploy Iron Man Suit Designer to production server
#
# This script syncs all web assets to the remote production server using rsync.
# It deploys HTML, CSS, JavaScript modules, and audio files required for the
# interactive suit designer interface.
#
# Usage: ./deploy.sh
#
# Prerequisites:
#   - SSH access to the remote server (key-based auth recommended)
#   - rsync installed on both local and remote machines
#
# The script will exit immediately if any command fails (set -e).

set -e

# Remote server configuration
remote=root@pollamin01
app_dir=/root/ironman

echo "------ DEPLOYING Iron Man Suit Designer to $remote ------"

# Deploy core static files (HTML entry point, main stylesheet, audio assets)
# --delete: removes files on remote that don't exist locally
# -a: archive mode (preserves permissions, timestamps, etc.)
# -z: compress during transfer
# -P: show progress and keep partial transfers
rsync --delete -azP -e ssh index.html $remote:$app_dir/
rsync --delete -azP -e ssh style.css $remote:$app_dir/
rsync --delete -azP -e ssh ironman.mp3 $remote:$app_dir/
rsync --delete -azP -e ssh hose.mp3 $remote:$app_dir/
rsync --delete -azP -e ssh favicon.png $remote:$app_dir/
rsync --delete -azP -e ssh apple-touch-icon.png $remote:$app_dir/
rsync --delete -azP -e ssh favicon-192.png $remote:$app_dir/

# Deploy JavaScript modules (ES6 modules for app functionality)
rsync --delete -azP -e ssh js/ $remote:$app_dir/js/

# Deploy CSS modules (modular stylesheets imported by style.css)
rsync --delete -azP -e ssh css/ $remote:$app_dir/css/

echo "---------------------"
echo "------ SUCCESS ------"
echo "Iron Man Suit Designer deployed to $app_dir"
echo "---------------------"
