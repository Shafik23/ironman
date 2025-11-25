#!/usr/bin/env python3
"""
Live reload development server for Iron Man Suit Designer.
Automatically refreshes the browser when files change.

Install: pip install livereload
Usage: python3 serve_live.py
"""
import os
from livereload import Server

PORT = 8000

# Change to script directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

server = Server()

# Watch for file changes
server.watch('*.html')
server.watch('*.css')
server.watch('js/**/*.js')
server.watch('css/**/*.css')

print(f"Live reload server running at http://localhost:{PORT}/")
print("Watching for changes in HTML, CSS, and JS files...")
print("Press Ctrl+C to stop")

server.serve(port=PORT, root='.')
