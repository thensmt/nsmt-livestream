# NSMT Livestream — Operator Guide
### Hoopfest 2026 & Special Events

---

## QUICK REFERENCE — ALL URLs

> **Replace `MBP.local` with the MBP's IP address if `.local` doesn't load.**
> The IP is printed in the terminal when you start the server (look for "IP backup").

### Always-on (every event)
| What | URL | Device |
|------|-----|--------|
| Producer control panel | `http://mbp.local:8000/nsmt-producer.html` | MBP only |
| OBS scorebug overlay | `http://mbp.local:8000/nsmt_hoopfest_overlay.html` | OBS Browser Source |
| **iPad unified controller** | `http://MBP.local:8000/ipad-control/ipad-control.html` | Primary device |

### 3-Point Contest
| What | URL | Device |
|------|-----|--------|
| OBS overlay (add as 2nd Browser Source) | `http://mbp.local:8000/3pt-overlay.html` | OBS Browser Source |
| Court 1 scorer | `http://MBP.local:8000/ipad-control/ipad-control.html` → 3PT tab | Primary device |
| **Court 2 scorer** | `http://MBP.local:8000/ipad-control/ipad-control.html?court=2` | **Second device only** |

### Dunk Contest
| What | URL | Device |
|------|-----|--------|
| OBS overlay (add as 2nd Browser Source) | `http://mbp.local:8000/dunk-overlay.html` | OBS Browser Source |
| Head table control | `http://MBP.local:8000/ipad-control/ipad-control.html` → Dunk tab | Primary device |
| Judge 1 | `http://MBP.local:8000/ipad-control/ipad-control.html?judge=1` | Any device |
| Judge 2 | `http://MBP.local:8000/ipad-control/ipad-control.html?judge=2` | Any device |
| Judge 3 | `http://MBP.local:8000/ipad-control/ipad-control.html?judge=3` | Any device |
| Judge 4 | `http://MBP.local:8000/ipad-control/ipad-control.html?judge=4` | Any device |
| Judge 5 | `http://MBP.local:8000/ipad-control/ipad-control.html?judge=5` | Any device |

> **Device compatibility:** Every page works on any device with a modern browser —
> iPad, Android tablet, phone, laptop, Chromebook. No app install needed.
> All devices must be on the **same WiFi network** as the MBP.

---

## BEFORE YOU LEAVE THE HOUSE

- [ ] Charge MBP fully
- [ ] Charge all tablets/devices that will be used
- [ ] Test server starts with `Start NSMT.command`
- [ ] Confirm OBS Browser Sources load and show scorebug
- [ ] Confirm iPad game controller connects (green dot in top-right)
- [ ] Upload team rosters in Producer → Rosters tab
- [ ] Upload team logos in Producer → Settings tab
- [ ] Upload player photos into `uploads/players/<Player Name>/` folders
- [ ] Assign photos to players in Producer → Rosters tab (📷 button)

---

## STARTING THE SERVER (MBP)

1. Open the `Livestream` folder
2. Double-click **`Start NSMT.command`**
3. A terminal window opens — **leave it open** the entire event
4. The producer panel opens automatically in your browser

To start manually if the launcher doesn't work:
```
cd /Users/david/Downloads/Claude/NSMT/Livestream
python3 nsmt-server.py
```

**Finding the MBP's IP address** (needed if `.local` URLs don't work):
```
ipconfig getifaddr en0
```
Use that IP in place of `MBP.local` — e.g. `http://192.168.1.50:8000/ipad-control/ipad-control.html`

---

## OBS SETUP

### Scorebug (all games)
1. Add a **Browser Source** in OBS
2. URL: `http://mbp.local:8000/nsmt_hoopfest_overlay.html`
3. Width: `1920` Height: `1080`
4. Check **"Shutdown source when not visible"** — OFF
5. Check **"Refresh browser when scene becomes active"** — OFF
6. Check **"Use custom frame rate"** — OFF
7. Enable **transparent background**

### 3-Point Contest overlay
- Add a **second Browser Source**: `http://mbp.local:8000/3pt-overlay.html`
- Same 1920×1080 settings as above
- Keep it in your 3PT scene; hide it for regular game scenes

### Dunk Contest overlay
- Add a **third Browser Source**: `http://mbp.local:8000/dunk-overlay.html`
- Same 1920×1080 settings
- Keep it in your dunk scene

> **If the overlay doesn't update after a change:**
> Right-click the Browser Source in OBS → **Refresh cache of current page**

---

## GAME DAY WORKFLOW

### Pre-game
1. Start server (`Start NSMT.command`)
2. Open OBS, confirm scorebug overlay is connected (you'll see team names)
3. Open the game controller on the primary device: `http://MBP.local:8000/ipad-control/ipad-control.html`
4. Look for the **green dot** in the top-right corner — that means it's connected
5. On the MBP Producer, go to **Settings** tab and set team names, logos, colors, records
6. On the MBP Producer, go to **Rosters** tab and assign rosters to home/away teams

### During the game
**Primary operator (game controller device):**
- GAME tab: tap score buttons to add points, run/stop clock, set period, track TOs and fouls
- STATS tab: tap a player → stat entry panel → tap each stat as it happens

**Secondary operator (MBP producer):**
- Fire broadcast graphics (timeouts, subs, fouls, halftime, final)
- Trigger player spotlights manually or watch for auto-fires at point milestones
- Manage the score ticker (other games)

### Between games / halftime
- Use **Reset Game** button on the game controller (clears scores, clock, stats — asks to confirm)
- Update rosters if teams change

---

## NOVA 24 ROSTERS

### Team Lin (12 players)
| Name | School | Instagram |
|------|--------|-----------|
| Will Robinson | Westfield | @Williamrobinson.24 |
| Adam Perdue | Broad Run | @adam_perdue22 |
| Landon Judy | Hayfield | @Landonkj33 |
| Max Lawson | Riverside | @maxlawson_3 |
| Shreyas Vaidya | Marshall | @shootashrey |
| Charlie Boone | Freedom SR | @Charlie_Boone |
| Medwyn Opoku | Potomac | @1upmed |
| Nathan Pewett | Annandale | @nathanpewett |
| Mason Ogburn | Independence | @mason_ogburn13 |
| Kaci Jones-Carr | Woodbridge | @sh0wtime.k3_ |
| Makhai Ramos | South Lakes | @Khaiclutchh_ |
| Will Davis | Meridian | @willldaviss |

### Team Rivers (11 players)
| Name | School | Instagram |
|------|--------|-----------|
| Brian Burns | South County | @brianburnsll |
| Noah Conrad | Patriot | @noahjawnts |
| Colin Stemberger | Westfield | @Colstem |
| Denari Nesbitt | Edison | @nari3s |
| Jacob Bell | McLean | @jake.bell03 |
| Isaac Heaton | West Springfield | @isaac.heaton11 |
| Barrett Medhurst | Woodson | @barrettmedhurst26 |
| Devon Pettibone | Briar Woods | @devon.pettibone |
| Antonio Jones | Forest Park | @571.tonio |
| Caleb Roach | Woodgrove | @calebroach_ |
| Ty Wilkerson | Brooke Point | @Tj2shiftyyyy |

> Both rosters are pre-loaded in the Producer → Rosters tab as "Nova 24 — Team Lin" and "Nova 24 — Team Rivers". Assign them to away/home teams in the wizard before the game.

---

## PUBLIC VS PRIVATE ROSTERS

### Team Private (13 players)
| Name | School | Instagram |
|------|--------|-----------|
| Darius Bivins | Bishop O'Connell | @_dariusbivins |
| Akim Iscandari | The Potomac School | @theakimiscandari |
| Marcus Hancock | St Stephen's St Agnes | @Marcushoops2 |
| Messiah Dixon | Fairfax Christian | @Bigdotsiah |
| RJ Jones | Virginia Academy | @rjjonesss |
| Jafet Valencia | Evergreen Christian | @Jafetvalencia10 |
| Frank Siaca Bey | Fairfax Christian | @siacabeyf |
| Jake Bahr | Bishop Ireton | @jake.bahrr |
| Silas Devonish | Bishop Ireton | @Ldf_silas |
| Ripp Kodi | Highland School | @rippkodi |
| Justin Edwards | Bishop O'Connell | @J3dwards_ |
| Jahda Swann | The St. James | @Yk.jahda |
| Cole Forbrich | Evergreen Christian | @coleforbrich |

### Team Public (13 players)
| Name | School | Instagram |
|------|--------|-----------|
| Ryan Brzezanski | Broad Run | @ryanbrzezanski |
| Ryan Corallo | C.G. Woodson | @Ryan.corallo |
| Elijah Gaskins | Patriot | @elijah.gaskins |
| Johnathan Anderson | South County | @j_anderson.1 |
| Sean Madrigal | Patriot | @theseanmadrigal |
| Jemon Price | Westfield | @thejemonprice |
| Colin Spencer Byrd | Tuscarora | @_cbyrd |
| Dominic Julian Mack | Potomac Senior | @Dominic.jm |
| Ethan Jeremiah Poole | Wakefield | @jeremiah.poole.3 |
| Rodney Carmichael | Hayfield | @rodney.carmichael5 |
| Nate McComb | Lake Braddock | @natemccomb |
| Jacob Coulam | Yorktown | @jakecoulam11 |
| Isaiah Brown | Westfield | @_zay.brown_ |

> Both rosters are pre-loaded in the Producer → Rosters tab as "PvP — Team Private" and "PvP — Team Public". Assign them in the wizard before the game.

---

## ALL-STAR GAME MODE (Nova 24 / Public vs Private)

1. On the **iPad controller** → tap the **★ All-Star** tab
2. Select the event: **Nova 24** or **Public vs Private**
3. When ready for tip-off: tap **▶ Show Intro**
4. The overlay shows a full-screen intro card with event name and matchup
5. Tap **✕ Dismiss** when you're ready to go live with the scorebug

The event type also affects the accent color on the intro card:
- Nova 24 = NSMT Blue
- Public vs Private = Gold

> All-Star controls are also available on the MBP Producer → **Broadcast** tab as a fallback.

---

## 3-POINT CONTEST ROSTER (18 players)

| # | Name | School | Instagram |
|---|------|--------|-----------|
| 1 | Darius Bivins | O'Connell | @_dariusbivins |
| 2 | Marcus Hancock | St Stephen's St Agnes | @Marcushoops2 |
| 3 | Sean Madrigal | Patriot High School | @theseanmadrigal |
| 4 | Messiah Dixon | Fairfax Christian | @Bigdotsiah |
| 5 | Cole Forbrich | Evergreen Christian School | @coleforbrich |
| 6 | Isaiah Brown | Westfield High School | @_zay.brown_ |
| 7 | Aiden Moore | Hayfield | @0nly_aiden |
| 8 | Silas Devonish | Bishop Ireton High School | @Ldf_silas |
| 9 | Ripp Kodi | Highland School | @rippkodi |
| 10 | Shreyas Vaidya | George C Marshall High School | @shootashrey |
| 11 | Adam Perdue | Broad Run | @adam_perdue22 |
| 12 | Isaac Heaton | West Springfield High School | @isaac.heaton11 |
| 13 | Harlem Lyons | Potomac Senior | @harlem_wrld3 |
| 14 | Wisdom Mintz | The St. James | @wizmintz |

> School and Instagram auto-populate on the overlay when you select a name from the scorer.

---

## 3-POINT CONTEST

### Setup (add Browser Source before contest starts)
1. In OBS, add a Browser Source: `http://mbp.local:8000/3pt-overlay.html`
2. Switch to your 3PT scene in OBS

### Round 1 (2 courts shooting simultaneously)
1. On the primary device: tap the **🏀 3PT** tab → tap **Court 1** at the top
2. On the second device: open `http://MBP.local:8000/ipad-control/ipad-control.html?court=2` (auto-opens on 3PT tab, Court 2 selected)
3. On Court 1 scorer: set **Round** to **Round 1**
4. On each scorer: type the shooter's name
5. On each scorer: tap the **★ money rack** button (1–5) to select which rack is the money rack — the shooter chooses this before they start
6. On Court 1 scorer: tap **▶ Show** to show the overlay
7. As each ball is thrown, tap the ball button on that court's scorer — made = filled, missed = empty
8. The overlay updates in real time for both courts simultaneously
9. When a shooter finishes: tap **Next Shooter ▶** (clears balls, prompts for new name)

### Finals (1 shooter)
1. On the Court 1 scorer: switch **Round** to **Finals**
2. The overlay switches to a single centered panel
3. Type the finalist's name, set money rack, tap Show

### Scoring rules
- Regular ball made: **1 point**
- Money rack ball made: **2 points**
- Maximum score: **30 points** (5 racks × 5 balls; 4 racks × 5×1pt + 1 rack × 5×2pt)

---

## DUNK CONTEST ROSTER (6 players)

| # | Name | School | Instagram |
|---|------|--------|-----------|
| 1 | Elijah Gaskins | Patriot High School | @elijah.gaskins |
| 2 | Noah Conrad | Patriot High School | @noahjawnts |
| 3 | RJ Jones | Virginia Academy | @rjjonesss |
| 4 | Dominic Julian Mack | Potomac Senior High School | @Dominic.jm |
| 5 | Jeremiah Nelson | Annandale High School | @officialjeremia |
| 6 | Jahda Swann | The St. James | @Yk.jahda |

> Select the dunker from the dropdown on the head table controller — school and Instagram auto-populate on the overlay.

---

## DUNK CONTEST

### Setup
1. In OBS, add a Browser Source: `http://mbp.local:8000/dunk-overlay.html`
2. Switch to your dunk scene in OBS
3. On the primary device: tap the **✊ Dunk** tab — this is the head table control
4. Each judge opens their page on their own device:
   - Judge 1: `http://MBP.local:8000/ipad-control/ipad-control.html?judge=1`
   - Judge 2: `http://MBP.local:8000/ipad-control/ipad-control.html?judge=2`
   - Judge 3: `http://MBP.local:8000/ipad-control/ipad-control.html?judge=3`
   - Judge 4: `http://MBP.local:8000/ipad-control/ipad-control.html?judge=4`
   - Judge 5: `http://MBP.local:8000/ipad-control/ipad-control.html?judge=5`

   > All 5 judge URLs are shown at the bottom of the Dunk tab for easy reference/sharing.
   > If a judge opens `ipad-control/ipad-control.html` without a `?judge=N` param, they'll be asked "Which judge are you?" before seeing the score buttons.

### Per dunk
1. Head table: enter **dunker name** (and optional photo URL)
2. Head table: set **Round** and **Attempt** numbers
3. Head table: tap **▶ Show** to show the overlay
4. Dunker attempts the dunk
5. Each judge selects their score (1–10) and taps **Submit Score**
6. Head table: judge cards turn blue as scores come in (score hidden until revealed)
7. Head table: tap **▶ Reveal** on each judge one at a time for drama, or **Reveal All** at once
8. The overlay reveals each score with an animation; perfect 10 shows in gold
9. Head table: tap **↺ Reset Dunk** to clear scores for the next attempt (keeps dunker name)
10. For a new dunker: tap **New Dunker** (clears everything)

### Judge notes
- Judges can only submit once per dunk — their page resets automatically when the dunker changes
- If a judge accidentally refreshes, they can reopen their URL and re-submit
- Head table operator controls what viewers see — scores stay hidden until revealed

---

## TROUBLESHOOTING

### Green dot is red / device shows "Connecting…"
- Confirm the MBP server terminal is still open and running
- Confirm the device is on the **same WiFi network** as the MBP
- Try the IP address URL instead: find IP with `ipconfig getifaddr en0` on MBP
- Try force-refreshing the page on the device (pull down to reload in Safari/Chrome)

### `MBP.local` doesn't load
- Some venue WiFi networks block mDNS (the technology that makes `.local` work)
- Use the IP address instead — it's printed in the server terminal at startup
- Example: if terminal shows `IP backup: http://192.168.1.50:8000/...`, use that IP

### Overlay isn't updating in OBS
- Right-click the Browser Source → **Refresh cache of current page**
- If still stuck: close and re-add the Browser Source

### Accidentally refreshed the game controller mid-game
- Data is safe — the page restores from local storage automatically on reload
- The green dot will reappear once reconnected, and scores will push back to the overlay

### Server crashed mid-game
- Re-run `Start NSMT.command` (or `python3 nsmt-server.py` manually)
- The server reads `game_state.json` on startup and restores to the last known state
- All devices will reconnect automatically within a few seconds

### Player spotlight fired at the wrong time
- Tap **✕ Dismiss** on the producer or the game controller STATS tab
- To prevent auto-fires: the milestone thresholds are `[10, 15, 20, 25, 30]` points — planned

### Scores got out of sync between devices
- On the producer: push the score manually using the score buttons (they are authoritative)
- Or: tap the score display on the producer to override it directly

### 3PT contest: one court's data disappeared
- Each scorer caches the other court's data — this should not happen after the fix
- If it does: have both scorers reload their pages, then re-enter shooter names and money racks

---

## NETWORK NOTES

- **All devices must be on the same WiFi** — the MBP acts as the server
- The system does not require internet access once loaded (fonts load from Google CDN on first load)
- For extra reliability, consider bringing a **personal hotspot or travel router** so you control the network instead of relying on venue WiFi
- The server runs on ports **8000** (HTTP) and **8765** (WebSocket) — some venue networks may block non-standard ports. If everything fails, try the hotspot.

---

## CONTACTS / NOTES

*(Add venue contact, parking, load-in time, etc. here before each event)*

---

*NSMT Livestream System — Built for Hoopfest 2026-03-22*
