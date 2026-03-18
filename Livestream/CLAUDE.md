# NSMT Livestream — Claude Reference

## Project Overview
NSMT (Nova Sports Media Team) live basketball broadcast system.
Three-interface system: Producer (MBP) + iPad primary controller + OBS overlay.

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
| Producer (MBP) | `http://mbp.local:8000/nsmt-producer.html` |
| OBS Browser Source | `http://mbp.local:8000/nsmt_hoopfest_overlay.html` |
| **iPad Game Controller** | `http://MBP.local:8000/ipad-control/` |
| iPad stat tracker | `http://MBP.local:8000/nsmt-stats.html` |

The iPad controller (`ipad-control/`) is a combined page with two tabs:
- **GAME tab** — scores, clock, periods, timeouts, fouls
- **STATS tab** — player stat entry (tap player → stat detail panel)

### OBS Setup
- Browser Source: `http://mbp.local:8000/nsmt_hoopfest_overlay.html`
- Size: 1920×1080, transparent background checked
- If changes don't appear: right-click source → Refresh Cache

### Firebase Deploy (stats.thensmt.com)
```bash
firebase deploy
```

---

## Architecture & Data Flow

```
iPad (ipad-control/)  ──────┐
                              ├── WebSocket :8765 ── nsmt-server.py ── OBS overlay
MBP (nsmt-producer.html) ───┘
         HTTP :8000 serves static files + /list-logos + /upload + /list-player-photos
```

- `patch({section: {...}})` = shallow merge into a STATE section
- `set_state` = full replace of a section
- STATE sections: `bug` (scorebug), `ticker` (scrolling results), `stats` (players/teams)
- Server writes `game_state.json` on every change (debounced 500ms) — survives server restart
- iPad saves to `localStorage` on every change — survives page refresh
- Firebase Firestore = cloud persistence for **player stats only** (requires Google Auth)

---

## Key Files

| File | Role |
|------|------|
| `nsmt-server.py` | Primary server (HTTP + WebSocket hub) |
| `nsmt-server-node.js` | Node.js drop-in alternative |
| `nsmt-ws-client.js` | Shared WS client (auto-reconnect; included by all pages) |
| `nsmt-producer.html` | Producer control panel (MBP) |
| `ipad-control/index.html` | **iPad primary controller** — GAME + STATS tabs combined |
| `nsmt-stats.html` | Legacy iPad stat tracker (PWA, Firebase sync) |
| `nsmt_hoopfest_overlay.html` | OBS scorebug overlay (FOX-style, 1920×1080) |
| `Start NSMT.command` | macOS launcher |
| `uploads/` | Team logos + player photos served by `/list-logos` |
| `uploads/players/<Name>/` | Per-player photo folders — drop any image in, server finds it |
| `game_state.json` | Auto-written server-side state persistence (do not edit manually) |

### Special event pages (Phase 4B/4C — in progress)
| File | Role |
|------|------|
| `3pt-overlay.html` | OBS source for 3-point contest (split screen) |
| `3pt-control/index.html` | iPad scorer per court (`?court=1` or `?court=2`) |
| `dunk-overlay.html` | OBS source for dunk contest |
| `dunk-control/index.html` | Head table controller |
| `dunk-judge/index.html` | Individual judge page (`?judge=1` through `?judge=5`) |

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

  // All-star event mode
  allStarEvent: "",                // "nova24" | "pvp" | "" (regular game)
  showIntro: false,                // bool — shows full-screen intro card on overlay

  // Player spotlight card
  spotlight: {
    active: bool,
    playerName: "",
    playerNum: "",
    playerPhoto: "",    // e.g. "uploads/players/James Miller/photo.jpg"
    teamName: "",
    teamColor: "#0E80FC",
    stats: { pts, reb, ast, stl, blk },
    dismissAfter: 8000  // ms; 0 = manual dismiss only
  },

  // 3-point contest (Phase 4B)
  threePoint: {
    court1: { shooter, racks: [[bool×5]×5], moneyRack: 0 },
    court2: { shooter, racks: [[bool×5]×5], moneyRack: 0 }
  },

  // Dunk contest (Phase 4C)
  dunk: {
    dunker, dunkerPhoto, round, attempt,
    scores: [null,null,null,null,null],   // per judge (1–10 or null)
    revealed: [false,false,false,false,false]
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

## Player Photos

### Workflow
1. Before the game, create a folder: `uploads/players/<Full Player Name>/`
   - e.g. `uploads/players/James Miller/`
2. Drop any image into that folder (any filename, any supported format)
3. In the Producer → Rosters tab, click the 📷 button next to a player
4. The photo picker modal calls `/list-player-photos` and shows all available photos
5. Click to assign — URL saved to `p.photo` in the roster record

### Server endpoints
- `GET /list-player-photos` — returns `{ "Player Name": "/uploads/players/Name/file.jpg" }`
- `POST /upload?folder=players/James Miller` — uploads directly into that player's folder
- `GET /list-logos` — flat list of all logos in root + `uploads/` (team logos, not players)

### Photo naming
- Folder: `uploads/players/<Full Player Name>/` (spaces OK)
- File inside: any image — server picks the first one it finds alphabetically
- Supported formats: `.png`, `.jpg`, `.jpeg`, `.svg`, `.gif`, `.webp`

---

## Player Spotlight Feature

Full player card popup on the OBS overlay. Shows: headshot photo, name/number, team, live stat line.

### Trigger methods
| From | How |
|------|-----|
| Producer | Spotlight button (★) on each player card in the Broadcast → Stats tab |
| iPad | Spotlight button (★) on each player in the STATS tab |
| Auto (producer) | Fires when a player crosses 10, 15, 20, 25, or 30 pts milestone |
| Dismiss | "Dismiss Spotlight" button on producer or iPad, or auto-dismiss timer |

### Milestone thresholds
Defined in `SPOTLIGHT_MILESTONES` constant in `nsmt-producer.html`:
```js
const SPOTLIGHT_MILESTONES = [10, 15, 20, 25, 30];
```

---

## All-Star Game Mode

### Events supported
| Key | Event Name | Accent Color |
|-----|-----------|--------------|
| `"nova24"` | Nova 24 | NSMT Blue `#0E80FC` |
| `"pvp"` | Public vs Private | Gold `#F5C518` |
| `""` | Regular game | (no intro overlay) |

### Controls (Producer → Broadcast → All-Star Mode card)
- **Event type buttons** — Regular / Nova 24 / Public vs Private
- **▶ Show Intro** — fires full-screen intro card on overlay
- **✕ Dismiss** — hides intro card

### State fields
```js
patch({ bug: { allStarEvent: "nova24", showIntro: true } })
```

---

## State Persistence

### Server-side (survives server restart)
- Every `patch` or `set_state` triggers a debounced write to `game_state.json`
- On server startup, `game_state.json` is merged back into STATE
- File lives in the Livestream root — do not delete mid-game

### iPad-side (survives page refresh)
- `localStorage['nsmt_ipad_state']` — game state (scores, clock, TOs, fouls, period)
- `localStorage['nsmt_ipad_stats']` — player stats
- On page load, both are restored and immediately pushed to server
- **Reset Game** button clears both keys and zeroes all state (use between games)

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
- iPad connects via Bonjour hostname `MBP.local` — works on any local network, no IP lookup needed
- IP fallback: run `ipconfig getifaddr en0` on MBP if `.local` doesn't resolve
- Special event pages use URL params: `?court=1`, `?judge=N`
- All special event overlays use the same WebSocket infrastructure as the main scorebug

---

## Known Gotchas

- **OBS caches aggressively** — right-click Browser Source → "Refresh cache of current page" when overlay changes don't show
- **iPad local IP** — iPad must use `http://MBP.local:8000/...` (Bonjour), or the MBP's IP if mDNS is blocked
- **Firebase** — requires Google Sign-In; offline mode falls back to local-only (no cloud save)
- **Stats table** — shown/hidden via `bug.showStats` (bool), not a separate state section
- **Clock** — overlay runs its own countdown when `bug.clockRunning` is true; send `bug.clock` string to sync/reset
- **Player photos** — folder name must exactly match the player name as entered in the roster

---

## Active Improvements Backlog

- [x] **Server-side state persistence** — `game_state.json` written on every change
- [x] **iPad localStorage persistence** — survives refresh, pushes to server on reconnect
- [x] **Player spotlight card** — photo + stats popup on overlay; auto-fires at point milestones
- [x] **Combined iPad controller** — GAME + STATS tabs in one page (`ipad-control/`)
- [x] **Player photo directories** — `uploads/players/<Name>/`, photo picker in Rosters tab
- [x] **All-star intro overlay** — full-screen event card (Nova 24, Public vs Private)
- [ ] **3-point contest overlay + control** — split screen, 2 courts, ball-by-ball entry
- [ ] **Dunk contest overlay + control** — 5 judges, score reveal animation
- [ ] **Operator Guide** — printable run-of-show for all events + troubleshooting
- [ ] **End-to-end live test** — iPad → WS → overlay sync for all game data before Hoopfest

---

## Git & GitHub

- **Repo:** `https://github.com/thensmt/nsmt-livestream` (private, account: thensmt)
- **Working directory:** `/Users/david/Downloads/Claude/NSMT/`
- Auto-commit and push after every meaningful change
