# SmartSetupUAE — PRD & Project Log

> Operating system for UAE company formation — built by Axiscrest-Global FZE LLC.
> Stack: React 18 + FastAPI + Supabase (Postgres) + MongoDB (lifecycle data) + Stripe + Gemini 2.5 vision.

## 1. ORIGINAL PROBLEM STATEMENT (continuation session)
Founder reported a long list of UI / UX / functional issues to fix in this session:
- AI Search bar too small with overlapping fonts; SPC pricing display issue; weird vertical text alignment in Compare table; excessive horizontal whitespace on every page; Golden Visa fonts too big & unmatched; Free Zone view tabs awkward; comparison page Live Pricing alignment off; AI Search lower section underused (need FAQs, keywords, info); Golden Visa font cleanup; gap between navbar and hero on every page; FAQs needed on every page; daily blog with UAE announcements; Career replacing Guides; About Us rewrite with founder story; broken language flag selector (showed "GB" instead of flag); broken admin panel; Founders Club checkout error on test account; edit profile broken; admin nav too cluttered; Arabic search bar overlap; centered language tabs; PDF needs proper company branding (SmartSetupUAE.ae by Axiscrest-Global FZE LLC); language switch glitch needing refresh; Aria needing memory/learning from past conversations; "Logging in" toast → centered loading bar; faster admin → Supabase data flow.

## 2. ARCHITECTURE
| Layer | Tech | Role |
|---|---|---|
| Frontend | React 18 + CRA + CRACO + Tailwind + shadcn/ui | 24+ routes |
| Backend | FastAPI (port 8001, all routes under `/api`) | Bridges Supabase + Mongo + Stripe + Gemini |
| Auth & primary data | Supabase (`smrsaedmuaizlesehpee`) | Auth, leads, orders, packages, activities, coupons |
| Lifecycle & new features | MongoDB | progress, appointments, vault meta, compliance, renewals, invoices, aria_memory |
| AI OCR | Gemini 2.5 Flash | Document data extraction |
| Aria chatbot | Gemini 2.5 Flash + Emergent LLM key fallback | Streaming chat with persistent memory |
| Payments | Stripe test mode | Multi-currency checkout (AED · USD · EUR · GBP · INR) |
| PDF | jsPDF + autoTable | AI Search report + Golden Visa branded guide |
| Email | Resend | Lead/order notifications |
| WhatsApp | Meta Cloud API | Outbound notifications |

## 3. WHAT'S BEEN IMPLEMENTED IN THIS SESSION (2026-06-27)

### ITERATION 3 — Admin redesign + AI Photo Studio + more width

- **Admin Panel — full sidebar redesign** — replaced the horizontal tab strip with a modern control-tower layout:
  - Dark teal sidebar (248 px, sticky) on the left with "Admin Console / Control Tower" header, your email, and 11 vertical nav items each with an icon, label and helper sub-text. Active tab highlights in amber-gold with left border accent.
  - Content area fills the full remaining viewport (no max-width cap on admin) — no more side whitespace.
  - New top header strip shows current section breadcrumb + Supabase sync indicator.
  - AdminOverview redesigned: 7 colorful KPI cards in a single ribbon (emerald / blue / amber / violet / cyan / rose / teal) + Platform Actions bar + 3 shortcut cards.
  - All 11 tabs still have `data-testid="admin-tab-*"`. Mobile <lg shows a horizontal tab strip; desktop shows the sidebar.
- **Universal width pushed further** — global CSS now caps inner containers at `min(1560px, 96vw)` ≥ 1280px, `min(1720px, 95vw)` ≥ 1600px and 1820px on ≥ 1920px. Every page (Home, About, Compare, FreeZones, Golden Visa, FAQs, Blog) now fills the entire 1920px viewport with only ~50px gutters each side.
- **AI Photo Studio (selfie → passport-ready photo)** — new route `/photo-studio` and reusable component `SelfieToPassport`:
  - User can take a selfie via webcam OR upload an existing photo (up to 8 MB).
  - Sends to new backend endpoint `POST /api/photo/passportize` which uses **Gemini Nano Banana** (`gemini-3.1-flash-image-preview`) via the Emergent universal LLM key.
  - AI removes background, applies pure white, re-frames shoulders-up, applies studio lighting, returns base64 PNG.
  - Side-by-side preview (original vs passport-ready), "Use this photo" / "Download" / "Try another" buttons.
  - Fallback: a clearly-visible "Skip — I'll upload my own" link so users who prefer manual submission can route to /dashboard?tab=documents.
  - Trust strip: UAE-compliant · Identity-safe · Private (photos not stored, processed in memory).

### ITERATION 2 — Universal UI fixes (after first user feedback round)
- **Universal page width** — global CSS expands every Tailwind `max-w-3xl/4xl/5xl/6xl/7xl` plus bulk-edit of every page that used hard-coded narrow widths.
- **Universal hero-to-navbar gap** — global CSS sets `section.hero-gradient` padding-top to 0; inner padding-top ~12-20px.
- **Stat cards enlarged** — home page stats use 2xl/[1.85rem] fonts.
- **Home tagline rewritten** — new badge: "UAE's First AI Concierge for Founders · Built by a founder, for founders". Trust strip: "Zero commission · Official UAE pricing · Free for first 500 founders · Lic 262843696888".
- **Golden Visa hero** font reduced (clamp 1.9–3.2rem) — entire hero now fits in one viewport.
- **Real founder bio** — Pankaj described as a nanotechnology engineer who worked with IIT Bombay, Amity, NSIC, Rajasthan University and CCT. Title: "Founder · Engineer · Researcher". Removed fake "15+ years UAE corporate licensing" claim.
- **Admin Panel — Payment Proofs tab** implemented (was missing, causing crash).
- **Founder Club FAQ** clarified pricing (free first 500 → 5% after; VAT only after AED 375K).
- **Universal page width** — added a global CSS override that expands every Tailwind `max-w-3xl/4xl/5xl/6xl/7xl` to 1480px on screens ≥ 1280px and 1640px on ≥ 1600px. Plus bulk-edited every page that used hard-coded `max-w-[1100px]/[1200px]/[1280px]/[1400px]/[1380px]` to `max-w-[1480px]`. Pages no longer have the "phone on desktop" empty side margins.
- **Universal hero-to-navbar gap** — global CSS sets `section.hero-gradient` padding-top to 0 and the inner container padding-top to ~12-20px. All pages now show the hero immediately after the navbar (was 60-100px gap before).
- **Home tagline** rewritten — old "No sign-up required / Free to use / Results in 30 seconds" replaced with "Zero commission from any freezone · Official UAE government pricing · Free for the first 500 founders · Axiscrest-Global FZE LLC · Lic 262843696888". Hero badge says "UAE's First AI Concierge for Founders · Built by a founder, for founders" (no longer mimics setupuae.ai phrasing).
- **Stat cards enlarged** — the 4 home-page stats (40+ Jurisdictions, 12,719 Activities, AED 4,888 Starting, 30 sec) now use 2xl/[1.85rem] fonts (was xl). Popular-Searches chips upsized from text-[11.5px] to text-[13px] with pill padding.
- **Golden Visa hero** font reduced further to clamp(1.9-3.2rem), py-8/12 padding so the entire hero (title + paragraph + 4 bullets + CTA + stats + right card) is visible above the fold.
- **Real founder bio** — about/team rewritten to reflect Pankaj Choudhary's genuine background: nanotechnology engineer in India, deep research with scientists from IIT Bombay, Amity University, NSIC, Rajasthan University and Centre for Converging Technologies (CCT). Title changed to "Founder · Engineer · Researcher". Removed the fabricated "15+ years in UAE corporate licensing" claim. Founder vision rewritten in his own voice: "see the issue, solve the issue".
- **Admin Panel — Payment Proofs tab implemented** — the missing `PaymentProofsTab` component is now defined inside `AdminPanel.jsx` with: filter pills (pending/approved/rejected/all), refresh, a table of bank-transfer proofs (uploaded time, order ref, amount, currency, customer, status, actions), View modal (renders image / PDF via Supabase signed URL), and Approve / Reject buttons that PATCH `payment_proofs.status` in Supabase. No more `ReferenceError` on click.
- **Admin Panel tabs** — converted to a single `.map()` so every tab has a unique `data-testid` (admin-tab-overview / leads / orders / coupons / memberships / kyc / payments / pricing / activities / roles / team).
- **Founder Club pricing copy** updated: explicit Q&As clarifying "Free advisory for the first 500 founders, then a flat 5% service fee" and "UAE VAT only applies above AED 375,000 taxable supplies".

### ITERATION 1 — UI / Layout (all-pages baseline pass)
- **Language selector** uses real flag images (flagcdn.com) — fixed Windows "GB" text issue.
- **Compare detailed feature table** uses table-fixed + colgroup + whitespace-nowrap (vertical letter stacking eliminated).
- **AI Search page** info cards + 5-question FAQ block added in the lower half.
- **About page** full rewrite with founder story + company info card + values + differentiators + 3-person team.
- **FAQs page** expanded 8 → 26+ questions across 6 categories with live search.
- **Golden Visa page** gets a 6-question FAQ section.
- **Navbar admin clutter** — single "Admin" pill that doubles as account menu.
- **Edit Profile route** fixed to `/dashboard?tab=profile`.
- **Founder Club "Join for AED 999"** hero button now uses the same Stripe `buyNow` flow.
- **Resources nav**: "Guides" → "Career".
- **Language switch glitch** fixed (forces 120ms reload).
- **Blog "Close Article"** Button import added.
- **Login flow** centered animated loading overlay (orbit spinner + progress bar).
- **PDF header** rebranded to "SmartSetupUAE.ae" with subline "by Axiscrest-Global FZE LLC · Licence 262843696888 · Amber Gem Tower, Ajman".
- **Aria chat** switched to Emergent universal key (Claude Sonnet 4.5) with direct Gemini auto-fallback.

## 4. CORE STATIC REQUIREMENTS (always-true)
- All URLs/keys via `.env` only — never hardcoded.
- Frontend uses only `process.env.REACT_APP_BACKEND_URL`.
- All backend endpoints under `/api/*`.
- Service-role Supabase calls happen on the server only.

## 5. PRIORITISED BACKLOG (still open)
### P1
- [ ] Daily blog ingestion from UAE government announcements (RSS / scrape) — content engine.
- [ ] Aria persistent memory: store every conversation + lead in `aria_conversations` Supabase table; re-prime Gemini system prompt with most-relevant past exchanges per session.
- [ ] Company-profile PDF (separate from AI Search PDF) + invoice PDF redesign.
- [ ] Admin → Supabase package & price editor (form that POSTs to `/api/admin/packages` and immediately reflects on the public site).
- [ ] Stripe production key — replace `sk_test_emergent` with the user's real test/live key.
### P2
- [ ] Aria multilingual quick-prompts in remaining 25 languages.
- [ ] Per-emirate Mainland sub-pages (DXB / AUH / SHJ / AJM / RAK / UAQ / FUJ).
- [ ] Career page UI (currently re-uses About#careers anchor).

## 6. AUTH CREDENTIALS
Stored in `/app/memory/test_credentials.md`.
