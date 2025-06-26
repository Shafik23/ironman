#!/bin/bash

set -e

remote=root@pollamin01
app_dir=/root/ironman

echo "------ DEPLOYING Iron Man Suit Designer to $remote ------"

# Deploy static web files
rsync --delete -azP -e ssh index.html $remote:$app_dir/
rsync --delete -azP -e ssh style.css $remote:$app_dir/
rsync --delete -azP -e ssh ironman.mp3 $remote:$app_dir/
rsync --delete -azP -e ssh hose.mp3 $remote:$app_dir/

# Deploy js modules folder
rsync --delete -azP -e ssh js/ $remote:$app_dir/js/

echo "---------------------"
echo "------ SUCCESS ------"
echo "Iron Man Suit Designer deployed to $app_dir"
echo "---------------------"
