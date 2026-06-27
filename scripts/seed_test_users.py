"""Seed test users in Supabase (Admin + Manager + Staff + Reviewer + 2 Clients).

Uses Supabase's Auth Admin API which is fully supported by the service_role key
— this is the ONE thing service_role can do beyond pure CRUD, because it's the
Auth Admin API talking to the auth schema with elevated rights.

Run with:  python /app/scripts/seed_test_users.py
"""
import os
import sys
import httpx

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://smrsaedmuaizlesehpee.supabase.co")
SERVICE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtcnNhZWRtdWFpemxlc2VocGVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxODAxNywiZXhwIjoyMDg5Nzk0MDE3fQ.8-YuR8nJW3W4YvmSCoAxXCRQm1A5t9uC9Bgtft3IYXk",
)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# email, password, role, full_name, phone
USERS = [
    ("admin@smartsetupuae.ae",    "BALAJI@0555",   "admin",    "SmartSetup Admin",     "+971585903155"),
    ("manager@smartsetupuae.ae",  "Manager@0555",  "manager",  "Operations Manager",   "+971585903156"),
    ("staff@smartsetupuae.ae",    "Staff@0555",    "staff",    "Onboarding Staff",     "+971585903157"),
    ("reviewer@smartsetupuae.ae", "Reviewer@0555", "reviewer", "KYC Reviewer",         "+971585903158"),
    ("client@smartsetupuae.ae",   "Client@0555",   "client",   "Demo Client",          "+971585903159"),
    ("test@smartsetupuae.ae",     "Test@0555",     "client",   "Test Client",          "+971585903160"),
]


def upsert_user(email: str, password: str, role: str, full_name: str, phone: str) -> dict:
    """Create the auth user, then upsert profile row with the desired role."""
    out = {"email": email, "role": role}
    with httpx.Client(timeout=20) as c:
        # 1) Create auth user (or update password if already exists)
        r = c.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=HEADERS,
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name, "phone": phone, "role": role},
                "app_metadata": {"provider": "email", "role": role},
            },
        )
        if r.status_code == 422:
            # Already exists — fetch user id by signing in
            tok = c.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={"apikey": SERVICE_KEY, "Content-Type": "application/json"},
                json={"email": email, "password": password},
            )
            if tok.status_code < 300:
                out["user_id"] = tok.json().get("user", {}).get("id")
                out["auth"] = "exists"
            else:
                # password may have changed; reset via admin endpoint
                # use the list endpoint as a final resort
                listing = c.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=HEADERS, params={"per_page": "200"})
                for u in listing.json().get("users", []):
                    if u.get("email") == email:
                        upd = c.put(
                            f"{SUPABASE_URL}/auth/v1/admin/users/{u['id']}",
                            headers=HEADERS,
                            json={"password": password, "email_confirm": True,
                                  "user_metadata": {"full_name": full_name, "phone": phone, "role": role},
                                  "app_metadata": {"provider": "email", "role": role}},
                        )
                        out["user_id"] = u["id"]
                        out["auth"] = "pwd-reset" if upd.status_code < 300 else f"reset-fail {upd.status_code}"
                        break
        elif r.status_code >= 400:
            out["auth"] = f"create-fail {r.status_code}: {r.text[:200]}"
            return out
        else:
            data = r.json()
            out["user_id"] = data.get("id")
            out["auth"] = "created"

        # 2) Upsert profile row with the right role (only for staff-side roles —
        #    clients live in auth.users only and never get an app_role).
        if out.get("user_id") and role in ("admin", "manager", "staff", "reviewer"):
            prof = c.post(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json={
                    "id": out["user_id"],
                    "email": email,
                    "full_name": full_name,
                    "role": role,
                },
            )
            out["profile"] = "ok" if prof.status_code < 300 else f"{prof.status_code}: {prof.text[:200]}"
        elif out.get("user_id"):
            out["profile"] = "n/a (client)"
    return out


def login_smoke_test(email: str, password: str) -> str:
    """Verify we can sign in with the created credentials."""
    with httpx.Client(timeout=15) as c:
        r = c.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SERVICE_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": password},
        )
        if r.status_code >= 400:
            return f"login-fail {r.status_code}: {r.text[:140]}"
        data = r.json()
        return "login-ok · access_token=" + (data.get("access_token") or "")[:18] + "…"


def main():
    print("=" * 70)
    print(f"Seeding test users in {SUPABASE_URL}")
    print("=" * 70)
    results = []
    for email, password, role, name, phone in USERS:
        r = upsert_user(email, password, role, name, phone)
        login = login_smoke_test(email, password)
        results.append((email, password, role, r, login))
        print(f"  {role:<8} {email:<32} -> {r.get('auth','?')} | profile={r.get('profile','?')} | {login}")
    print()
    print("=" * 70)
    print("CREDENTIALS (paste into your password manager — also saved to test_credentials.md)")
    print("=" * 70)
    for email, pwd, role, _, _ in results:
        print(f"  {role:<8}  {email:<32}  {pwd}")
    print()


if __name__ == "__main__":
    sys.exit(main())
