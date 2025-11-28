#!/bin/bash
echo "Starting Iron Man Suit Designer (Live Reload)..."
echo "Opening browser at http://localhost:8000"

# Activate virtual environment
source "$(dirname "$0")/venv/bin/activate"

# Open browser (works on macOS)
open http://localhost:8000

# Start the live reload server (runs in foreground, handles Ctrl+C gracefully)
python3 serve_live.py