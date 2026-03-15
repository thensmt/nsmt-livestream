# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo with two coupled components:

- **`Livestream/`** — All web source files (HTML/JS/CSS/assets). This is the primary working directory for almost all changes.
- **`nsmt-app/`** — Capacitor wrapper that packages `nsmt-stats.html` as an iOS/Android app. Contains no original source; it copies from `Livestream/` at build time.

## Running the Livestream System

Double-click `Livestream/Start NSMT.command` to start everything, or manually:

```bash
cd Livestream
python3 nsmt-server.py          # Python server (preferred)
# OR
node nsmt-server-node.js        # Node.js alternative (requires: npm install ws)
```

- HTTP static server: `http://localhost:8000`
- WebSocket hub: `ws://localhost:8765`
- Producer opens automatically in browser at `http://localhost:8000/nsmt-producer.html`

Environment overrides: `NSMT_HTTP_PORT`, `NSMT_WS_PORT`

## Building the Mobile App

All commands run from `nsmt-app/`:

```bash
node /usr/local/bin/npm run build       # Copy Livestream/ assets → www/
node /usr/local/bin/npx cap sync ios    # Sync to Xcode (requires CocoaPods in PATH)
node /usr/local/bin/npx cap open ios    # Open Xcode workspace
node /usr/local/bin/npx cap open android
```

**Important PATH prefix required for cap commands:**
```bash
export PATH="/usr/local/bin:/bin:/usr/bin:/opt/homebrew/opt/openjdk/bin:/opt/homebrew/bin:$PATH"
```

The build script (`nsmt-app/scripts/build.js`) copies `nsmt-stats.html` → `www/index.html` plus logos, `nsmt-ws-client.js`, and `uploads/`. **Never edit files in `nsmt-app/www/` directly** — they are overwritten on every build.

## Architecture

### WebSocket State Model

The server holds a single in-memory `STATE` object with two top-level keys:
- `bug` — scorebug/overlay data (scores, clock, team colors, logos, sponsor info)
- `stats` — per-player stat objects keyed by player ID

All clients receive a full state snapshot on connect. Updates are sent as partial patches: `{ type: "patch", bug: {...} }` or `{ type: "patch", stats: {...} }`. The server merges patches and broadcasts to all other connected clients.

### Key Files

| File | Role |
|------|------|
| `nsmt-stats.html` | iPad stat tracker — self-contained single-file app (all CSS/JS inline) |
| `nsmt-producer.html` | MBP producer control panel for scorebug |
| `nsmt-overlay.html` | OBS Browser Source overlay (1920×1080, transparent bg) |
| `nsmt-ws-client.js` | Shared WebSocket helper, included by all pages. Exposes `NSMTClient` global |
| `nsmt-server.py` | Python HTTP + WS server |
| `nsmt-server-node.js` | Node.js drop-in replacement |

### nsmt-stats.html Internals

This is the most complex file. It is a single-page app with screen-based navigation (no router). Key patterns:

- **Screen system**: `goTo('screenId')` shows/hides `.screen` divs
- **Game state**: Global `G` object holds all game data (`G.away`, `G.home`, `G.stats`, `G.events`, `G.periodScores`)
- **Native detection**: `window.IS_NATIVE` set synchronously via inline `<script>` before Firebase loads — checks `window.Capacitor.isNativePlatform()`
- **WS sync**: Entire WebSocket block is skipped when `IS_NATIVE`; `syncToWS` becomes a no-op
- **Auth**: Firebase Google sign-in is hidden on native; `onAuthStateChanged` null branch auto-calls `useOfflineMode()` after 50ms on native
- **Stats helpers**: `calcPts(s)`, `getTeamTotals(team)`, `calcPeriodStats(team, period)` (replays `G.events[]` filtered by period)
- **Live tabs**: `setLiveTab(n)` — 0=Log, 1=Box, 2=Leaders, 3=Team, 4=PBP
- **Print/Export on native**: Uses `Capacitor.Plugins.Filesystem.writeFile()` + `Capacitor.Plugins.Share.share()` to write file to CACHE dir and invoke native share sheet

### Capacitor App Notes

- App ID: `com.thensmt.stats`
- iOS minimum deployment target: **15.0** (required by `@capacitor/filesystem`)
- Capacitor version: **8.x** — all `@capacitor/*` packages must stay on v8
- Plugins installed: `@capacitor/filesystem`, `@capacitor/share`
- After any change to `Livestream/nsmt-stats.html`, run `npm run build && npx cap sync ios` from `nsmt-app/`

## Git Workflow

After every meaningful change, commit and push automatically:

```bash
cd /Users/david/Downloads/Claude/NSMT
git add -A
git commit -m "description"
git push
```

- Always use `git push` after committing — do not wait to be asked
- Commit after each logical change (don't batch unrelated changes into one commit)
- Remote: `https://github.com/thensmt/nsmt-livestream` (private, account: thensmt)
- After any `nsmt-stats.html` change, also run `npm run build && npx cap sync ios` from `nsmt-app/` before committing

## Brand / Style

- Colors: `#000000` (black), `#0E80FC` (NSMT blue), `#FFFFFF`
- Logo files in `Livestream/`: `NSMTWordmarkBlue.png`, `NSMTSecondaryLogo.png`, `nsmt-icon.jpg`
- Team logo uploads live in `Livestream/uploads/`
- All image paths in `nsmt-stats.html` must be **relative** (not `/absolute`) — absolute paths fail in Capacitor WKWebView
- Touch targets: 60px+ height for iPad UI elements
- Use `.command` files (not `.sh`) for double-clickable macOS scripts
