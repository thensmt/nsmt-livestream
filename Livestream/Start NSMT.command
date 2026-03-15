#!/bin/bash
# NSMT Livestream Launcher
# Double-click to start the server and open the producer

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Kill any existing server on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8765 | xargs kill -9 2>/dev/null
sleep 1

echo "========================================="
echo "  NSMT Livestream Server"
echo "  Producer : http://localhost:8000/nsmt-producer.html"
echo "  Overlay  : http://localhost:8000/nsmt-overlay.html"
echo "  Stats    : http://localhost:8000/nsmt-stats.html"
echo "========================================="
echo ""

# Open producer in browser after a short delay
(sleep 2 && open "http://localhost:8000/nsmt-producer.html") &

# Start server (keeps this window open with logs)
python3 nsmt-server.py
