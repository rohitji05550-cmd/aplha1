-- SmartSetupUAE — Dashboard persistence (Phase 16 / Iteration 9)
-- Run this once in Supabase SQL Editor. Idempotent.

-- ============ 1. KYC DOCUMENTS =============
create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  doc_key text not null check (doc_key in ('passport','photo','visa_stamp','emirates_id')),
  file_name text not null,
  file_size_bytes bigint not null default 0,
  file_b64 text,                       -- short term: base64; replace with storage URL later
  uploaded_at timestamptz not null default now(),
  unique (user_email, doc_key)
);
create index if not exists kyc_documents_email_idx on public.kyc_documents (user_email);

-- ============ 2. MEMBERSHIPS =============
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  plan text not null default 'founder_club',
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  order_reference text,
  unique (user_email, plan)
);
create index if not exists memberships_email_idx on public.memberships (user_email);

-- ============ 3. RLS — service-role bypasses, anon needs explicit policies =============
alter table public.kyc_documents enable row level security;
alter table public.memberships  enable row level security;

-- Anon read/write own rows by matching email column to auth.jwt() email claim.
drop policy if exists "kyc_select_own"   on public.kyc_documents;
drop policy if exists "kyc_insert_own"   on public.kyc_documents;
drop policy if exists "kyc_update_own"   on public.kyc_documents;
drop policy if exists "kyc_delete_own"   on public.kyc_documents;

create policy "kyc_select_own" on public.kyc_documents for select
  using ( user_email = lower(coalesce(auth.jwt() ->> 'email', '')) );
create policy "kyc_insert_own" on public.kyc_documents for insert
  with check ( user_email = lower(coalesce(auth.jwt() ->> 'email', '')) );
create policy "kyc_update_own" on public.kyc_documents for update
  using ( user_email = lower(coalesce(auth.jwt() ->> 'email', '')) );
create policy "kyc_delete_own" on public.kyc_documents for delete
  using ( user_email = lower(coalesce(auth.jwt() ->> 'email', '')) );

drop policy if exists "memberships_select_own" on public.memberships;
drop policy if exists "memberships_insert_own" on public.memberships;
drop policy if exists "memberships_update_own" on public.memberships;

create policy "memberships_select_own" on public.memberships for select
  using ( user_email = lower(coalesce(auth.jwt() ->> 'email', '')) );
create policy "memberships_insert_own" on public.memberships for insert
  with check ( user_email = lower(coalesce(auth.jwt() ->> 'email', '')) );
create policy "memberships_update_own" on public.memberships for update
  using ( user_email = lower(coalesce(auth.jwt() ->> 'email', '')) );

-- ============ 4. Grants =============
grant select, insert, update, delete on public.kyc_documents to authenticated, anon;
grant select, insert, update         on public.memberships  to authenticated, anon;
