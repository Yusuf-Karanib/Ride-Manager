-- Rideshare app: Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Tables --------------------------------------------------------------------

create table if not exists public.rides (
  id            uuid primary key default gen_random_uuid(),
  rider_id      uuid not null references auth.users(id) on delete cascade,
  pickup        text not null,
  dropoff       text not null,
  initial_offer integer not null check (initial_offer >= 0),
  status        text not null default 'pending'
                  check (status in ('pending', 'matched', 'active', 'completed', 'cancelled')),
  created_at    timestamptz not null default now()
);

create table if not exists public.bids (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides(id) on delete cascade,
  driver_id  uuid not null references auth.users(id) on delete cascade,
  amount     integer not null check (amount >= 0),
  status     text not null default 'pending'
               check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  ride_id      uuid not null references public.rides(id) on delete cascade,
  reporter_id  uuid not null references auth.users(id) on delete cascade,
  reported_id  uuid not null references auth.users(id) on delete cascade,
  reason       text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.banned_devices (
  device_id  text primary key,
  reason     text,
  created_at timestamptz not null default now()
);

-- Helpful indexes -----------------------------------------------------------
create index if not exists rides_rider_id_idx   on public.rides(rider_id);
create index if not exists rides_status_idx     on public.rides(status);
create index if not exists bids_ride_id_idx     on public.bids(ride_id);
create index if not exists bids_driver_id_idx   on public.bids(driver_id);
create index if not exists reports_ride_id_idx  on public.reports(ride_id);

-- Row Level Security --------------------------------------------------------
alter table public.rides           enable row level security;
alter table public.bids            enable row level security;
alter table public.reports         enable row level security;
alter table public.banned_devices  enable row level security;

-- rides
drop policy if exists "rides_select_authenticated" on public.rides;
create policy "rides_select_authenticated"
  on public.rides for select
  to authenticated
  using (true);

drop policy if exists "rides_insert_authenticated" on public.rides;
create policy "rides_insert_authenticated"
  on public.rides for insert
  to authenticated
  with check (true);

-- bids
drop policy if exists "bids_select_authenticated" on public.bids;
create policy "bids_select_authenticated"
  on public.bids for select
  to authenticated
  using (true);

drop policy if exists "bids_insert_authenticated" on public.bids;
create policy "bids_insert_authenticated"
  on public.bids for insert
  to authenticated
  with check (true);

-- reports
drop policy if exists "reports_select_authenticated" on public.reports;
create policy "reports_select_authenticated"
  on public.reports for select
  to authenticated
  using (true);

drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated"
  on public.reports for insert
  to authenticated
  with check (true);

-- banned_devices
drop policy if exists "banned_devices_select_authenticated" on public.banned_devices;
create policy "banned_devices_select_authenticated"
  on public.banned_devices for select
  to authenticated
  using (true);

drop policy if exists "banned_devices_insert_authenticated" on public.banned_devices;
create policy "banned_devices_insert_authenticated"
  on public.banned_devices for insert
  to authenticated
  with check (true);
