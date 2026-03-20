#!/usr/bin/env python3
"""
NSMT Game Simulator — Sends realistic full-game stats via WebSocket
Usage: python3 simulate-game.py [nova24|pvp]
Requires: pip3 install websockets
"""
import asyncio, json, random, sys, time

WS_URL = "ws://localhost:8765"

# ── ROSTERS ──────────────────────────────────────────
PRESETS = {
    "nova24": {
        "event": "NSMT Hoopfest 2026",
        "venue": "The St. James, Springfield VA",
        "away": {"name": "Team Lin", "code": "LIN", "players": [
            {"id": "p_N24_Will_Robinson",   "num": "1",  "name": "Will Robinson",   "pos": "W"},
            {"id": "p_N24_Adam_Perdue",     "num": "2",  "name": "Adam Perdue",     "pos": "G"},
            {"id": "p_N24_Landon_Judy",     "num": "3",  "name": "Landon Judy",     "pos": "W"},
            {"id": "p_N24_Max_Lawson",      "num": "4",  "name": "Max Lawson",      "pos": "G"},
            {"id": "p_N24_Shreyas_Vaidya",  "num": "5",  "name": "Shreyas Vaidya",  "pos": "W"},
            {"id": "p_N24_Charlie_Boone",   "num": "10", "name": "Charlie Boone",   "pos": "G"},
            {"id": "p_N24_Medwyn_Opoku",    "num": "11", "name": "Medwyn Opoku",    "pos": "W"},
            {"id": "p_N24_Nathan_Pewett",   "num": "12", "name": "Nathan Pewett",   "pos": "G"},
            {"id": "p_N24_Mason_Ogburn",    "num": "13", "name": "Mason Ogburn",    "pos": "G"},
            {"id": "p_N24_Kaci_Jones-Carr", "num": "15", "name": "Kaci Jones-Carr", "pos": "G"},
            {"id": "p_N24_Makhai_Ramos",    "num": "20", "name": "Makhai Ramos",    "pos": "G"},
            {"id": "p_N24_Will_Davis",      "num": "21", "name": "Will Davis",      "pos": "W"},
        ]},
        "home": {"name": "Team Rivers", "code": "RIV", "players": [
            {"id": "p_N24_Brian_Burns",      "num": "0",  "name": "Brian Burns",      "pos": "F"},
            {"id": "p_N24_Noah_Conrad",      "num": "3",  "name": "Noah Conrad",      "pos": "W"},
            {"id": "p_N24_Colin_Stemberger", "num": "5",  "name": "Colin Stemberger", "pos": "G"},
            {"id": "p_N24_Denari_Nesbitt",   "num": "7",  "name": "Denari Nesbitt",   "pos": "G"},
            {"id": "p_N24_Jacob_Bell",       "num": "10", "name": "Jacob Bell",       "pos": "W"},
            {"id": "p_N24_Isaac_Heaton",     "num": "12", "name": "Isaac Heaton",     "pos": "G"},
            {"id": "p_N24_Barrett_Medhurst", "num": "14", "name": "Barrett Medhurst", "pos": "F"},
            {"id": "p_N24_Devon_Pettibone",  "num": "20", "name": "Devon Pettibone",  "pos": "G"},
            {"id": "p_N24_Antonio_Jones",    "num": "22", "name": "Antonio Jones",    "pos": "G"},
            {"id": "p_N24_Caleb_Roach",      "num": "24", "name": "Caleb Roach",      "pos": "G"},
            {"id": "p_N24_Ty_Wilkerson",     "num": "30", "name": "Ty Wilkerson",     "pos": "G"},
            {"id": "p_N24_Mikey_Robinson",   "num": "33", "name": "Mikey Robinson",   "pos": "W"},
        ]},
    },
    "pvp": {
        "event": "NSMT Hoopfest 2026",
        "venue": "The St. James, Springfield VA",
        "away": {"name": "Team Public", "code": "PUB", "players": [
            {"id": "p_PVP_Ryan_Brzezanski",     "num": "0",  "name": "Ryan Brzezanski",     "pos": "WF"},
            {"id": "p_PVP_Ryan_Corallo",        "num": "3",  "name": "Ryan Corallo",        "pos": "G"},
            {"id": "p_PVP_Elijah_Gaskins",      "num": "5",  "name": "Elijah Gaskins",      "pos": "G"},
            {"id": "p_PVP_Johnathan_Anderson",  "num": "11", "name": "Johnathan Anderson",  "pos": "G"},
            {"id": "p_PVP_Sean_Madrigal",       "num": "12", "name": "Sean Madrigal",       "pos": "W"},
            {"id": "p_PVP_Jemon_Price",         "num": "14", "name": "Jemon Price",         "pos": "G"},
            {"id": "p_PVP_Colin_Spencer_Byrd",  "num": "15", "name": "Colin Spencer Byrd",  "pos": "G"},
            {"id": "p_PVP_Dominic_Julian_Mack", "num": "21", "name": "Dominic Julian Mack", "pos": "W"},
            {"id": "p_PVP_Ethan_Jeremiah_Poole","num": "22", "name": "Ethan Jeremiah Poole","pos": "G"},
            {"id": "p_PVP_Rodney_Carmichael",   "num": "24", "name": "Rodney Carmichael",   "pos": "W"},
            {"id": "p_PVP_Nate_McComb",         "num": "30", "name": "Nate McComb",         "pos": "F"},
            {"id": "p_PVP_Jacob_Coulam",        "num": "32", "name": "Jacob Coulam",        "pos": "G"},
            {"id": "p_PVP_Isaiah_Brown",        "num": "40", "name": "Isaiah Brown",        "pos": "G"},
        ]},
        "home": {"name": "Team Private", "code": "PVT", "players": [
            {"id": "p_PVP_Darius_Bivins",   "num": "2",  "name": "Darius Bivins",   "pos": "G"},
            {"id": "p_PVP_Akim_Iscandari",  "num": "4",  "name": "Akim Iscandari",  "pos": "G"},
            {"id": "p_PVP_Marcus_Hancock",  "num": "10", "name": "Marcus Hancock",  "pos": "G"},
            {"id": "p_PVP_Messiah_Dixon",   "num": "13", "name": "Messiah Dixon",   "pos": "G"},
            {"id": "p_PVP_RJ_Jones",        "num": "15", "name": "RJ Jones",        "pos": "G"},
            {"id": "p_PVP_Jafet_Valencia",  "num": "20", "name": "Jafet Valencia",  "pos": "W"},
            {"id": "p_PVP_Frank_Siaca_Bey", "num": "23", "name": "Frank Siaca Bey", "pos": "F"},
            {"id": "p_PVP_Jake_Bahr",       "num": "24", "name": "Jake Bahr",       "pos": "G"},
            {"id": "p_PVP_Silas_Devonish",  "num": "25", "name": "Silas Devonish",  "pos": "G"},
            {"id": "p_PVP_Ripp_Kodi",       "num": "30", "name": "Ripp Kodi",       "pos": "WF"},
            {"id": "p_PVP_Justin_Edwards",  "num": "33", "name": "Justin Edwards",  "pos": "W"},
            {"id": "p_PVP_Jahda_Swann",     "num": "34", "name": "Jahda Swann",     "pos": "W"},
            {"id": "p_PVP_Cole_Forbrich",   "num": "40", "name": "Cole Forbrich",   "pos": "G"},
        ]},
    },
}

def empty_stats():
    return {"fgm":0,"fga":0,"t3m":0,"t3a":0,"ftm":0,"fta":0,
            "off":0,"def":0,"ast":0,"stl":0,"blk":0,"to":0,"pf":0,"pts":0,"min":0}

def calc_pts(s):
    return (s["fgm"] - s["t3m"]) * 2 + s["t3m"] * 3 + s["ftm"]

def simulate_game(preset):
    """Generate realistic stats for a full 4-quarter game."""
    game = PRESETS[preset]
    stats = {}

    for side in ("away", "home"):
        for p in game[side]["players"]:
            stats[p["id"]] = empty_stats()

    # Pick 8-10 players per team who actually play (starters + bench)
    for side in ("away", "home"):
        players = game[side]["players"]
        n = len(players)
        # First 5 are starters (more minutes), rest are bench
        starters = players[:5]
        bench = players[5:]

        # Target: ~60-75 pts per team across 4 quarters
        # Starters get ~60-70% of stats, bench gets rest

        for i, p in enumerate(players):
            s = stats[p["id"]]
            is_starter = i < 5
            is_guard = p["pos"] in ("G", "WF")
            is_wing = p["pos"] in ("W",)
            is_forward = p["pos"] in ("F",)

            if is_starter:
                # Starters: higher volume
                fg_att = random.randint(6, 14)
                t3_att = random.randint(2, 7) if is_guard else random.randint(1, 4)
                ft_att = random.randint(1, 6)
            else:
                # Bench: lower volume, some DNP
                if random.random() < 0.25:
                    continue  # DNP
                fg_att = random.randint(2, 8)
                t3_att = random.randint(0, 4) if is_guard else random.randint(0, 2)
                ft_att = random.randint(0, 4)

            # Shooting percentages (realistic HS)
            fg_pct = random.uniform(0.35, 0.55)
            t3_pct = random.uniform(0.25, 0.40)
            ft_pct = random.uniform(0.60, 0.85)

            t3_att = min(t3_att, fg_att)  # 3pt can't exceed total FGA
            fg2_att = fg_att - t3_att

            t3_made = sum(1 for _ in range(t3_att) if random.random() < t3_pct)
            fg2_made = sum(1 for _ in range(fg2_att) if random.random() < fg_pct)
            ft_made = sum(1 for _ in range(ft_att) if random.random() < ft_pct)

            s["fga"] = fg_att
            s["fgm"] = fg2_made + t3_made
            s["t3a"] = t3_att
            s["t3m"] = t3_made
            s["fta"] = ft_att
            s["ftm"] = ft_made

            # Rebounds
            if is_forward:
                s["off"] = random.randint(1, 4)
                s["def"] = random.randint(2, 7)
            elif is_wing:
                s["off"] = random.randint(0, 2)
                s["def"] = random.randint(1, 5)
            else:
                s["off"] = random.randint(0, 2)
                s["def"] = random.randint(1, 4)

            # Other stats
            s["ast"] = random.randint(2, 8) if is_guard and is_starter else random.randint(0, 4)
            s["stl"] = random.randint(0, 3)
            s["blk"] = random.randint(0, 3) if is_forward else random.randint(0, 1)
            s["to"] = random.randint(0, 3)
            s["pf"] = random.randint(0, 4)

            # Minutes played (32 min game = 4x8min quarters)
            if is_starter:
                s["min"] = random.randint(22, 32)
            else:
                s["min"] = random.randint(8, 20)

            s["pts"] = calc_pts(s)

    return stats

def build_team_payload(game, side, stats):
    """Build the stats team object for a WebSocket patch."""
    team = game[side]
    players = []
    for p in team["players"]:
        s = stats[p["id"]]
        players.append({
            "id": p["id"],
            "num": p.get("num", ""),
            "name": p["name"],
            "pos": p["pos"],
            "photo": "",
            **s
        })
    return {
        "name": team["name"],
        "fouls": random.randint(8, 16),
        "players": players
    }

async def run_simulation(preset_name):
    import websockets

    game = PRESETS[preset_name]
    stats = simulate_game(preset_name)

    # Calculate team scores
    away_score = sum(stats[p["id"]]["pts"] for p in game["away"]["players"])
    home_score = sum(stats[p["id"]]["pts"] for p in game["home"]["players"])

    away_team = build_team_payload(game, "away", stats)
    home_team = build_team_payload(game, "home", stats)

    print(f"\n{'='*60}")
    print(f"  NSMT Game Simulator — {preset_name.upper()}")
    print(f"  {game['away']['name']} vs {game['home']['name']}")
    print(f"{'='*60}")

    async with websockets.connect(WS_URL) as ws:
        # Wait for initial snapshot
        await ws.recv()

        # Send game setup
        patch = {
            "type": "patch",
            "bug": {
                "awayName": game["away"]["name"],
                "homeName": game["home"]["name"],
                "awayCode": game["away"]["code"],
                "homeCode": game["home"]["code"],
                "awayScore": away_score,
                "homeScore": home_score,
                "clock": "0:00",
                "clockRunning": False,
                "quarter": "FINAL",
            },
            "stats": {
                "meta": {
                    "eventTitle": game["event"],
                    "gameDate": time.strftime("%m/%d/%y"),
                    "gameStatus": "Final"
                },
                "away": away_team,
                "home": home_team
            }
        }

        await ws.send(json.dumps(patch))
        print(f"\n  FINAL SCORE: {game['away']['name']} {away_score} — {game['home']['name']} {home_score}")

        # Print box score summary
        for side in ("away", "home"):
            team = game[side]
            print(f"\n  {team['name'].upper()}")
            print(f"  {'Player':<22} PTS  FG     3PT    FT     REB AST STL BLK TO  PF")
            print(f"  {'-'*80}")
            for p in team["players"]:
                s = stats[p["id"]]
                if s["fga"] == 0 and s["fta"] == 0 and s["off"] == 0 and s["def"] == 0:
                    print(f"  {p['name']:<22} DNP")
                    continue
                reb = s["off"] + s["def"]
                print(f"  {p['name']:<22} {s['pts']:>3}  {s['fgm']}-{s['fga']:<4} {s['t3m']}-{s['t3a']:<4} {s['ftm']}-{s['fta']:<4} {reb:>3} {s['ast']:>3} {s['stl']:>3} {s['blk']:>3} {s['to']:>2}  {s['pf']:>2}")

        print(f"\n  State pushed to server. Open producer and click 'Share Report' to export.")
        print(f"{'='*60}\n")

async def main():
    preset = sys.argv[1] if len(sys.argv) > 1 else None

    if preset and preset in PRESETS:
        await run_simulation(preset)
    else:
        # Run both games
        print("\nSimulating both games...\n")
        for p in ("nova24", "pvp"):
            await run_simulation(p)
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
