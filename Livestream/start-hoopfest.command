#!/bin/bash
# NSMT Hoopfest 2026 — Launch Script
# Starts server, opens Chrome with producer + overlay, shows iPad URL

cd /Users/david/Downloads/Claude/NSMT/Livestream

# Kill any existing server on port 8000/8765
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8765 | xargs kill -9 2>/dev/null
sleep 1

# Start server
python3 nsmt-server.py &
SERVER_PID=$!
echo "Server starting (PID: $SERVER_PID)..."
sleep 2

# Open Chrome — fresh window with only producer + overlay tabs
osascript <<'APPLESCRIPT'
tell application "Google Chrome"
    activate
    set newWindow to make new window
    set URL of active tab of newWindow to "http://localhost:8000/nsmt-producer.html"
    tell newWindow to make new tab with properties {URL:"http://localhost:8000/nsmt-overlay.html"}
    set active tab index of newWindow to 1
end tell
APPLESCRIPT

echo ""
echo "=================================="
echo "  NSMT Hoopfest 2026 — LIVE"
echo "=================================="
echo ""
echo "  Producer:  http://localhost:8000/nsmt-producer.html"
echo "  Overlay:   http://localhost:8000/nsmt-overlay.html"
echo ""
echo "  iPad URL:  http://mbp.local:8000/ipad-control/ipad-control.html"
echo ""
echo "=================================="
echo ""
echo "Server running. Press Ctrl+C to stop."
wait $SERVER_PID
