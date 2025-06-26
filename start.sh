#!/bin/bash
echo "Starting Iron Man Suit Designer..."
echo "Opening browser at http://localhost:8000"

# Start the server
python3 serve.py &
SERVER_PID=$!

# Wait a moment for server to start
sleep 1

# Open browser (works on macOS)
open http://localhost:8000

# Keep the server running
echo "Server running on PID $SERVER_PID"
echo "Press Ctrl+C to stop"

# Wait for interrupt
trap "kill $SERVER_PID; echo 'Server stopped'; exit" INT
wait $SERVER_PID