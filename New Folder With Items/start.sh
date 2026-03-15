#!/bin/bash
# NSMT Scorebug Server — run this before opening OBS or the iPad
cd "$(dirname "$0")"

# Check for websockets
if ! python3 -c "import websockets" 2>/dev/null; then
  echo "Installing required dependency: websockets"
  pip3 install websockets
fi

python3 scoreboard_server.py
