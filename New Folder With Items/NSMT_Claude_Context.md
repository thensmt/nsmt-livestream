# NSMT Live Producer Platform — Full Project Context
*For use with Claude Code (VS Code Extension)*
*Last updated: March 2026*

---

## Who I Am

**David** — founder and operator of **Nova Sports Media Team (NSMT)**, a DMV-based sports media business at **thensmt.com**. We produce live sports broadcast content (primarily high school basketball and football), social media/YouTube content, and events. Our flagship event is **Hoopfest** — a high school senior all-star basketball showcase held at The St. James in Springfield, VA.

My colleagues on event/production work: **Will** and **Donovan**.

---

## What We Built in This Session

We built a complete **two-file live broadcast platform** for NSMT. All files are HTML/CSS/JS — no build tools, no frameworks, just open in Chrome.

---

## File Index

| File | Purpose | Status |
|------|---------|--------|
| `nsmt-producer-v2.html` | **PRIMARY** — All-in-one broadcast control center | ✅ Current |
| `nsmt-overlay-v2.html` | **PRIMARY** — 1920×1080 OBS browser source overlay | ✅ Current |
| `nsmt-live-producer.html` | v1 producer — superseded by v2 | Legacy |
| `nsmt-broadcast-overlay.html` | v1 overlay — superseded by v2 | Legacy |
| `nsmt-obs-overlay.html` | Earlier overlay with score pop cards | Legacy |
| `nsmt-photo-manager.html` | Admin tool for player photo management | Active |
| `NSMT_Stats_v3.html` | Standalone stat-keeping PWA | Active |
| `NSMT_Operator_SOP.html` | Standard operating procedure doc for game day | Active |

**The two files to keep developing are `nsmt-producer-v2.html` and `nsmt-overlay-v2.html`.**

---

## Architecture Overview

```
nsmt-producer-v2.html          nsmt-overlay-v2.html
(Producer's laptop/tablet)  →  (OBS Browser Source, 1920×1080)
         |                              |
         └──────── Firebase ────────────┘
                  Firestore
               overlay/active doc
```

- The **Producer** controls everything from one HTML file
- All state is written to Firebase Firestore, document path: `overlay/active`
- The **Overlay** listens to that document in real-time and renders graphics
- No server needed — pure client-side Firebase SDK

---

## NSMT Live Producer v2 — Tab Structure

### Tab 1: Game Setup
- Event name, venue, date, time
- Format selector: 4 Quarters or 2 Halves, period length in minutes
- **Away Team**: name, 3-4 char code, logo URL field, logo file upload (PNG/JPG), load saved roster dropdown
- **Home Team**: same fields
- Firebase config: API Key, Project ID, Auth Domain, App ID (saved to localStorage)
- **Go Live** button — initializes game state and pushes to Firebase

### Tab 2: Rosters
- Sidebar list of all saved rosters (stored in localStorage)
- Create new roster, delete roster, search/filter
- Roster editor: player table with number, name, position columns
- **CSV import**: format is `Number, Name, Position` one row per player, header optional
- Manual add/remove players
- Save button — data persists across sessions
- Rosters can be assigned to Away or Home team in Game Setup tab

### Tab 3: Broadcast (Main control during game)
**Left column — Score & Clock:**
- Live scoreboard widget showing both teams, scores, period badge
- Score adjust buttons: +3, +2, +1, −1 per team
- Click score to override (manual correction modal)
- Game clock: large display, Start/Pause/Reset buttons, manual time set input
- Clock runs locally, syncs to Firebase every 5 seconds
- Period pills: Q1–Q4 (or H1–H2), +OT button, End Period button
- End Period auto-advances, resets team fouls, resets clock
- Timeout tracker: 4 dots per team, "USE ▸" button decrements and fires graphic
- Reset Timeouts button

**Center column — Broadcast Actions (fires overlays):**
- Away Timeout / Home Timeout → opens modal (type selector) → fires timeout graphic + pauses clock
- Substitution → team selector + player grid (IN/OUT) → fires sub graphic
- Personal Foul → team selector + player grid → increments foul count, fires foul graphic
- Halftime, Final, Media Timeout, Officials Timeout → fire special graphics
- Foul Trouble Panel — auto-populates players with 4+ fouls

**Right column — Event Log:**
- Timestamped log of every action (score, clock, foul, broadcast, timeout)
- Color-coded by type: broadcast (blue), game (green), warn (orange)
- Clear button

### Tab 4: Score Ticker
- Add games: away team, home team, away score, home score, period, status (Live/Final/Upcoming)
- Update scores in real time — auto-pushes to stream
- Delete games
- Ticker preview
- Settings: scroll speed (Slow/Normal/Fast), separator character
- Toggle to show/hide ticker on stream
- Push Ticker button

### Tab 5: Overlay & Ads
- **NSMT Branding Logo**: URL field or file upload → pushes to scorebug brand block on stream
- **Overlay Visibility Toggles**: Scorebug, Clock, Score Pop Cards, Event Feed, Score Ticker, Ad Zones
- **Sponsor Ad Zones — 4 Corners**: upload PNG/JPG or paste URL per corner (Top Left, Top Right, Bottom Left, Bottom Right)
  - Recommended size: 300×250px, transparent background
  - These are sellable digital ad inventory
  - Push Ads button
  - Clear All button
- **Graphic Duration Controls**:
  - Timeout / Foul / Sub: default **5 seconds**
  - Score Pop Card: default 4.5 seconds
  - Halftime / Final: default 8 seconds

---

## NSMT Broadcast Overlay v2 — Elements

### Scorebug (bottom, centered)
- ESPN/CBS style — compact, not full-width
- Structure: `[NSMT logo] | [Logo ○] [CODE] [Score+pips] | [Period] [Clock] | [Score+pips] [CODE] [Logo ○]`
- NSMT brand block: red background, swaps to uploaded logo image
- Team logo circles: 30px, round, shows fallback letter until logo URL is set
- Score flashes gold when updated
- Timeout pips: 4 gold dots per team, dims when used
- Foul pips: 6 small dots per team, orange when fouls accumulated
- Period pill + clock in separate gray rounded boxes (matching ESPN reference)
- Slides up from bottom on Go Live, slides down on hide

### Score Ticker (very bottom, below scorebug)
- Full-width bar, dark background
- Gold "SCORES" label on left edge
- Seamlessly looping scrolling text
- Shows: `TEAM1 XX – XX TEAM2 (STATUS)` with gold separators
- Speed-controlled (Slow/Normal/Fast)
- Slides up with scorebug on Go Live

### Score Pop Card (bottom left, above scorebug)
- Fires when a score event is logged
- Shows: player photo (from Google Drive photo map), jersey number, first/last name, game total, +pts
- Gold topbar with event type (FIELD GOAL / 3-POINTER / FREE THROW) and team code
- Progress drain bar below card
- Disappears after configurable duration (default 4.5s)

### Timeout Graphic (center, above scorebug)
- Wide banner: team name, timeout type, period/clock, timeouts remaining
- Gold top border
- **Disappears after 5 seconds** (configurable from producer)

### Substitution Graphic (bottom left, above scorebug)
- Cyan accent, shows player IN (#number + name) and player OUT
- Disappears after 5 seconds

### Foul Graphic (bottom left, above scorebug)
- Orange accent, player number + name, foul count pips (orange → red at 4+)
- "FOUL TROUBLE" badge if 4+ fouls
- Disappears after 5 seconds

### Special Graphics (center, large)
- Types: HALFTIME, FINAL, MEDIA TIMEOUT, OFFICIALS TIMEOUT, any period/OT label
- Shows current score for HALFTIME/FINAL
- Disappears after 8 seconds

### Foul Trouble Badges (top right, persistent)
- Stacks up to 4 players
- Shows: #number, last name, foul count
- Persists until game reset

### Ad Zones (4 corners)
- Top Left, Top Right, Bottom Left, Bottom Right
- 280×160px each
- Fade in when image loaded, transparent when empty
- Positioned to not overlap scorebug/ticker

---

## Firebase Data Structure

Document path: `overlay/active`

```javascript
{
  // Teams
  awayName, awayCode, awayScore, awayFouls, awayTimeouts, awayLogoUrl,
  homeName, homeCode, homeScore, homeFouls, homeTimeouts, homeLogoUrl,

  // Game state
  period,         // "Q1", "Q2", "H1", "OT1", etc.
  periodNum,      // integer
  eventName,      // "WCAC Championship"

  // Clock
  clockDisplay,   // "4:32"
  clockRunning,   // boolean
  clockSecs,      // integer seconds

  // Visibility flags
  showScorebug, showClock, showPops, showFeed, showTicker, showAds,

  // Branding
  nsmtLogo,       // base64 data URL or https URL

  // Ad zones
  adZones: { tl, tr, bl, br },  // base64 or URL per zone

  // Ticker
  tickerGames: [{ away, home, awayScore, homeScore, period, status }],
  tickerSpeed,    // "slow" | "normal" | "fast"
  tickerSep,      // separator string

  // Graphic durations (ms)
  durations: { graphic, pop, special },

  // Graphic trigger — overlay fires on updatedAt change
  graphic: {
    type: "TIMEOUT" | "SUBSTITUTION" | "FOUL" | "HALFTIME" | "END OF GAME" | ...,
    // TIMEOUT:      teamName, teamCode, timeoutType, timeoutsLeft, clockAt, period
    // SUBSTITUTION: team, teamCode, teamName, playerIn{id,num,name}, playerOut{id,num,name}
    // FOUL:         team, teamCode, player{id,num,name,fouls}, teamFouls, inTrouble
    // SPECIAL:      awayCode, homeCode, awayScore, homeScore, event
  },

  lastEvent: { evt, result, team, pid, playerName, playerNum, pts, ptsGame },
  lastScoreEvent: { team, pts, score },

  updatedAt: timestamp  // changes every push — overlay uses this to detect new graphics
}
```

---

## Roster localStorage Schema

Key: `nsmt_rosters`  
Value: JSON array

```javascript
[
  {
    id: "r_1234567890",
    name: "St. John's 2025",
    players: [
      { id: "p_abc123", num: "11", name: "Jymin Veney", pos: "PG", fouls: 0 },
      { id: "p_def456", num: "21", name: "Jordan Taylor", pos: "SG", fouls: 0 },
      // ...
    ]
  }
]
```

CSV Import format:
```
11, Jymin Veney, PG
21, Jordan Taylor, SG
23, Brian Mitchell Jr, SF
```

---

## OBS Setup Instructions

1. Open OBS → Add Scene for your game
2. Add your video sources (cameras)
3. Add **Browser Source**:
   - URL: `file:///path/to/nsmt-overlay-v2.html`
   - Width: `1920`
   - Height: `1080`
   - ✅ Transparent background (check "Shutdown source when not visible")
4. Place the Browser Source at the **TOP** of your sources list in the scene
5. On a second monitor/device, open `nsmt-producer-v2.html` in Chrome
6. Go to Game Setup tab → fill in teams → Connect Firebase → Go Live

---

## Key Design Decisions & Preferences

- **Scorebug style**: ESPN/CBS compact centered bug (not full 1920px wide) — matched from reference image
- **Graphic duration**: 5 seconds for timeout/foul/sub (not the original 8s)
- **Ticker position**: Very bottom of screen, below scorebug
- **Ad zones**: 4 corners, 280×160px, transparent unless loaded
- **Rosters**: Saved in localStorage — persist across sessions, no server needed
- **Logo handling**: URL field + file upload (converted to base64) — works offline
- **Everything managed from one HTML file** — no tabs to other tools
- **Firebase**: Same project as NSMT Stats app can be used
- **Workflow preference**: Iterative refinement, targeted edits — not wholesale rewrites

---

## Tech Stack

- Pure HTML/CSS/JavaScript — no build tools, no npm
- Firebase SDK v10 (loaded via CDN) — Firestore realtime listener
- Google Fonts: Bebas Neue (display), Barlow Condensed (UI headers), Barlow (body)
- localStorage for roster persistence
- FileReader API for logo/ad image uploads → base64
- CSS animations for all graphic transitions
- Web Audio API not used — no sounds

---

## Production Gear Context

- Camera: **Sony FX3** (S-Log3/S-Gamut3.Cine PP9 for HDR workflows)
- Stream encoder: **YoloBox Extreme** (RTMP)
- Post-production: **Adobe Premiere Pro** (auto-captions, SRT export)
- Stream platform: Custom NSMT Live (OBS → RTMP)

---

## NSMT Stats PWA (Separate App)

`NSMT_Stats_v3.html` — standalone stat-keeping app:
- Firebase + Google Auth + cloud sync + offline mode
- Roster management, PDF box score export (LegitGM-style)
- Target market: Made Hoops (DMV grassroots basketball)
- Competitor: LegitGM
- Two user modes planned: NSMT Stat-Keepers (full) and Coach Mode (team-specific)
- Can write to same Firebase game as the overlay for score pop integration

---

## Hoopfest Event Context

- **Date**: March 22 at The St. James, Springfield, VA
- All-star games + dunk contest + 3-point contest
- Sponsorship tiers: Presenting $5K, Platinum $2.5K, Gold $1K, Silver $500
- Target sponsors: Chipotle, Gatorade, Navy Federal + local Springfield businesses
- Active workstreams: Meta ad campaigns, MailChimp email outreach, merchandise ($30 uniform pricing on Printful)

---

## Content Focus

- Primary content: DMV high school basketball
- Notable ongoing coverage: **Paul VI Catholic** (#1 nationally ranked), **Jordan Smith Jr.** (top recruit, 6-school final list: Duke, Kentucky, Arkansas, Georgetown, Indiana, NC State)
- Social platforms: YouTube, Instagram, Twitter/X
- Stat graphics and YouTube metadata produced for high-profile local games
- All graphics include credit lines for **Claude AI** and **Hudl** alongside NSMT branding
- Goal: pursue partnerships with both companies

---

## What to Build Next (Backlog)

- [ ] Wire NSMT Stats v3 to push score events to overlay `lastEvent` field so stat-keeper can trigger score pop cards automatically
- [ ] Add player photo URL map in Producer (pid → Google Drive thumbnail URL) for score pop card headshots
- [ ] Test full three-app workflow: Stats + Producer + OBS Overlay simultaneously
- [ ] Coach Mode for NSMT Stats (team-specific, customizable stat selection)
- [ ] PDF box score export in LegitGM style
- [ ] Google Sheets roster sync
- [ ] Paid subscription tier for NSMT Stats
- [ ] Football stat support in NSMT Stats (basketball is phase 1)
