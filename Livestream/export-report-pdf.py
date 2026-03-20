#!/usr/bin/env python3
"""
Export NSMT game report as PDF to Desktop.
Connects to WS, grabs current state, renders the same report HTML, converts to PDF.
Usage: python3 export-report-pdf.py [filename]
Requires: pip3 install websockets fpdf2
"""
import asyncio, json, sys, time, os

async def get_state():
    import websockets
    async with websockets.connect("ws://localhost:8765") as ws:
        msg = json.loads(await ws.recv())
        return msg.get("data", msg)

def pct(m, a):
    return f"{(m/a*100):.1f}%" if a else "--"

def esc(s):
    return str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def build_report_html(state, label_override=None):
    bug = state.get("bug", {})
    stats = state.get("stats", {})
    now = time.strftime("%m/%d/%y")
    tstr = time.strftime("%-I:%M %p")

    away_name = bug.get("awayName") or stats.get("away",{}).get("name","Away")
    home_name = bug.get("homeName") or stats.get("home",{}).get("name","Home")
    away_score = bug.get("awayScore", 0)
    home_score = bug.get("homeScore", 0)
    away_code = bug.get("awayCode", away_name[:3].upper())
    home_code = bug.get("homeCode", home_name[:3].upper())
    event = label_override or stats.get("meta",{}).get("eventTitle","") or bug.get("event","") or "NSMT Hoopfest 2026"
    venue = bug.get("venue","") or "The St. James, Springfield VA"
    status = bug.get("quarter","FINAL")

    def build_team(team_key):
        t = stats.get(team_key, {})
        players = t.get("players", [])
        tP=tFm=tFa=t3m=t3a=tFtm=tFta=tOff=tDef=tAst=tStl=tBlk=tTo=tPf=0
        rows = ""
        for p in players:
            if not p.get("name"): continue
            fm=p.get("fgm",0); fa=p.get("fga",0)
            m3=p.get("t3m",0); a3=p.get("t3a",0)
            ftm=p.get("ftm",0); fta=p.get("fta",0)
            off=p.get("off",0); df=p.get("def",0); reb=off+df
            ast=p.get("ast",0); stl=p.get("stl",0); blk=p.get("blk",0)
            to=p.get("to",0); pf=p.get("pf",0)
            pts = p.get("pts",0) or ((fm-m3)*2 + m3*3 + ftm)
            dnp = not(fa or fta or off or df or ast or stl or blk or to or pf)
            tP+=pts; tFm+=fm; tFa+=fa; t3m+=m3; t3a+=a3; tFtm+=ftm; tFta+=fta
            tOff+=off; tDef+=df; tAst+=ast; tStl+=stl; tBlk+=blk; tTo+=to; tPf+=pf
            name_cell = f'{esc(p["name"])} <span style="color:#999;font-style:italic;font-weight:400">DNP</span>' if dnp else esc(p["name"])
            mn = p.get("min", 0)
            if dnp:
                rows += f'<tr><td>{esc(p.get("num",""))}</td><td class="nl">{name_cell}</td><td>0</td><td>0-0</td><td>0-0</td><td>0-0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0:00</td></tr>'
            else:
                rows += f'<tr><td>{esc(p.get("num",""))}</td><td class="nl">{name_cell}</td><td class="b">{pts}</td><td>{fm}-{fa}</td><td>{m3}-{a3}</td><td>{ftm}-{fta}</td><td>{off}</td><td>{df}</td><td>{reb}</td><td>{ast}</td><td>{stl}</td><td>{blk}</td><td>{to}</td><td>{pf}</td><td>{mn}:00</td></tr>'
        tot = f'<tr class="tr"><td></td><td class="nl">TOTAL</td><td class="b">{tP}</td><td>{tFm}-{tFa}</td><td>{t3m}-{t3a}</td><td>{tFtm}-{tFta}</td><td>{tOff}</td><td>{tDef}</td><td>{tOff+tDef}</td><td>{tAst}</td><td>{tStl}</td><td>{tBlk}</td><td>{tTo}</td><td>{tPf}</td><td></td></tr>'
        return rows + tot, tP, tFm, tFa, t3m, t3a, tFtm, tFta, tOff, tDef, tAst, tStl, tBlk, tTo, tPf

    a_rows, *a_t = build_team("away")
    h_rows, *h_t = build_team("home")

    # Build period breakdown HTML
    ps = stats.get("periodStats", {})
    def pb_section(side, side_name, t_totals, score):
        team_ps = ps.get(side, {})
        rows = ""
        for q in range(1, 5):
            s = team_ps.get(str(q), {})
            pts=s.get("pts",0); reb=(s.get("off",0)+s.get("def",0))
            rows += f'<tr><td class="nl">Q{q}</td><td class="b">{pts}</td><td>{s.get("fgm",0)}-{s.get("fga",0)}</td><td>{s.get("t3m",0)}-{s.get("t3a",0)}</td><td>{s.get("ftm",0)}-{s.get("fta",0)}</td><td>{reb}</td><td>{s.get("ast",0)}</td><td>{s.get("to",0)}</td></tr>'
        rows += f'<tr class="tr"><td class="nl">Final</td><td class="b">{score}</td><td>{t_totals[1]}-{t_totals[2]}</td><td>{t_totals[3]}-{t_totals[4]}</td><td>{t_totals[5]}-{t_totals[6]}</td><td>{t_totals[7]+t_totals[8]}</td><td>{t_totals[9]}</td><td>{t_totals[12]}</td></tr>'
        return f'<div class="pb"><div class="pb-title">Period Breakdown — {esc(side_name)}</div><table><thead><tr><th class="nl" style="width:30pt"></th><th>PTS</th><th>FG</th><th>3PT</th><th>FT</th><th>REB</th><th>AST</th><th>TO</th></tr></thead><tbody>{rows}</tbody></table></div>'
    pb_html = pb_section("away", away_name, a_t, away_score) + '\n' + pb_section("home", home_name, h_t, home_score)

    # Point type data
    pt = stats.get("pointTypes", {})
    apt = pt.get("away", {}); hpt = pt.get("home", {})

    html = f'''<!DOCTYPE html><html><head><meta charset="UTF-8"><title>NSMT Game Report</title>
<style>
@page{{size:letter portrait;margin:.4in .35in}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Helvetica Neue',Arial,sans-serif;font-size:7.5pt;color:#111;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:6pt}}
.rh{{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10pt;padding-bottom:6pt;border-bottom:2pt solid #111;margin-bottom:8pt}}
.rh-logo{{display:flex;align-items:center;justify-content:center}}
.rh-logo img{{height:37pt;display:block}}
.rh-center{{text-align:center}}
.rh-event{{font-size:12pt;font-weight:900;letter-spacing:.3px}}
.rh-meta{{font-size:6.5pt;color:#444;margin-top:2pt}}
.rh-status{{font-size:8.5pt;font-weight:900;text-transform:uppercase;margin-top:2pt;letter-spacing:1px}}
.rh-right{{text-align:right;font-size:6.5pt;color:#555;line-height:1.6}}
.ts{{margin-bottom:8pt}}
.th{{display:flex;align-items:center;background:#111;color:#fff;padding:3.5pt 8pt}}
.th-name{{flex:1;font-size:10pt;font-weight:900;letter-spacing:.3px}}
.th-score{{font-size:14pt;font-weight:900;background:#fff;color:#111;padding:1pt 7pt;border-radius:2pt;min-width:26pt;text-align:center;line-height:1.4}}
table{{width:100%;border-collapse:collapse}}
th{{background:#f0f0f0;font-size:5.5pt;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:2.5pt 3pt;text-align:center;border:1pt solid #ccc}}
th.nl,td.nl{{text-align:left}}
td{{padding:2pt 3pt;text-align:center;border-bottom:.5pt solid #eee;border-right:.5pt solid #eee;font-size:7pt}}
td.b{{font-weight:800}}
tbody tr:nth-child(even){{background:rgba(0,0,0,.04)}}
tr.tr td{{border-top:1.5pt solid #999;font-weight:700;background:#f5f5f5}}
.sec3{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8pt;margin-top:8pt}}
.sec-title{{font-size:6pt;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#555;padding-bottom:2pt;border-bottom:1pt solid #bbb;margin-bottom:3pt}}
.smtbl{{width:100%;border-collapse:collapse}}
.smtbl th{{font-size:5.5pt;padding:2pt 4pt;background:#f0f0f0;border:1pt solid #ccc}}
.smtbl td{{font-size:7pt;padding:2pt 4pt;border-bottom:.5pt solid #eee;text-align:center}}
.smtbl td.nl{{text-align:left}}
.pb{{margin-top:8pt}}
.pb-title{{font-size:6pt;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#555;padding-bottom:2pt;border-bottom:1pt solid #bbb;margin-bottom:3pt}}
.pb table th{{background:#f0f0f0;font-size:5.5pt;padding:2pt 3pt;border:1pt solid #ccc}}
.pb table td{{font-size:7pt;padding:2pt 3pt;text-align:center;border:.5pt solid #eee}}
.pb-team-hdr{{background:#e8e8e8;font-size:6pt;font-weight:800;letter-spacing:1px;text-transform:uppercase;text-align:center;padding:2pt;border:1pt solid #ccc}}
.rf{{margin-top:8pt;padding-top:4pt;border-top:.5pt solid #ccc;font-size:5.5pt;color:#999;text-align:center;letter-spacing:.3px}}
</style></head><body>

<div class="rh">
  <div class="rh-logo"><img src="http://localhost:8000/silver-hoopfest-logo.png" alt="NSMT"></div>
  <div class="rh-center">
    <div class="rh-event">{esc(event)}</div>
    <div class="rh-meta">{esc(now)} {esc(tstr)} &bull; {esc(venue)}</div>
    <div class="rh-status">{esc(status)}</div>
  </div>
  <div class="rh-right">Keeper: Producer<br>{esc(now)}<br>thensmt.com</div>
</div>

<div class="ts">
  <div class="th"><span class="th-name">{esc(away_name)}</span><span class="th-score">{away_score}</span></div>
  <table><thead><tr>
    <th style="width:16pt">#</th><th class="nl" style="width:90pt">PLAYER</th>
    <th>PTS</th><th>FG</th><th>3PT</th><th>FT</th><th>OFF</th><th>DEF</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>MIN</th>
  </tr></thead><tbody>{a_rows}</tbody></table>
</div>

<div class="ts">
  <div class="th"><span class="th-name">{esc(home_name)}</span><span class="th-score">{home_score}</span></div>
  <table><thead><tr>
    <th style="width:16pt">#</th><th class="nl" style="width:90pt">PLAYER</th>
    <th>PTS</th><th>FG</th><th>3PT</th><th>FT</th><th>OFF</th><th>DEF</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>MIN</th>
  </tr></thead><tbody>{h_rows}</tbody></table>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:8pt;margin-top:8pt">
  <div>
    <div class="sec-title">Point Type</div>
    <table class="smtbl"><thead><tr><th class="nl"></th><th>{esc(away_code)}</th><th>{esc(home_code)}</th></tr></thead>
    <tbody>
      <tr><td class="nl">In Paint</td><td>{apt.get("inPaint",0)}</td><td>{hpt.get("inPaint",0)}</td></tr>
      <tr><td class="nl">Fast Break</td><td>{apt.get("fastBreak",0)}</td><td>{hpt.get("fastBreak",0)}</td></tr>
      <tr><td class="nl">2nd Chance</td><td>{apt.get("secondChance",0)}</td><td>{hpt.get("secondChance",0)}</td></tr>
      <tr><td class="nl">Off Turnovers</td><td>{apt.get("offTurnovers",0)}</td><td>{hpt.get("offTurnovers",0)}</td></tr>
    </tbody></table>
  </div>
  <div>
    <div class="sec-title">Team Stats</div>
    <table class="smtbl"><thead><tr><th class="nl"></th><th>{esc(away_code)}</th><th>{esc(home_code)}</th></tr></thead>
    <tbody>
      <tr><td class="nl">FG%</td><td>{pct(a_t[1],a_t[2])}</td><td>{pct(h_t[1],h_t[2])}</td></tr>
      <tr><td class="nl">3PT%</td><td>{pct(a_t[3],a_t[4])}</td><td>{pct(h_t[3],h_t[4])}</td></tr>
      <tr><td class="nl">FT%</td><td>{pct(a_t[5],a_t[6])}</td><td>{pct(h_t[5],h_t[6])}</td></tr>
      <tr><td class="nl">Rebounds</td><td>{a_t[7]+a_t[8]}</td><td>{h_t[7]+h_t[8]}</td></tr>
      <tr><td class="nl">Assists</td><td>{a_t[9]}</td><td>{h_t[9]}</td></tr>
      <tr><td class="nl">Turnovers</td><td>{a_t[12]}</td><td>{h_t[12]}</td></tr>
      <tr><td class="nl">Steals</td><td>{a_t[10]}</td><td>{h_t[10]}</td></tr>
      <tr><td class="nl">Blocks</td><td>{a_t[11]}</td><td>{h_t[11]}</td></tr>
    </tbody></table>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:8pt;margin-top:6pt">
{pb_html}
</div>

<div class="rf">Nova Sports Media Team &mdash; thensmt.com &mdash; Northern Virginia High School Sports<br>{esc(event)} &bull; {esc(now)} {esc(tstr)} &bull; Official Game Report</div>
</body></html>'''
    return html, away_name, home_name, away_score, home_score, status

def html_to_pdf(html_str, output_path):
    """Save as HTML and open in browser for print-to-PDF."""
    html_path = output_path.replace(".pdf", ".html")
    with open(html_path, "w") as f:
        f.write(html_str)
    # Open in default browser which can print to PDF
    import subprocess
    subprocess.run(["open", html_path])
    print(f"  Saved: {html_path}")
    print(f"  Opened in browser — use Cmd+P > Save as PDF to export")
    return True

async def export_current():
    state = await get_state()
    html, away, home, a_score, h_score, status = build_report_html(state)

    safe = lambda s: s.replace(" ","_").replace("/","_")
    filename = f"{safe(away)}_vs_{safe(home)}_{a_score}-{h_score}_{status}"
    output = os.path.expanduser(f"~/Desktop/{filename}.pdf")

    print(f"  {away} {a_score} — {home} {h_score} ({status})")
    html_to_pdf(html, output)
    print(f"  Saved: {output}")
    return output

if __name__ == "__main__":
    asyncio.run(export_current())
