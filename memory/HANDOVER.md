# SmartSetupUAE — Session Handover (continuity for any Emergent account)

> **READ FIRST.** This file is the single source of truth for what's done, what's pending, and what context the next agent needs. Updated every iteration.

## 🔑 Critical credentials & access
- **Supabase project**: `smrsaedmuaizlesehpee`
  - URL: `https://smrsaedmuaizlesehpee.supabase.co`
  - Anon key + Service role key are stored in `/app/frontend/.env` and `/app/backend/.env` (never commit `.env`)
- **Emergent LLM key** (in `/app/backend/.env`): `EMERGENT_LLM_KEY=sk-emergent-515A95463D8977416A`
- **Admin emails** (hard-coded in `supabase/migrations/0002_admin_crud.sql`): pankaj@axiscrest.com · admin@smartsetupuae.ae · founder@smartsetupuae.ae
- **WhatsApp business**: +971 58 590 3155
- **GitHub repo**: https://github.com/pankajdxb555-star/SMARTSETUPUAE.git
- **Hostinger**: 33 vulnerabilities reported (14 high · 18 medium · 1 low). User has hosting paid. Awaiting hPanel login + scan PDF.

## 🌐 Stack
- React 18 (CRA + CRACO + Tailwind + shadcn/ui) — `/app/frontend`
- FastAPI (Python 3.11) — `/app/backend`
- Supabase (Postgres + Auth + Storage + RLS)
- MongoDB local (status checks only, unused for business data)
- LLM: Gemini 3 Flash (chat/rank via emergentintegrations)

## ✅ DONE — exhaustive list (latest iteration first)

### Iteration 12 (Phase 12 — Aria AI Concierge + i18n)
- `EMERGENT_LLM_KEY` wired into backend `.env`
- `emergentintegrations` installed
- **NEW**: `/app/backend/aria.py` — POST `/api/aria/{chat,smart-rank,save-lead}` with SSE streaming, Gemini 3 Flash, multi-turn memory, system prompt grounded on live Supabase pricing
- **NEW**: `/app/frontend/src/components/AriaWidgets.jsx` — Aria chatbot floating widget + WhatsApp pulse + LanguageSelector
- **NEW**: `/app/frontend/src/context/I18nContext.jsx` — 15-language i18n (EN/AR/HI/UR/ZH/RU/FR/ES/DE/FA/TR/FIL/ID/BN/IT) with auto-RTL
- **NEW**: `/app/frontend/src/components/InteractiveLoader.jsx` — animated zone score-bar loader for AI Search
- **NEW**: `/app/frontend/src/pages/HeroPreview.jsx` — `/preview-hero` route showing proposed AI-first hero (NOT YET swapped into `/`)
- Navbar: AI Search moved to position #1, accent pill style
- LanguageSelector added to navbar (right side)
- SHAMS 0-visa packages added to Supabase: AED 5,750 (1Y) + AED 11,000 (2Y)
- Old `WhatsAppFloat` and `ChatBot` components no longer mounted (replaced by Aria)
- Aria endpoint verified live: correctly quotes ANCFZ AED 4,888 + SHAMS AED 5,750

### Iteration 11 (Phase 11A — AI Search + data cleanup)
- **AI Search 0% match + 0 AED bug** fixed (`activitySearchService.js`) — wrong field names (`p.zone_name/gov/svc` → `p.freezone_name/base_price/service_fee`)
- **PDF Download** for AI Search results: `/app/frontend/src/lib/pdfGenerator.js` — 3-page branded PDF (top-3 + full comparison + next steps)
- **Detailed comparison table** under AI Search results
- **Supabase data cleanup** via `/app/scripts/cleanup_supabase_packages.py`:
  - SHAMS 22 rows renamed with `(1 Year)/(2 Years)/(3 Years)/(4 Years)/(5 Years)/(10 Years)` based on discount %
  - DMCC 3 Flexi Boost duplicates labeled by validity
  - SPC shareholder_count fixed 7 → 1
  - ANCFZ 24 Renewal/Installment duplicates deactivated
- **Package card layout** fixed (`FreeZoneDetail.jsx`) — Price/Visas/Validity/Activities/Shareholders stack
- **`normalizeFreezonePackage()`** exposes `duration_years`, `shareholder_count`, `activities_allowed`
- **Restricted-country warning** in AI Search lead form
- **Navbar redesign** — Logo strict-LEFT, menu CENTER, CTAs strict-RIGHT
- **Watermark removal** strengthened
- **ScratchCard** non-blocking (scrolls past 800px or 25s)
- **`.reveal` CSS** changed to start visible (was opacity:0 → blank sections)
- **Activity Search** compact limit 12 → 60 + "Show all" button + count

## 🔴 PENDING — what next session must do (priority order)

### P0 — blocking core flow
1. **Phase 14 — Auth fix**: Email login + Facebook OAuth currently broken. Check `/app/frontend/src/context/AuthContext.jsx` + `/app/frontend/src/pages/Login.jsx`. Likely cause: missing Supabase auth provider config OR wrong redirect URL. CALL `integration_playbook_expert_v2` for auth before writing any code.
2. **Phase 13 — Hero swap**: User APPROVED `/preview-hero` design with live Supabase prices. Swap into `Home.jsx`. Decision pending: live IFZA price is AED 11,900 (License Only, 0 visa) — user may want to add a promo entry.
3. **Phase 15 — Checkout freezone loop hole**: When user picks IFZA, checkout shows ANCFZ. Fix `/app/frontend/src/pages/Checkout.jsx` lines 140-230 — match by `slug` first, never fall back to `availableZones[0]` (which sorts ANCFZ first by price).
4. **Phase 16 — Cost Calculator**: Multiple issues
   - Yearly discount only shown for zones that actually offer it (check `package_discounts` Supabase table — 27 rows)
   - Visa count cap per zone (IFZA max 3, DMCC up to 100, etc.)
   - Virtual desk / flexi desk / warehouse / industrial prices are wildly wrong — need correct numbers from `service_addons`
   - VAT add-on showing AED 0 (impossible) — fix `service_addons` data
   - "Free Name Reservation" add-on should be added (free service to capture intent)
   - Remove any add-on with `price=0` from display
5. **Phase 17 — Guest checkout + invoice delivery**: Allow checkout without sign-up, then on order confirmation:
   - WhatsApp confirmation via Twilio (NEEDS Twilio key — ask user)
   - Email invoice via SendGrid or Resend (NEEDS key — ask user)
   - PDF invoice generated and stored in Supabase Storage bucket `invoices`
   - Admin + client can see in dashboard
6. **Phase 18 — Payment proof + admin view**:
   - Payment proof upload to Supabase Storage bucket `payment-proofs`
   - Admin sees uploaded files in Admin Panel → Orders → Click row → see proof
   - Status auto-changes `new` → `payment_review` → admin sets `paid`

### P1 — high value
7. **Phase 19 — AI ticket system**: 30-min SLA, 5-min updates. Routes:
   - Customer submits ticket via dashboard or chatbot (`/api/aria/save-ticket`)
   - Aria attempts auto-resolution using LLM + knowledge base
   - If unresolvable, alerts admin via WhatsApp + dashboard
   - Auto-status-update every 5 min via cron-like job
8. **Phase 20 — Coupon stacking + Founder Club**:
   - Logic: only ONE coupon at a time (block stacking)
   - Founder Club members get extra benefit (free renewal reminder, dedicated advisor) but NO additional discount on first order
   - Founder Club next-renewal gets the discount
9. **Phase 21 — Business Activity dropdown UX**:
   - Click "Publishing" tab → expand all subcategories in dropdown (don't just show 12)
   - Premium activities cost more — show `(+AED X)` next to activity name
   - Need `activities_master.premium_fee` column or similar
10. **Phase 22 — FAQs everywhere + SEO**:
    - FAQ sections on Home, every Freezone detail page, Mainland, Cost Calculator, AI Search, Blog detail
    - schema.org/FAQPage markup for Google rich snippets
    - Keyword research per FAQ (e.g., "best free zone for software development uae 2026")
    - Blog detail pages (Phase 13 backlog from old PRD)
    - Sitemap.xml + robots.txt updates
11. **Phase 23 — Security hardening (Hostinger + our build)**:
    - User to share Hostinger hPanel + security scan PDF
    - Our build: FastAPI security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
    - Rate-limit `/api/aria/*`, `/api/auth/*`, `/api/lead/*` (slowapi)
    - `npm audit fix` + `pip-audit` + dependabot
    - Supabase RLS audit (admin-only writes confirmed; verify reads)
    - CSRF tokens on forms
12. **Phase 24 — Founder Club services panel**: renewals tracker (Trade Licence, Emirates ID, VAT filing, Corporate Tax, Municipality) with countdown, one-click renew, WhatsApp reminders

### P2 — polish
13. Aria chatbot save_lead UI wiring — parse `name + WhatsApp` from chat → POST `/api/aria/save-lead`
14. Voice input (Whisper-1) on Aria
15. Multi-year savings calculator on AI Search result page
16. Banking access score per zone (1-5 stars)
17. Reserve AED 999 CTA on AI Search result + zone detail
18. Save chat history to `aria_conversations` Supabase table

## 📂 Supabase schema reference (verified)
| Table | Rows | Notes |
|---|---|---|
| `freezone_packages` | 117 active (after additions) | Source of truth for pricing |
| `activities_master` | 12,719 | Has `freezone, activity_name, activity_code, industry_group, keywords, is_active` |
| `package_benefits` | 1,455 | Detail per-package inclusions |
| `package_addons` | 81 | Optional addons per package |
| `package_discounts` | 27 | Multi-year discount tiers |
| `service_addons` | 24 | Cross-zone services (visa, EID, VAT etc) |
| `coupons` | 5 | WELCOME5, FOUNDER10, EARLY15, FIRST500, SMARTSAVE family |
| `leads` | growing | source: aria-chatbot · ai-search · smart-finder · home-form |
| `orders` | 0 | Empty — Phase 18 work |
| `profiles` | 4 | Auth-linked |
| `founder_club_memberships` | exists | from Phase 17 migration |
| `documents` | exists | KYC uploads |
| `payments` | exists | Phase 18 work |

## 🎯 Current state of key flows
| Flow | Status |
|---|---|
| Browse free zones | ✅ Working (live Supabase) |
| Free zone detail + packages | ✅ Working (clean layout) |
| AI Search | ✅ Working (95%+ scores, real prices, PDF download, restricted country warning) |
| Activity Search | ✅ Working (60 → "Show all" → 2000) |
| Aria chatbot | ✅ Working (grounded on Supabase, streaming, 15 langs) |
| Lead capture | ✅ Working (saves to `leads` table) |
| Cost Calculator | ⚠️ Broken (wrong addon prices, missing per-zone yearly logic) |
| Checkout | ⚠️ Broken (freezone loop hole — picks wrong zone) |
| Sign up / Login (email) | ❌ Broken (Phase 14) |
| Facebook OAuth | ❌ Broken (Phase 14) |
| Guest checkout | ❌ Not built (Phase 17) |
| Order confirmation email/WhatsApp | ❌ Not built (Phase 17) |
| Payment proof upload | ❌ Not built (Phase 18) |
| Admin view of leads/orders/tickets | ⚠️ Partial (Phase 17 admin panel exists, no payment-proof viewer) |
| AI ticket auto-resolution | ❌ Not built (Phase 19) |

## 📝 Decision log (so next agent knows WHY)
- **Why Aria not Zara?** User wanted a custom chatbot, not a copy of setupuae.ai. Aria is the SmartSetupUAE concierge.
- **Why Gemini 3 Flash for Aria?** Sub-1s first-token, cheap (~$0.001/chat), multilingual native.
- **Why 15 languages?** User requested match-or-beat setupuae.ai's 15 languages.
- **Why Supabase service-role in backend ONLY?** Service role bypasses RLS — never exposed to browser.
- **Why preview hero at `/preview-hero` not direct swap?** User asked to see before changing main page.
- **Why no Vercel migration suggested as default?** User has Hostinger paid — work with what's paid.
- **Why hardcoded popular-zone metadata?** `ZONE_META` in `HeroPreview.jsx` has emirate/sectors/speed/note (not in Supabase). Price + visa + activities pull LIVE from `freezone_packages`.

## 🧪 How to test (for any agent)
1. Restart services: `sudo supervisorctl restart backend frontend`
2. Visit `https://uae-formation-beta.preview.emergentagent.com/`
3. Aria works: bottom-right pulse button → opens chat → quick prompt → streaming reply
4. AI Search works: navbar → AI Search → type "software development" → see 95% match + 3 zones + PDF button
5. Test Aria endpoint directly: `curl -s -N -X POST "$API_URL/api/aria/chat" -H "Content-Type: application/json" -d '{"session_id":"t1","message":"cheapest zone?"}' --max-time 10`

## 🚀 Next session — first 5 minutes
1. Read this file (`/app/memory/HANDOVER.md`)
2. Read `/app/memory/PRD.md` (detailed phase log)
3. Read `/app/memory/test_credentials.md`
4. Run `git log --oneline -10` to see latest commits
5. Restart services and verify `/` loads + Aria works
6. Pick the next P0 item and execute

## ⚠️ Things NOT to do
- ❌ Don't re-run `cleanup_supabase_packages.py` — data is already clean
- ❌ Don't change the navbar layout — user just approved current
- ❌ Don't touch `/preview-hero` until user approves the swap (or revert if rejected)
- ❌ Don't use Vercel — user wants to stay on Hostinger
- ❌ Don't write auth code without calling `integration_playbook_expert_v2` first
- ❌ Don't push to GitHub directly — use "Save to GitHub" button
- ❌ Don't expose `SUPABASE_SERVICE_ROLE_KEY` to frontend
