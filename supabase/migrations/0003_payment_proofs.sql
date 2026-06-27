-- Phase 18: Payment proof storage + admin visibility
-- Run in Supabase SQL Editor.

-- 1. Storage bucket for payment proofs (private, only admins + uploader read)
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- 2. RLS — anyone authenticated can INSERT into their own folder
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'pp_self_insert') then
    create policy "pp_self_insert" on storage.objects
      for insert with check (
        bucket_id = 'payment-proofs'
        and (auth.uid()::text = (storage.foldername(name))[1] or auth.role() = 'anon')
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'pp_self_read') then
    create policy "pp_self_read" on storage.objects
      for select using (
        bucket_id = 'payment-proofs'
        and (
          auth.uid()::text = (storage.foldername(name))[1]
          or (auth.jwt() ->> 'email') in ('pankaj@axiscrest.com','admin@smartsetupuae.ae','founder@smartsetupuae.ae')
        )
      );
  end if;
end $$;

-- 3. payment_proofs table — metadata for admin dashboard
create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_ref text,             -- can match orders.id OR a guest-checkout token
  customer_email text,
  customer_name text,
  customer_phone text,
  amount_aed numeric,
  file_path text not null,    -- e.g. "guest/abc.pdf" or "{uid}/proof.pdf"
  file_name text,
  file_size_bytes int,
  mime_type text,
  notes text,
  status text not null default 'pending_review',  -- pending_review | verified | rejected
  reviewed_by text,
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now()
);

create index if not exists payment_proofs_status_idx on public.payment_proofs (status);
create index if not exists payment_proofs_order_ref_idx on public.payment_proofs (order_ref);

alter table public.payment_proofs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'pp_anon_insert') then
    create policy "pp_anon_insert" on public.payment_proofs
      for insert with check (true); -- guest checkout
  end if;
  if not exists (select 1 from pg_policies where policyname = 'pp_self_select') then
    create policy "pp_self_select" on public.payment_proofs
      for select using (
        customer_email = (auth.jwt() ->> 'email')
        or (auth.jwt() ->> 'email') in ('pankaj@axiscrest.com','admin@smartsetupuae.ae','founder@smartsetupuae.ae')
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'pp_admin_update') then
    create policy "pp_admin_update" on public.payment_proofs
      for update using (
        (auth.jwt() ->> 'email') in ('pankaj@axiscrest.com','admin@smartsetupuae.ae','founder@smartsetupuae.ae')
      );
  end if;
end $$;
