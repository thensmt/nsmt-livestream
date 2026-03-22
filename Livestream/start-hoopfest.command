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
    tell newWindow to make new tab with properties {URL:"http://localhost:8000/nsmt-combined-overlay.html"}
    set active tab index of newWindow to 1
end tell
APPLESCRIPT

echo ""
echo "============================================"
echo "  NSMT Hoopfest 2026 — LIVE"
echo "============================================"
echo ""
echo "  Producer:     http://localhost:8000/nsmt-producer.html"
echo "  Overlay:      http://localhost:8000/nsmt-combined-overlay.html"
echo ""
echo "  iPad (main):  http://mbp.local:8000/ipad-control/ipad-control.html"
echo "  iPad (3PT C2):http://mbp.local:8000/ipad-control/ipad-control.html?court=2"
echo ""
echo "  3PT Court 1:  http://mbp.local:8000/3pt-control/?court=1"
echo "  3PT Court 2:  http://mbp.local:8000/3pt-control/?court=2"
echo ""
echo "  Dunk Judges:"
echo "    Judge 1:    http://mbp.local:8000/dunk-judge/?judge=1"
echo "    Judge 2:    http://mbp.local:8000/dunk-judge/?judge=2"
echo "    Judge 3:    http://mbp.local:8000/dunk-judge/?judge=3"
echo "    Judge 4:    http://mbp.local:8000/dunk-judge/?judge=4"
echo "    Judge 5:    http://mbp.local:8000/dunk-judge/?judge=5"
echo ""
echo "============================================"
echo ""
echo "Server running. Press Ctrl+C to stop."
wait $SERVER_PID
