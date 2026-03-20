# NSMT Hoopfest 2026 — Change Log

_Last updated: 2026-03-19_

## Summary: 20 bugs fixed, 5 new features, 22 noted for post-event

---

## Bug Fixes (Completed)

| # | Date | Component | Bug | Severity | Fix |
|---|------|-----------|-----|----------|-----|
| 1 | 03-19 | iPad Control | Team fouls not updated on scorebug from operator flow | HIGH | Increment `S[team].fouls` in `logStat()` + push |
| 2 | 03-19 | iPad Control | No tab bar — can't switch Game/3PT/Dunk without preset | HIGH | Added tab bar HTML after topbar |
| 3 | 03-19 | iPad Control | Empty jersey numbers in all roster presets | MEDIUM | Created `jersey-numbers.html` + localStorage merge |
| 4 | 03-19 | Overlay | Hoopfest overlay lacks 3PT/Dunk rendering | HIGH | Switched to `nsmt-combined-overlay.html` |
| 5 | 03-19 | Game State | Stale data from previous event | MEDIUM | Reset `game_state.json` to Hoopfest defaults |
| Q1 | 03-19 | Combined Overlay | **`patch` messages ignored — no real-time updates** | **CRITICAL** | Added `patch` handler + JSON try/catch |
| Q2 | 03-19 | iPad Control | OT doesn't reset fouls or clock | HIGH | Added reset in `endPeriod` OT branch |
| Q3 | 03-19 | iPad Control | Undo breaks team foul count | HIGH | Reset fouls before replay, increment in `replayEvent` |
| Q4 | 03-19 | Combined Overlay | Ticker resets scroll on every state update | HIGH | Cache `_prevTickerJSON`, rebuild only on change |
| Q5 | 03-19 | Combined Overlay | Ticker overlaps elements (CSS var never set) | HIGH | Toggle `body.ticker-visible` class |
| Q6 | 03-19 | Combined Overlay | No JSON error handling on WS messages | HIGH | try/catch (with Q1) |
| Q7 | 03-19 | Start Script | Overlay URL points to wrong file | HIGH | Changed to `nsmt-combined-overlay.html` |
| Q8 | 03-19 | Server | Malformed JSON crashes WS client handler | HIGH | try/except in `ws_handler` |
| Q10 | 03-19 | Combined Overlay | Dunk photo not resolved (broken images) | MEDIUM | Pass through `resolveAsset()` |
| Q11 | 03-19 | Combined Overlay | Spotlight dismiss leaves stale auto-dismiss timer | MEDIUM | `clearTimeout(_spotlightTimer)` on dismiss |
| Q13 | 03-19 | Combined Overlay | Dunk reveal animation doesn't play for new dunker | MEDIUM | Reset `_prevRevealed` on dunker change |
| Q17 | 03-19 | iPad Control | Clock interval can stack (2x speed) | MEDIUM | Clear existing interval in `clockStart()` |
| Q23 | 03-19 | WS Client | Reconnect can stack WebSocket connections | MEDIUM | Close old WS before creating new one |
| Q28 | 03-19 | Game State | Stale `timeoutTeam: "home"` | MEDIUM | Reset to `""` |
| 20 | 03-19 | iPad Control | `showScoreboard` naming mismatch — overlay checks `showScorebug` | HIGH | Fixed to send `showScorebug` |

---

## Known Issues (not blocking Hoopfest)

| # | Component | Bug | Severity | Notes |
|---|-----------|-----|----------|-------|
| Q9 | iPad Control | ~~Producer score changes overwritten by iPad~~ | ~~HIGH~~ | **FIXED** — bi-directional sync with echo guard |
| Q12 | Combined Overlay | Graphic slide-in may not replay on 2nd trigger | MEDIUM | Rare edge case |
| Q14 | Combined Overlay | Lower-third transition broken (display:none) | MEDIUM | Cosmetic — content still shows |
| Q15 | Combined Overlay | Timeout banner relies on server timestamp | MEDIUM | Works if clocks are synced |
| Q16 | Combined Overlay | z-index: spotlight + graphic can overlap | MEDIUM | Avoid triggering both at once |
| Q18 | iPad Control | `applyClock` silently changes `periodLen` | MEDIUM | Don't manually set clock to odd values |
| Q19 | iPad Control | OT doesn't reset timeouts | MEDIUM | Manually reset if needed |
| Q20 | iPad Control | Server can overwrite roster mid-game | MEDIUM | Don't push rosters from producer during game |
| Q21 | iPad Control | `pushBug` called every second (perf) | MEDIUM | Acceptable for iPad hardware |
| Q22 | iPad Control | Undo only pops 1 event (miss+rebound = 2) | MEDIUM | Tap undo twice |
| Q24 | WS Client | Messages dropped during reconnect | MEDIUM | 2s reconnect window |
| Q25 | WS Client | `onMessage` errors silently swallowed | MEDIUM | Check console for issues |
| Q26 | Server | `set_state` can lose keys | MEDIUM | Use `patch` instead |
| Q27 | Server | No upload size limit | MEDIUM | Not exploitable on LAN |
| Q29 | iPad Control | Jersey number `0` skipped | LOW | No player wears #0 |
| Q30-41 | Various | Minor issues (see previous revision) | LOW | Post-event cleanup |

---

## New Features

| # | Date | Component | Feature |
|---|------|-----------|---------|
| 1 | 03-19 | Jersey Numbers | `jersey-numbers.html` — enter numbers for all 50 players, auto-merges into presets |
| 2 | 03-19 | Sync | **Bi-directional stat sync** — iPad and Producer now stay in sync. Stats recorded on iPad update Producer and vice versa. Echo guard (300ms) prevents feedback loops. |
| 3 | 03-19 | Overlay | **Spotlight team-side slide-in** — Away players slide in from left, home players from right. Slides out in the matching direction on dismiss. |
| 4 | 03-19 | Overlay | **Player photos in spotlight** — Spotlight card auto-resolves uploaded photos via `/uploads/players/{name}/photo.jpg` fallback. `onerror` hides photo wrap if image missing. |
| 5 | 03-19 | iPad Control | **Granular overlay toggles** — BUG, TICKER, ADS toggle buttons added. Fixed `showScoreboard` → `showScorebug` naming mismatch (show/hide was broken). |
| 6 | 03-19 | iPad Control | **Auto-hide overlays on tab switch** — Switching to Game tab shows scorebug, switching to 3PT/Dunk hides scorebug and activates the relevant contest overlay. |
| 7 | 03-19 | iPad Control | **2x font scaling** — All text and touch targets doubled for iPad readability. Topbar, modals, buttons, and layout constraints updated to match. |
| 8 | 03-19 | iPad Control | **Removed duplicate nav** — GAME/3PT/DUNK tab bar removed. Added GAME button to preset bar (GAME/NOVA24/3PT/DUNK/PVP). |
| 9 | 03-19 | iPad Control | **Symmetric scoring layout** — Away scoring buttons positioned right (near clock), home buttons positioned left (near clock). |
| 10 | 03-19 | iPad Control | **File renamed** — `ipad-control/index.html` → `ipad-control/ipad-control.html`. All 35+ URL references updated across docs, runbook, and start script. |

---

## Hoopfest Day Checklist

1. Open `jersey-numbers.html` on iPad Safari, enter all jersey numbers, tap **Save**
2. Double-click `Start NSMT.command` on MBP
3. On iPad, open `http://mbp.local:8000/ipad-control/ipad-control.html`
4. In OBS, set browser source to `http://localhost:8000/nsmt-combined-overlay.html`
5. Tap event preset (Nova 24, PVP, 3PT, or Dunk) to load teams
6. Verify overlay shows scorebug with correct teams
7. Test: add a score, verify overlay updates
8. Test: spotlight a player, verify card appears on overlay
9. Set iPad auto-lock to **Never** (Settings > Display & Brightness)
