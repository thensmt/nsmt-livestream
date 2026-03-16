# NSMT Livestream — Claude Reference

## Project Overview
NSMT (Nova Sports Media Team) live basketball broadcast system.
Three-interface system: Producer (MBP) + iPad stat tracker + OBS overlay.

**Next event:** Hoopfest — 2026-03-22 (first major live test)
**Crew:** Two people. iPad is primary controller; MBP producer is backup.

---

## How to Run

### Start the server
Double-click `Start NSMT.command` — kills old processes, starts Python server, opens producer in browser.

Or manually:
```bash
cd /Users/david/Downloads/Claude/NSMT/Livestream
python3 nsmt-server.py
```

Node.js alternative (run `npm install ws` once first):
```bash
node nsmt-server-node.js
```

### URLs
| Interface | URL |
|-----------|-----|
| Producer (MBP) | `http://localhost:8000/nsmt-producer.html` |
| OBS Browser Source | `http://localhost:8000/nsmt_fox_overlay_ws.html` |
| iPad stats | `http://<local_ip>:8000/nsmt-stats.html` |

### OBS Setup
- Browser Source: `http://localhost:8000/nsmt_fox_overlay_ws.html`
- Size: 1920×1080, transparent background checked
- If changes don't appear: right-click source → Refresh Cache

### Firebase Deploy (stats.thensmt.com)
```bash
firebase deploy
```

---

## Architecture & Data Flow

```
iPad (nsmt-stats.html) ─────┐
                             ├── WebSocket :8765 ── nsmt-server.py ── OBS overlay
MBP (nsmt-producer.html) ───┘
         HTTP :8000 serves static files + /list-logos + /upload
```

- `patch({section: {...}})` = shallow merge into a STATE section
- `set_state` = full replace of a section
- STATE sections: `bug` (scorebug), `ticker` (scrolling results), `stats` (players/teams)
- Firebase Firestore = cloud persistence for **player stats only** (requires Google Auth)
- Everything else (scores, clock, timeouts, fouls, spotlight) is local WebSocket only

---

## Key Files

| File | Role |
|------|------|
| `nsmt-server.py` | Primary server (HTTP + WebSocket hub) |
| `nsmt-server-node.js` | Node.js drop-in alternative |
| `nsmt-ws-client.js` | Shared WS client (auto-reconnect; included by all pages) |
| `nsmt-producer.html` | Producer control panel (MBP) |
| `nsmt-stats.html` | iPad stat tracker (PWA, Firebase sync) |
| `nsmt_fox_overlay_ws.html` | OBS scorebug overlay (FOX-style, 1920×1080) |
| `nsmt-overlay.html` | Legacy/alternate overlay |
| `Start NSMT.command` | macOS launcher |
| `uploads/` | 150+ team logo files served by `/list-logos` |

---

## State Structure

### `bug` section (scorebug + overlay controls)
```js
patch({ bug: {
  homeName, awayName,              // team names
  homeCode, awayCode,              // short codes (e.g. "SCH")
  homeScore, awayScore,            // integer scores
  homeLogo, awayLogo,              // logo URLs (e.g. "uploads/team.png")
  homeRecord, awayRecord,          // "12-3" strings
  homePrimary, awayPrimary,        // hex team colors
  homeSecondary, awaySecondary,
  homeText, awayText,
  homeTOs, awayTOs,                // timeouts remaining (0–5)
  homeFouls, awayFouls,            // team fouls (integer)
  quarter,                         // "1st", "2nd", "3rd", "4th", "OT"
  clock,                           // "12:00" string
  clockRunning,                    // bool — overlay runs its own clock when true
  showScorebug,                    // bool — show/hide the scorebug
  showStats,                       // bool — show/hide stats table overlay
  sponsorLabel, sponsorShow,       // event bar text + visibility
  graphic,                         // broadcast graphic object {type, title, ...}

  // Player spotlight card (new)
  spotlight: {
    active: bool,
    playerName: "",
    playerNum: "",
    playerPhoto: "",    // e.g. "uploads/player_23_away.jpg"
    teamName: "",
    teamColor: "#0E80FC",
    stats: { pts, reb, ast, stl, blk },
    dismissAfter: 8000  // ms; 0 = manual dismiss only
  }
}})
```

### `stats` section (player/team stats)
```js
patch({ stats: {
  away: { name, fouls, players: [...] },
  home: { name, fouls, players: [...] }
}})
```

### Player object
```js
{
  id, num, name, pos, photo,       // identity + headshot URL
  fgm, fga, t3m, t3a, ftm, fta,   // shooting
  off, def,                         // rebounds (off+def = total)
  ast, stl, blk, to, pf, pts
}
```
Points = `(fgm - t3m)*2 + t3m*3 + ftm` (also stored as `pts`)
Rebounds = `off + def`

---

## Player Spotlight Feature

Full player card popup on the OBS overlay. Shows: headshot photo, name/number, team, live stat line.

### Trigger methods
| From | How |
|------|-----|
| Producer | Spotlight button (★) on each player card in the Broadcast → Stats tab |
| iPad | Spotlight button (★) on each player button in the stat tracker |
| Auto (producer) | Fires when a player crosses 10, 15, 20, 25, or 30 pts milestone |
| Dismiss | "Dismiss Spotlight" button on producer or iPad, or auto-dismiss timer |

### Player photos
- Pre-upload headshots to `uploads/` before the game
- Naming convention: `player_<num>_<teamcode>.jpg` (e.g. `player_23_away.jpg`)
- Set photo URL per player in the Stats tab player detail panel

### Milestone thresholds
Defined in `SPOTLIGHT_MILESTONES` constant in `nsmt-producer.html`:
```js
const SPOTLIGHT_MILESTONES = [10, 15, 20, 25, 30];
```

---

## Brand & Style

- **Colors:** Black `#000000` · NSMT Blue `#0E80FC` · White `#FFFFFF`
- **Producer accent:** Gold `#F5C518`
- **Overlay fonts:** Rubik, Anton
- **Producer fonts:** Bebas Neue, Barlow Condensed, Barlow
- **iPad UI:** Touch-optimized — 60px+ button heights, finger-friendly targets

---

## Coding Conventions

- Use `.command` files for macOS scripts (`.sh` opens in text editor instead of running)
- All new pages must include `<script src="nsmt-ws-client.js"></script>`
- No external CDN dependencies for anything running inside OBS
- Touch targets 60px+ on any iPad-facing UI
- State updates: use `patch()` for partial updates, `set_state` only when replacing entirely
- iPad connects via local IP, not localhost — server always binds `0.0.0.0`

---

## Known Gotchas

- **OBS caches aggressively** — right-click Browser Source → "Refresh cache of current page" when overlay changes don't show
- **iPad local IP** — iPad must use `http://<MBP_local_ip>:8000/...`, not localhost
- **Firebase** — requires Google Sign-In; offline mode falls back to local-only (no cloud save)
- **Stats table** — shown/hidden via `bug.showStats` (bool), not a separate state section
- **Clock** — overlay runs its own countdown when `bug.clockRunning` is true; send `bug.clock` string to sync/reset

---

## Active Improvements Backlog

- [ ] **Player spotlight** — Full card popup w/ photo + stats (overlay, producer, iPad) — Hoopfest 2026-03-22
- [ ] **iPad: score/clock/timeout/foul controls** — iPad should be primary game controller
- [ ] **End-to-end live test** — iPad → WS → overlay sync for all game data before Hoopfest

---

## Git & GitHub

- **Repo:** `https://github.com/thensmt/nsmt-livestream` (private, account: thensmt)
- **Working directory:** `/Users/david/Downloads/Claude/NSMT/`
- Auto-commit and push after every meaningful change
