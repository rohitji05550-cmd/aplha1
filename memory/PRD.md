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

### UI / Layout — across every page
- **Language selector now uses flag images (flagcdn.com)** instead of unicode emojis — UK/AE/IN/PK… flags now render reliably on every OS (was showing "GB" text on Windows). 30 languages mapped to ISO codes.
- **Hero gap removed** on every page: global CSS rule kills the empty space between navbar and hero headline so the full hero loads in one viewport. Per-page padding compressed from `pt-16/pt-24` to `pt-10/pt-14`.
- **Search bar font + button overlap fixed** on Home + AI Search: search input padding reduced from 46% to a fixed 200px so the placeholder is fully visible; `Find My Match` / `Search` button max-width capped at 38%, text font size clamped to keep the label inside the button. RTL layouts swap to padding-left automatically. Mobile collapses the button label to icon-only.
- **Global base font** raised from 14px to 15px — pages no longer feel cramped after the Tailwind rem rescale.
- **Compare detailed feature table** now uses `table-fixed` with explicit `colgroup` widths + `whitespace-nowrap` cells, eliminating the vertical letter-stacking ("VI / S / A / H" issue). Headers are properly aligned middle.
- **Compare hero** widened from `max-w-5xl` to `max-w-[1400px]`, "Live pricing from our database" line now centered, title size reduced for proper balance.
- **FreeZones page**: view tabs (Large / Cards / Compact / List) now centered (was left-aligned), hero widened to 1400px, font sizes tuned.
- **Golden Visa hero**: title font reduced from clamp(2.8-5.5rem) → clamp(2.2-4rem), padding from py-24/32 → py-14/20. Pages no longer look "ugly with massive fonts".
- **AI Search page**: hero compacted, search bar widened to `max-w-3xl`, added a 3-card info section ("Why AI Search · No commission bias · 30-second match") + 5-question FAQ block in the lower part — replaces the empty white space the user complained about.
- **About page** completely rewritten with the founder's personal story (3 quote-style paragraphs), company details card (Axiscrest-Global FZE LLC · Lic 262843696888 · Amber Gem Tower, Ajman · +971 58 590 3155 · info@smartsetupuae.ae), differentiators block, and a 3-person team section (Pankaj Choudhary / Sarah Jenkins / Mohammed Alam).
- **FAQs page** expanded from 8 questions to 26+ questions organised into 6 categories (Setup & Licences · Pricing · Visa & Golden Visa · VAT/CT/Compliance · Banking · About Us). Each question gets a detailed multi-sentence answer. Live search box filters across all categories.
- **Golden Visa page** gets a 6-question FAQ section at the bottom (timeline, no-property routes, family sponsorship, residency abroad, employer freedom, total fees).

### Functional fixes
- **Language switch glitch fixed**: setting a new language now hard-reloads the page after 120 ms so Google Translate cannot get "stuck" on the previous language during SPA navigation.
- **Blog "Close Article" button no-longer crashes**: missing `Button` import added.
- **Navbar admin clutter resolved**: when the logged-in user is admin / manager / staff / reviewer, the navbar shows a SINGLE "Admin" pill (amber) which doubles as the account menu — replaces the two side-by-side pills ("Test" + "Admin") the user complained about. Menu items: Admin Panel / Dashboard / Edit Profile / Logout.
- **Edit Profile target** now points to `/dashboard?tab=profile` (was broken `/dashboard`).
- **Founders Club hero "Join for AED 999" button** now uses the same Stripe `buyNow` flow as the card / CTA buttons (was navigating to a broken checkout URL).
- **Resources nav**: "Guides" replaced with "Career" (links to `/about#careers`) as requested.

### Branding & PDF
- **AI Search PDF header** rebranded to "SmartSetupUAE.ae" with subline "by Axiscrest-Global FZE LLC · Licence 262843696888 · Amber Gem Tower, Ajman" + phone + email + website on every page.
- **Login flow**: replaced corner toast with a centered animated loading overlay (orbit spinner + progress bar + "Signing you in… / Creating your account…" copy).

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
