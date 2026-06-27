# Admin Panel — Complete Click-Through Workflow

Every button, every click, every panel — what opens, what changes, what saves.

---

## 0. ENTRY POINT

| You click | What happens |
|---|---|
| Navbar → "Admin" pill (amber) | Opens dropdown: Admin Panel / Dashboard / Edit Profile / Logout |
| Click "Admin Panel" | Navigates to `/admin`. AdminPanel.jsx mounts. Auth guard reads `useAuth()`. If role ∉ {admin, manager, staff, reviewer, founder} → shows "Admin access required" page. Else renders the new sidebar layout. |
| Sidebar (left, dark teal, 248 px sticky) | 12 nav items. Active item highlighted in amber-gold with left border accent. |
| Top header strip (white, sticky) | Shows current tab breadcrumb + "Synced with Supabase smrsaedmuaizlesehpee" indicator. |

---

## 1. OVERVIEW TAB  (default)

`AdminOverview` component. Reads `/api/admin/dashboard/stats` (Supabase service-role count of leads/orders/packages/activities/etc).

| You click | What happens |
|---|---|
| **7 colored KPI cards** | Read-only stat ribbon. Each card shows total + sub-label (e.g. "Total Leads · 7 new · 0 converted"). |
| **Seed 50 dummy leads** button | `POST /api/admin/seed/dummy`. Inserts 50 fake leads + 25 completed companies + 5 founder-club rows + 30 appointments tagged `TEST_DATA`. Toast confirms count. KPIs auto-refresh. |
| **Delete TEST_DATA** button | Confirm dialog → `DELETE /api/admin/seed/cleanup`. Removes all rows tagged `TEST_DATA`. |
| **↻ Refresh** button | Re-fetches stats. |
| **Shortcut cards** (Add freezone package / Approve KYC / Review payment proofs) | Currently visual nav prompts — click anywhere on the card to switch to the matching tab. |

---

## 2. SUPPORT TAB  ← NEW

Split-pane: left = ticket list (400 px), right = thread.

### Left pane

| You click | What happens |
|---|---|
| Filter pill **Open** | Lists tickets with status=open (`GET /api/support/tickets?status=open`) |
| Filter pill **In progress** | status=in_progress |
| Filter pill **Mine** | `?mine=true` — only tickets assigned to your email |
| Filter pill **Resolved** | status=resolved |
| Filter pill **All** | no filter |
| Auto-refresh | Every 20 seconds the list re-fetches. |
| Click any ticket row | `GET /api/support/tickets/{id}` → loads thread into right pane. Shows reference (`SST-XXXXXXXX`), customer name + email + phone, channel (web/aria/whatsapp/email), priority, SLA badge. |

SLA badge logic:
* If `first_response_at` empty AND minutes-since-created ≤ 30 → green "SLA Nm left"
* If `first_response_at` empty AND > 30 → red "SLA breached Nm"
* If `first_response_at` set → blue "First reply sent"
* If status ∈ {resolved, closed} → no badge

### Right pane (after picking a ticket)

| You click | What happens |
|---|---|
| **Claim ticket** (visible when assigned_to is empty) | `POST /api/support/tickets/{id}/claim`. Server sets assigned_to = your email AND status → in_progress. Pill replaces with "Assigned: you@…". |
| **Mark resolved** | `PATCH /api/support/tickets/{id}` with `{status:'resolved'}`. Sets `resolved_at`. SLA badge disappears. Button switches to "Reopen". |
| **Reopen** | Sets status back to open. |
| **Reply input + Send** | `POST /api/support/tickets/{id}/messages` with `{body}`. Saves message with `from_role='agent'`. If this is the first staff reply, also sets `first_response_at` (SLA met). Re-fetches thread. |
| **Enter key in input** | Same as clicking Send. |
| Customer/agent message bubble | Color-coded: customer = white, Aria = emerald, agent = solid green (right-aligned), internal note = amber. Each shows from_role · from_email · time-ago. |

### How a ticket is born

1. Customer fills the Lead Form inside the Aria chat (Name + Email + Phone + Country code).
2. `submitLead()` calls `POST /api/aria/save-lead` (existing) AND `POST /api/support/tickets` (new):
   - `subject` = last user message snippet
   - `message` = transcript of last 6 turns
   - `channel` = "aria"
   - `customer_email`, `customer_name`, `phone` from the form
3. Backend creates ticket → references `SST-XXXXXXXX`, status=open.
4. Backend calls Claude Sonnet 4.5 (Emergent key) with an SST-specific system prompt → AI replies in 3–4 sentences, stored as second message with `from_role='aria'`. `first_response_at` set.
5. Ticket appears in admin panel for every staff member (auto-polled every 20 s).
6. First staff to click **Claim** owns it. From that moment SLA = answered.
7. Agent + customer exchange messages until **Mark resolved**.

---

## 3. LEADS TAB

| You click | What happens |
|---|---|
| **Reload** | `GET /rest/v1/leads?select=*&order=created_at.desc&limit=100` (Supabase via anon key). |
| **Export CSV** | Generates a CSV of `allLeads` (Supabase + any local-only fallbacks). |
| **Status `<select>`** on a row | `PATCH /rest/v1/leads?id=eq.{id}` with `{status: new/contacted/qualified/proposal/won/lost}`. Auto-reloads. Local-only leads show "local-only" badge instead (can be re-imported with the seed button on overview). |

---

## 4. ORDERS TAB

| You click | What happens |
|---|---|
| **Reload** | `GET /rest/v1/checkout_orders` |
| **Export CSV** | Dumps orders.csv |
| **Status `<select>`** | `updateOrderStatus(id, status)` → Supabase PATCH. Sends WhatsApp/email confirmation if status = `paid` (existing hook). |

---

## 5. COUPONS TAB

| You click | What happens |
|---|---|
| **+ New coupon** | Inline form: code, type (percent/flat), value, max_uses, expires_at. `POST /rest/v1/coupons`. |
| **Edit** on a row | Replaces row with editable input fields + Save/Cancel. `PATCH /rest/v1/coupons?id=eq.{id}`. |
| **Delete** | Confirm → `DELETE /rest/v1/coupons?id=eq.{id}`. |

---

## 6. MEMBERSHIPS TAB

| You click | What happens |
|---|---|
| **Toggle Active** | `setMembershipActive(id, true|false)`. Used to revoke a Founder Club membership without deleting historic record. |
| **Reload** | Fetches `memberships` table. |

---

## 7. KYC TAB

| You click | What happens |
|---|---|
| **Open file** | Streams the file via Supabase Storage signed URL (10-min expiry). |
| **Approve / Reject** | Updates `kyc_documents.status`. The customer's dashboard updates instantly because their KYC list polls every 30 s. |

---

## 8. PAYMENT PROOFS TAB  (fixed in iteration 2)

| You click | What happens |
|---|---|
| Filter pills | pending/approved/rejected/all. |
| **View** | Signed Supabase Storage URL → modal preview (image or PDF iframe). |
| **Approve** | `PATCH /rest/v1/payment_proofs` with status=approved + reviewed_by + reviewed_at. |
| **Reject** | Same but status=rejected. |

---

## 9. PRICING TAB  ← LIVE EDITOR (new)

`PricingEditor` component. Reads `/api/admin/packages` (backend → Supabase service role → freezone_packages).

| You click | What happens |
|---|---|
| **+ Add package** | Shows a 8-field form (freezone, name, base_price, visas_included, activities_included, office_type, duration_years, notes). Click Save → `POST /api/admin/packages` → new row in Supabase. Public site (`/free-zones`, `/compare`, `/ai-search`) reads from the same table on next page load. |
| **Filter input** | Client-side filter by freezone / package / notes / office_type. |
| **Edit** on row | Row becomes inline-editable. Save → `PATCH /api/admin/packages/{id}`. |
| **Hide** on row | Soft delete → `DELETE /api/admin/packages/{id}` sets `is_active=false`. Public site stops showing the package. |
| **↻ Refresh** | Re-fetches. |

Permissions: Backend `_assert_admin` resolves your bearer token → role must be admin, manager or founder (manager can edit; staff/reviewer cannot).

---

## 10. ACTIVITIES TAB

| You click | What happens |
|---|---|
| **Reload Activities** | Reads first 100 rows of `activities_master` (the 12,719-row index). Use this to sanity-check AI Search will find your activity. |

(Future: add inline edit for activity name / DED code — same pattern as Pricing Editor.)

---

## 11. ROLES TAB

Visual matrix only — shows which role can see which Supabase table (RLS rules). No write action.

---

## 12. TEAM TAB

| You click | What happens |
|---|---|
| **Manage** on a row | Opens the right-side panel. |
| Right panel: **Full name** | Optimistic edit. |
| Right panel: **Role select** | admin/manager/staff/reviewer/client. |
| **Assigned manager** | For staff/reviewer accounts. |
| **Reset password** input | New password. |
| **Disable account** checkbox | Soft-disables the auth user. |
| **Save user changes** | `PATCH /api/admin/users` (existing `admin_users.py`). Role escalation guards: manager cannot touch admin or other managers. |

---

## SAFETY RAILS (apply to every write action)

* All writes go through `/api/admin/...` (FastAPI), never direct from the browser → service-role key never leaves the server.
* Every backend endpoint resolves the JWT → looks up `profiles.role` → blocks non-admin actions with 403.
* Mobile <lg viewport: sidebar collapses; horizontal tab strip appears at the top of the content area (same testids).
* Hot-reload friendly — every component is functional + memoised so editing one tab doesn't unmount the others.

---

## END-TO-END EXAMPLE — Customer ticket → resolution

1. **Customer** on `/free-zones/ifza` clicks the Aria bubble → "I want IFZA for AI consultancy".
2. Aria streams a price-aware reply (Claude Sonnet 4.5).
3. Customer says "yes call me" → Aria detects `[CAPTURE_LEAD]` and shows the inline form.
4. Customer fills form → submits.
5. Front-end fires TWO requests in parallel:
   - `POST /api/aria/save-lead` → row in Supabase `leads`
   - `POST /api/support/tickets` (channel=aria) → row in MongoDB `support_tickets`, plus 1 customer message + Aria's auto-reply
6. **Inside 20 s** the new ticket pings every admin tab via the auto-poll.
7. **First staff member to click Claim** wins it. SLA timer is met (first_response_at already set by Aria).
8. Staff replies in the thread → customer gets the message via dashboard or WhatsApp (if you wire the webhook).
9. Staff clicks **Mark resolved** → `resolved_at` saved. Stats update. KPIs show "12 resolved this week" etc (future widget).

Total customer wait time before they see a real human: under 30 minutes guaranteed.
