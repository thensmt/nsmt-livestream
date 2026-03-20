#!/bin/bash
# NSMT Livestream Launcher
# Double-click to start the server and open the producer

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Kill any existing server on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8765 | xargs kill -9 2>/dev/null
sleep 1

LOCAL=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")
BONJOUR="MBP.local"

echo "========================================="
echo "  NSMT Livestream Server"
echo ""
echo "  MBP (this machine):"
echo "  Producer : http://mbp.local:8000/nsmt-producer.html"
echo "  Overlay  : http://mbp.local:8000/nsmt-combined-overlay.html"
echo ""
echo "  iPad (use either URL):"
echo "  Game Ctrl: http://${BONJOUR}:8000/ipad-control/ipad-control.html"
echo "  Stats    : http://${BONJOUR}:8000/nsmt-stats.html"
echo ""
echo "  IP backup: http://${LOCAL}:8000/ipad-control/ipad-control.html"
echo "========================================="
echo ""

# Open producer in browser after a short delay
(sleep 2 && open "http://mbp.local:8000/nsmt-producer.html") &

# Start server (keeps this window open with logs)
python3 nsmt-server.py
