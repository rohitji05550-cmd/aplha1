-- SmartSetupUAE — Admin CRUD (Phase 17 / Iteration 10)
-- Adds: coupons table + admin read policies on existing tables.
-- Run once in Supabase SQL Editor. Idempotent.

-- ============ 1. COUPONS =============
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null default 'percent' check (discount_type in ('percent','flat')),
  discount_value numeric(10,2) not null default 0,
  valid_from timestamptz default now(),
  valid_to timestamptz,
  max_uses integer default 0,            -- 0 = unlimited
  used_count integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists coupons_active_idx on public.coupons (is_active, valid_to);

alter table public.coupons enable row level security;

-- Read for everyone (so checkout can validate), write only for admins
drop policy if exists "coupons_select_active" on public.coupons;
create policy "coupons_select_active" on public.coupons for select
  using ( is_active = true );

-- Admin emails — replace with your real admin team
drop policy if exists "coupons_admin_write" on public.coupons;
create policy "coupons_admin_write" on public.coupons for all
  using (
    lower(coalesce(auth.jwt() ->> 'email','')) in (
      'pankaj@axiscrest.com', 'admin@smartsetupuae.ae', 'founder@smartsetupuae.ae'
    )
  )
  with check (
    lower(coalesce(auth.jwt() ->> 'email','')) in (
      'pankaj@axiscrest.com', 'admin@smartsetupuae.ae', 'founder@smartsetupuae.ae'
    )
  );

grant select on public.coupons to anon, authenticated;
grant insert, update, delete on public.coupons to authenticated;

-- ============ 2. ADMIN READ POLICIES on existing tables =============
-- Allow admins to read ALL kyc_documents and memberships (not just their own).
drop policy if exists "kyc_admin_select_all" on public.kyc_documents;
create policy "kyc_admin_select_all" on public.kyc_documents for select
  using (
    lower(coalesce(auth.jwt() ->> 'email','')) in (
      'pankaj@axiscrest.com', 'admin@smartsetupuae.ae', 'founder@smartsetupuae.ae'
    )
  );

drop policy if exists "memberships_admin_select_all" on public.memberships;
create policy "memberships_admin_select_all" on public.memberships for select
  using (
    lower(coalesce(auth.jwt() ->> 'email','')) in (
      'pankaj@axiscrest.com', 'admin@smartsetupuae.ae', 'founder@smartsetupuae.ae'
    )
  );

drop policy if exists "memberships_admin_update_all" on public.memberships;
create policy "memberships_admin_update_all" on public.memberships for update
  using (
    lower(coalesce(auth.jwt() ->> 'email','')) in (
      'pankaj@axiscrest.com', 'admin@smartsetupuae.ae', 'founder@smartsetupuae.ae'
    )
  );

-- ============ 3. Seed a few starter coupons =============
insert into public.coupons (code, description, discount_type, discount_value, max_uses, is_active)
values
  ('WELCOME5',  'First-time customer 5% off',     'percent', 5,  0, true),
  ('FOUNDER10', 'Founder Club members 10% off',   'percent', 10, 0, true),
  ('EARLY15',   'Early-bird campaign 15% off',    'percent', 15, 200, true)
on conflict (code) do nothing;
