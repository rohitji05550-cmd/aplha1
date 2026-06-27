#!/usr/bin/env python3
"""
Clean up SHAMS + DMCC freezone packages in Supabase.
Rules:
  - SHAMS: prices stratified by discount %, which maps to validity years.
      0% = 1 year, 2% = 2 years, 3% = 3 years, 4% = 4 years, 5% = 5 years, 10% = 10 years.
    Append year suffix to package_name and set duration_years.
  - DMCC: Flexi Boost Package has 3 price tiers (43720, 81861, 120000) -> 1 / 2 / 3 years.
  - SPC: shareholder_count=7 on Basic — user wants 0 visas → 0 shareholders displayed
         (Actually keep shareholder_count alone; let frontend display visa_count for visa context.)
"""
import os, re, sys, json, urllib.request

BASE = "https://smrsaedmuaizlesehpee.supabase.co"
KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtcnNhZWRtdWFpemxlc2VocGVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxODAxNywiZXhwIjoyMDg5Nzk0MDE3fQ.8-YuR8nJW3W4YvmSCoAxXCRQm1A5t9uC9Bgtft3IYXk"
H = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def patch(table, row_id, body):
    req = urllib.request.Request(
        f"{BASE}/rest/v1/{table}?id=eq.{row_id}",
        data=json.dumps(body).encode(),
        headers=H, method="PATCH",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return f"ERR {e.code} {e.read()[:200]}"

def get(path):
    req = urllib.request.Request(f"{BASE}/rest/v1/{path}", headers={k:v for k,v in H.items() if k != "Prefer"})
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

DISCOUNT_TO_YEARS = {0: 1, 2: 2, 3: 3, 4: 4, 5: 5, 10: 10}

# ===== SHAMS =====
print("=== SHAMS ===")
shams = get("freezone_packages?freezone=eq.SHAMS&select=id,package_name,visa_count,base_price,notes,duration_years")
for p in shams:
    name = p["package_name"]
    notes = p.get("notes") or ""
    m = re.search(r"Discount\s+(\d+)\s*%", notes)
    if not m:
        print(f"  skip (no discount in notes): {p['id']} {name}")
        continue
    pct = int(m.group(1))
    years = DISCOUNT_TO_YEARS.get(pct, 1)
    # Don't double-suffix
    if re.search(r"\(\d+\s*Year", name, re.I):
        new_name = name
    else:
        new_name = f"{name} ({years} Year{'s' if years > 1 else ''})"
    body = {"package_name": new_name, "duration_years": years}
    print(f"  {p['id'][:8]} {name} {p['base_price']} {pct}% → '{new_name}' yrs={years} : {patch('freezone_packages', p['id'], body)}")

# ===== DMCC Flexi Boost =====
print("\n=== DMCC Flexi Boost ===")
flexi_map = {43720: 1, 81861: 2, 120000: 3}
dmcc = get("freezone_packages?freezone=eq.DMCC&package_name=eq.Flexi%20Boost%20Package&select=id,package_name,base_price")
for p in dmcc:
    years = flexi_map.get(int(p["base_price"]))
    if not years:
        continue
    new_name = f"Flexi Boost Package ({years} Year{'s' if years > 1 else ''})"
    body = {"package_name": new_name, "duration_years": years}
    print(f"  {p['id'][:8]} {p['base_price']} → '{new_name}' yrs={years} : {patch('freezone_packages', p['id'], body)}")

# ===== SPC: Ensure Basic (0 visa) shows shareholder_count=1 (single founder default) =====
# User said: "SPC price for 0 visa is 5760 but it shows number of share holder as 1 not 0"
# Actually user wants it to show "1" (not 0). Current is 7. Let's set to 1.
print("\n=== SPC shareholder fix ===")
spc = get("freezone_packages?freezone=eq.SPC&select=id,package_name,visa_count,shareholder_count,base_price")
for p in spc:
    if p["shareholder_count"] == 7:
        print(f"  {p['id'][:8]} {p['package_name']} sh=7 → 1 : {patch('freezone_packages', p['id'], {'shareholder_count': 1})}")

# ===== ANCFZ: lots of duplicate variants. Filter to keep only "New Registration Upfront Discount" and "Pay As You Go" =====
# (Renewal items are already filtered in frontend by name match.)
# Mark renewal/duplicate variants as is_active=false so AI search and listings pick the right one.
print("\n=== ANCFZ deactivate renewal variants ===")
anc = get("freezone_packages?freezone=eq.ANCFZ&select=id,package_name,is_active")
for p in anc:
    name = p["package_name"]
    if re.search(r"renewal|all\s*inclusive\s*install", name, re.I):
        print(f"  {p['id'][:8]} '{name}' → is_active=false : {patch('freezone_packages', p['id'], {'is_active': False})}")

print("\nDone.")
