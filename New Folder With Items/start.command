#!/bin/bash
cd "$(dirname "$0")"

# Kill anything already on our ports
echo "Clearing ports 8000 and 8765..."
kill $(lsof -ti:8000,8765) 2>/dev/null
sleep 1

if ! python3 -c "import websockets" 2>/dev/null; then
  echo "Installing required dependency: websockets"
  pip3 install websockets
fi

python3 scoreboard_server.py
