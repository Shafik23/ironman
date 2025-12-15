#!/bin/bash
SCRIPT_DIR="$(dirname "$0")"
VENV_DIR="$SCRIPT_DIR/venv"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Install livereload if not already installed
if ! python3 -c "import livereload" 2>/dev/null; then
    echo "Installing livereload..."
    pip install livereload
fi

echo "Starting Iron Man Suit Designer (Live Reload)..."
echo "Opening browser at http://localhost:8000"

# Open browser (works on macOS and Linux)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8000
elif command -v open &> /dev/null; then
    open http://localhost:8000
fi

# Start the live reload server (runs in foreground, handles Ctrl+C gracefully)
python3 serve_live.py