# NSMT Broadcast Runbook
### Step-by-step production walkthrough — Hoopfest 2026 & Special Events

> **This is the follow-along checklist for game day.**
> For URL tables, rosters, and troubleshooting, see `OPERATOR_GUIDE.md`.

---

## THE DAY BEFORE

- [ ] Upload player photos: drag each photo into `uploads/players/<Player Name>/` (one folder per player)
- [ ] Open Producer → **Rosters** tab → assign photos to players (📷 button next to each player)
- [ ] Verify rosters are complete (correct numbers, names, spelling)
- [ ] Double-click `Start NSMT.command` at home — confirm server starts and producer opens
- [ ] Open `http://localhost:8000/nsmt_fox_overlay_ws.html` in a browser — confirm scorebug loads
- [ ] Close server when done testing
- [ ] Charge MBP fully
- [ ] Charge all iPad/tablet devices that will be used

---

## VENUE ARRIVAL

### 1. Network
1. Connect MBP to venue WiFi (or start personal hotspot on phone — more reliable)
2. Open Terminal and run: `ipconfig getifaddr en0`
3. Write down the IP address — you'll need it if `MBP.local` doesn't work on iPad

### 2. Start the Server
1. Open the `Livestream` folder on the Desktop/Downloads
2. Double-click **`Start NSMT.command`**
3. A terminal window opens — **do not close it** for the entire event
4. The producer control panel opens automatically in Chrome/Safari
5. Check the top-right of the producer: confirm the green **WS** badge is showing

### 3. OBS — Add Browser Sources
1. Open OBS
2. In your main game scene, add a **Browser Source**:
   - URL: `http://localhost:8000/nsmt_fox_overlay_ws.html`
   - Width: `1920` Height: `1080`
   - Transparent background: ✓ checked
   - Shutdown when not visible: ✗ OFF
   - Refresh on scene activation: ✗ OFF
3. Confirm the scorebug appears in OBS preview (even if just placeholder data)
4. **If this is a 3-Point Contest event:** add a second Browser Source
   - URL: `http://localhost:8000/3pt-overlay.html`
   - Same 1920×1080 transparent settings
   - Add it to your 3PT scene (not the main game scene)
5. **If this is a Dunk Contest event:** add a third Browser Source
   - URL: `http://localhost:8000/dunk-overlay.html`
   - Same settings
   - Add it to your Dunk scene

---

## GAME SETUP (Producer — Tab 1)

Run this wizard for every game, including between games on a multi-game day.

### Step 1: Game Info
- **Event Name** — e.g. "Hoopfest 2026" or "WCAC Championship"
- **Venue** — optional, for your records
- **# of Periods** — typically 4 (quarters) or 2 (halves)
- **Period Length** — typically 8 minutes
- **Sponsor Label** — text shown in event bar (optional)

### Step 2: Away Team
- **Team Name** — full name (e.g. "Westfield Bulldogs")
- **Code** — 3–4 chars shown on scorebug (e.g. "WST")
- **Logo** — upload or paste URL
- **Colors** — primary, secondary, text, accent (use team's brand colors)
- **Roster** — select from dropdown (pre-loaded rosters appear here)

### Step 3: Home Team
Same fields as Away.

### Step 4: Review & Start
- Review both teams
- Tap **▶ Start Broadcast**
- ✓ Scorebug in OBS updates with team names, logos, colors, and 0–0 score

---

## CONNECTING THE iPAD(S)

### Primary device (game control + all tabs)
1. Open browser on iPad
2. Go to: `http://MBP.local:8000/ipad-control/`
   - If that doesn't load, use the IP: `http://192.168.x.x:8000/ipad-control/`
3. Wait for the **green dot** in the top-right corner
4. Tap STATS tab → confirm both team rosters show player grids

### 3-Point Contest — Second device (Court 2 only)
- Open: `http://MBP.local:8000/ipad-control/?court=2`
- The 3PT tab opens automatically with Court 2 selected
- No other setup needed

### Dunk Contest — Judge devices (one per judge)
- Judge 1: `http://MBP.local:8000/ipad-control/?judge=1`
- Judge 2: `http://MBP.local:8000/ipad-control/?judge=2`
- Judge 3: `http://MBP.local:8000/ipad-control/?judge=3`
- Judge 4: `http://MBP.local:8000/ipad-control/?judge=4`
- Judge 5: `http://MBP.local:8000/ipad-control/?judge=5`
- (If a judge opens without `?judge=N`, they'll be asked "Which judge are you?" on screen)

---

## ALL-STAR GAME INTRO (Nova 24 / Public vs Private)

Do this immediately before tip-off for All-Star events.

1. iPad → tap **★ All-Star** tab
2. Tap the event button: **Nova 24** or **Public vs Private**
   - The button highlights to confirm selection
3. When the players are on the court and you're ready for tip-off:
   - Tap **▶ Show Intro**
   - The overlay shows a full-screen intro card (event name, team matchup, accent color)
4. When the ref is about to throw the ball up:
   - Tap **✕ Dismiss**
   - Overlay fades out, scorebug goes live

---

## RUNNING THE GAME

### Scoring
**iPad → GAME tab**

All scoring happens on the GAME tab. Away team is on the left, Home on the right.

| Action | Button |
|--------|--------|
| Score a 3-pointer | Tap **+3** on that team's side |
| Score a 2-pointer | Tap **+2** |
| Score a free throw | Tap **+1** |
| Undo a point | Tap **−1** |
| Override score manually | Tap the score number → type new value → Apply |

The scorebug updates in OBS instantly on every tap.

### Clock
| Action | Button |
|--------|--------|
| Start clock | Tap **▶ Play** |
| Stop clock | Tap **⏸ Pause** |
| Reset to full period | Tap **↺ Reset** |
| Set specific time | Tap the clock display → type MM:SS → Set & Stop |

### Periods
- Tap period pills (**Q1**, **Q2**, **H2**, **OT1**, etc.) to jump to any period
- Tap **End Period ▸** to advance to the next period
- Tap **+OT** to add an overtime period

### Timeouts
1. Tap **⏱ Use Timeout** on the correct team's side
2. The timeout dot is consumed and the **TIMEOUT graphic** fires automatically on stream
3. The graphic shows: team name, timeout type, remaining timeouts
4. To manually reset timeouts: tap **Reset TOs**

### Fouls
| Action | Where |
|--------|-------|
| Add a team foul | iPad GAME tab → tap **Foul +** on the team's side |
| Remove a foul (mistake) | iPad GAME tab → tap **Foul −** |
| Fire a PERSONAL FOUL graphic | MBP Producer → Broadcast tab → **Foul** button → select player → Fire Graphic |

> When a player reaches foul trouble (5 fouls), a ⚠️ FOUL TROUBLE warning appears in the graphic automatically.

### Substitutions
1. MBP Producer → Broadcast tab → **Substitution** button
2. Modal opens:
   - Pick team (Away or Home)
   - Select player going **IN**
   - Select player going **OUT**
3. Click **🎬 Fire Graphic**
4. SUBSTITUTION graphic shows on stream for 5 seconds

---

## LIVE STAT TRACKING

**iPad → STATS tab** — run this in parallel with scoring during the game.

1. Tap the correct player's button in the away or home grid
2. The player detail panel opens
3. As events happen on court:

| Event | Tap |
|-------|-----|
| Made field goal | **FG +** |
| Made 3-pointer | **3P +** (also tap FG +) |
| Made free throw | **FT +** |
| Offensive rebound | **REB OFF +** |
| Defensive rebound | **REB DEF +** |
| Assist | **AST +** |
| Turnover | **TO +** |
| Steal | **STL +** |
| Block | **BLK +** |
| Undo last entry | Tap the **−** button on the relevant stat |

4. Tap **← Back** to return to the player grid and select a different player

### Player Spotlight
- In the player detail panel, tap the **★ Spotlight** button
- A player card fires on stream: photo, name, number, live stats
- The card auto-dismisses after a few seconds, or tap **✕ Dismiss** on iPad GAME tab to dismiss manually

---

## BROADCAST GRAPHICS (MBP Producer — Broadcast Tab)

Fire these from the MBP when needed:

| Graphic | When to Fire | Where |
|---------|-------------|-------|
| **Timeout** | After calling a timeout | Timeout button → modal → Fire |
| **Substitution** | When subs enter the game | Sub button → modal → Fire |
| **Personal Foul** | After a foul is called | Foul button → modal → Fire |
| **Halftime** | End of first half | Halftime button (instant) |
| **Media Timeout** | TV/media stoppage | Media Timeout button (instant) |
| **Officials Timeout** | Ref stoppage | Officials Timeout button (instant) |
| **End of Game** | Final buzzer | End of Game button (instant) |

All graphics auto-dismiss after ~5 seconds.

---

## HALFTIME

1. iPad GAME tab → tap **End Period ▸** (advances from Q2 → H2)
2. MBP Producer → Broadcast tab → tap **Halftime** button
   - HALFTIME graphic fires on stream with both scores
3. While teams are in the locker room:
   - Update roster if needed
   - No need to reset scores — they carry into the second half

---

## END OF GAME

1. MBP Producer → Broadcast tab → tap **End of Game** button
   - FINAL graphic fires on stream with the final score
2. iPad → GAME tab → tap **↺ Reset Game** → confirm
   - Clears scores to 0–0, resets clock, clears stats
   - Keeps rosters loaded for the next game

---

## 3-POINT CONTEST

### OBS
- Switch to your **3PT scene** in OBS (the 3pt-overlay Browser Source should already be there)

### Round 1 — Two courts running simultaneously

**Primary device (Court 1):**
1. iPad → tap **🏀 3PT** tab
2. Tap **Court 1** at the top
3. Tap **Round 1**
4. Type the shooter's name in the text field (or select from dropdown)
5. Tap the **★ Money Rack** button (1–5) — the shooter picks which rack is worth 2 pts
6. Tap **▶ Show** to show the overlay
7. As each ball is thrown, tap the corresponding ball button in that rack row:
   - Made = ball fills in (white)
   - Missed = ball stays empty
8. Running total updates live on the overlay
9. When the shooter finishes: tap **Next Shooter ▶**
   - Balls clear, name field empties for next shooter

**Second device (Court 2):**
- Runs the same workflow independently
- Both courts appear side-by-side on the overlay simultaneously

### Finals — Single shooter
1. Primary device → 3PT tab → tap **Finals**
2. The overlay switches to a single centered panel
3. Enter the finalist's name, select money rack, tap Show
4. Same ball-tapping workflow as Round 1
5. Tap **Next Shooter ▶** to advance to the next finalist

---

## DUNK CONTEST

### OBS
- Switch to your **Dunk scene** in OBS (the dunk-overlay Browser Source should already be there)

### Head Table (Primary device — Dunk tab)

**Setup for each dunker:**
1. iPad → tap **✊ Dunk** tab
2. Dropdown: select the dunker's name (school and Instagram auto-fill on the overlay)
3. Optional: paste a photo URL into the photo field
4. Set **Round** number (use −/+ buttons)
5. Set **Attempt** number (1, 2, 3 per round)
6. Tap **▶ Show** to display the overlay

**Dunker attempts the dunk:**
1. Watch for judge cards to light up blue as scores arrive (score is hidden until you reveal)
2. All 5 cards should turn blue before revealing (let all judges submit)

**Revealing scores:**
- For drama: tap **▶ Reveal** on each judge card one at a time
- For speed: tap **Reveal All** to reveal all at once
- Scores animate up on the overlay; a perfect 10 shows in gold

**After each dunk:**
- Tap **↺ Reset Dunk** — clears all 5 judge scores, keeps dunker name for their next attempt
- Judge pages auto-reset and are ready for the next submission

**New dunker:**
- Tap **New Dunker** — clears everything

### Judges (each on their own device)

1. Open `http://MBP.local:8000/ipad-control/?judge=N`
2. See the dunker name, round, attempt (read-only)
3. Tap a score: **1 through 10**
4. Tap **✓ Submit Score**
   - Score locks; button grays out
   - Head table sees your card turn blue
5. After head table taps Reset Dunk, your page auto-resets for the next submission
6. If you accidentally refresh: just reopen the URL and resubmit — it replaces your previous score

---

## SCORE TICKER

Show scores from other ongoing games during breaks or alongside the scorebug.

1. MBP Producer → **Ticker** tab
2. Add a game row: Away name, score, Home name, score, period/clock
3. Add as many games as needed, reorder by drag
4. Toggle show/hide at the top
5. Click **📡 Push Ticker to Stream**

The ticker scrolls across the lower third of the overlay on a loop.

---

## WRAP-UP

After the last game or event of the day:

1. OBS: stop recording and/or end stream
2. iPad: no action needed (just close the browser)
3. MBP: close the Terminal window with the server running
   - Or press **Ctrl+C** in the terminal to stop cleanly
4. The current game state is saved in `game_state.json` — it will restore if you restart the server later

---

## QUICK REFERENCE — WHAT LIVES WHERE

| Task | Where to do it |
|------|---------------|
| Score points | iPad → **Game tab** |
| Start/stop clock | iPad → **Game tab** |
| Track player stats | iPad → **Stats tab** |
| All-Star intro | iPad → **All-Star tab** |
| 3PT contest | iPad → **3PT tab** |
| Dunk contest (head table) | iPad → **Dunk tab** |
| Judge scoring | Each judge's device → **Judge tab** |
| Fire broadcast graphics | MBP **Producer → Broadcast tab** |
| Set team names/logos/colors | MBP **Producer → Game Setup tab** |
| Manage rosters | MBP **Producer → Rosters tab** |
| Score ticker | MBP **Producer → Ticker tab** |
| Ads/sponsor logos | MBP **Producer → Overlay & Ads tab** |

---

*NSMT Broadcast Runbook — Hoopfest 2026-03-22*
