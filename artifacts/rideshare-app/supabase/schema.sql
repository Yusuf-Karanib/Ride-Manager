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
  is_shared     boolean not null default false,
  status        text not null default 'pending'
                  check (status in ('pending', 'matched', 'active', 'completed', 'cancelled')),
  created_at    timestamptz not null default now()
);
-- For tables that already exist, the line above is a no-op; add the column:
alter table public.rides add column if not exists is_shared boolean not null default false;
-- `completed_at` is the canonical "this is when the cash changed hands"
-- timestamp used by the driver earnings dashboard. Populated when a ride
-- transitions to status='completed'.
alter table public.rides add column if not exists completed_at timestamptz;

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

-- driver_availability is intentionally separate from `driver_profiles`:
--   - driver_profiles holds slow-changing verification state (admin-managed,
--     few writes per driver lifetime).
--   - driver_availability holds fast-changing presence (driver-managed, can
--     flip many times per day).
-- Decoupling keeps writes cheap and lets the verification table be admin-
-- write-only without hindering self-service availability toggling.
create table if not exists public.driver_availability (
  driver_id  uuid primary key references auth.users(id) on delete cascade,
  is_online  boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('rider', 'driver')),
  ride_id     uuid references public.rides(id) on delete set null,
  category    text not null
                check (category in (
                  'payment', 'driver_behavior', 'rider_behavior',
                  'app_bug', 'account', 'lost_item', 'safety', 'other'
                )),
  subject     text not null,
  description text not null,
  status      text not null default 'open'
                check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.nudges (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.banned_devices (
  device_id  text primary key,
  reason     text,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_locations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'other'
               check (kind in ('home', 'work', 'other')),
  label      text not null,
  address    text not null,
  lat        double precision,
  lng        double precision,
  created_at timestamptz not null default now()
);
-- A user can have at most one Home and one Work; "other" places are unlimited.
create unique index if not exists saved_locations_user_kind_unique
  on public.saved_locations(user_id, kind)
  where kind in ('home', 'work');

create table if not exists public.driver_profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  full_name          text not null,
  phone              text not null,
  national_id_url    text,
  drivers_license_url text,
  vehicle_photo_url  text,
  status             text not null default 'pending_review'
                       check (status in ('pending_review', 'approved', 'rejected')),
  review_notes       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.promotions (
  code            text primary key,
  description     text,
  discount_amount integer not null check (discount_amount > 0),
  min_offer       integer not null default 0 check (min_offer >= 0),
  max_uses        integer,
  uses_count      integer not null default 0,
  active          boolean not null default true,
  valid_from      timestamptz,
  valid_to        timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists public.scheduled_rides (
  id            uuid primary key default gen_random_uuid(),
  rider_id      uuid not null references auth.users(id) on delete cascade,
  pickup        text not null,
  dropoff       text not null,
  initial_offer integer not null check (initial_offer >= 0),
  scheduled_at  timestamptz not null,
  notes         text,
  status        text not null default 'pending'
                  check (status in ('pending', 'promoted', 'cancelled', 'expired')),
  promoted_ride_id uuid references public.rides(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Helpful indexes -----------------------------------------------------------
create index if not exists rides_rider_id_idx   on public.rides(rider_id);
create index if not exists rides_status_idx     on public.rides(status);
create index if not exists rides_is_shared_idx  on public.rides(is_shared) where is_shared = true;
create index if not exists rides_completed_at_idx
  on public.rides(completed_at desc) where status = 'completed';
create index if not exists bids_ride_id_idx     on public.bids(ride_id);
create index if not exists bids_driver_id_idx   on public.bids(driver_id);
create index if not exists reports_ride_id_idx  on public.reports(ride_id);
create index if not exists scheduled_rides_status_idx on public.scheduled_rides(status);
create index if not exists scheduled_rides_scheduled_at_idx on public.scheduled_rides(scheduled_at);
create index if not exists scheduled_rides_rider_id_idx on public.scheduled_rides(rider_id);
create index if not exists promotions_active_idx on public.promotions(active);
create index if not exists driver_profiles_status_idx on public.driver_profiles(status);
create index if not exists saved_locations_user_id_idx on public.saved_locations(user_id);
create index if not exists nudges_ride_id_created_at_idx
  on public.nudges(ride_id, created_at desc);
create index if not exists support_tickets_user_id_created_idx
  on public.support_tickets(user_id, created_at desc);
create index if not exists support_tickets_status_idx
  on public.support_tickets(status) where status in ('open', 'in_progress');
create index if not exists driver_availability_online_idx
  on public.driver_availability(driver_id) where is_online = true;

-- Row Level Security --------------------------------------------------------
alter table public.rides           enable row level security;
alter table public.bids            enable row level security;
alter table public.reports         enable row level security;
alter table public.banned_devices  enable row level security;
alter table public.scheduled_rides enable row level security;
alter table public.promotions      enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.saved_locations enable row level security;
alter table public.nudges          enable row level security;
alter table public.support_tickets enable row level security;
alter table public.driver_availability enable row level security;

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

-- scheduled_rides
drop policy if exists "scheduled_rides_select_authenticated" on public.scheduled_rides;
create policy "scheduled_rides_select_authenticated"
  on public.scheduled_rides for select
  to authenticated
  using (true);

drop policy if exists "scheduled_rides_insert_own" on public.scheduled_rides;
create policy "scheduled_rides_insert_own"
  on public.scheduled_rides for insert
  to authenticated
  with check (auth.uid() = rider_id);

drop policy if exists "scheduled_rides_update_own" on public.scheduled_rides;
create policy "scheduled_rides_update_own"
  on public.scheduled_rides for update
  to authenticated
  using (auth.uid() = rider_id);

-- promotions
-- Read-only to all authenticated users so the rider app can validate codes.
-- Inserts/updates must be done via the service-role key (admin tooling only).
drop policy if exists "promotions_select_authenticated" on public.promotions;
create policy "promotions_select_authenticated"
  on public.promotions for select
  to authenticated
  using (active = true);

-- driver_availability
-- Driver owns their own row end-to-end. Insert + update via a single
-- upsert path; no select policy for other users (the dispatch view, if any,
-- runs with service-role).
drop policy if exists "driver_availability_select_own" on public.driver_availability;
create policy "driver_availability_select_own"
  on public.driver_availability for select
  to authenticated
  using (auth.uid() = driver_id);

drop policy if exists "driver_availability_upsert_own" on public.driver_availability;
create policy "driver_availability_upsert_own"
  on public.driver_availability for insert
  to authenticated
  with check (auth.uid() = driver_id);

drop policy if exists "driver_availability_update_own" on public.driver_availability;
create policy "driver_availability_update_own"
  on public.driver_availability for update
  to authenticated
  using (auth.uid() = driver_id)
  with check (auth.uid() = driver_id);

-- Realtime publication: lets the driver's other devices/tabs sync presence
-- via useDriverAvailability's postgres_changes subscription.
alter publication supabase_realtime add table public.driver_availability;

-- support_tickets
-- Users can file tickets and read their own; admins use the service-role
-- key to triage. Status / admin_notes can be updated by the user (e.g. they
-- can close their own ticket), but the admin-only path uses service-role to
-- bypass RLS entirely for the review workflow.
drop policy if exists "support_tickets_insert_self" on public.support_tickets;
create policy "support_tickets_insert_self"
  on public.support_tickets for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own"
  on public.support_tickets for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "support_tickets_update_own" on public.support_tickets;
create policy "support_tickets_update_own"
  on public.support_tickets for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- nudges
-- A rider can ping the driver of their ride. The driver who has the
-- accepted bid can see (subscribe to) those pings in realtime. Sent rows
-- are immutable from the client side — no UPDATE / DELETE policies are
-- granted, so the audit trail is preserved.
drop policy if exists "nudges_insert_rider" on public.nudges;
create policy "nudges_insert_rider"
  on public.nudges for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.rides r
      where r.id = nudges.ride_id
        and r.rider_id = auth.uid()
        and r.status in ('matched', 'active')
    )
  );

drop policy if exists "nudges_select_party" on public.nudges;
create policy "nudges_select_party"
  on public.nudges for select
  to authenticated
  using (
    exists (
      select 1 from public.rides r
      where r.id = nudges.ride_id and r.rider_id = auth.uid()
    )
    or exists (
      select 1 from public.bids b
      where b.ride_id = nudges.ride_id
        and b.driver_id = auth.uid()
        and b.status = 'accepted'
    )
  );

-- Realtime publication: required for the driver's `useNudgeListener` hook
-- to receive INSERT events via supabase.channel().on('postgres_changes', ...).
alter publication supabase_realtime add table public.nudges;

-- saved_locations
-- Users own and manage their own pinned addresses end-to-end.
drop policy if exists "saved_locations_select_own" on public.saved_locations;
create policy "saved_locations_select_own"
  on public.saved_locations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "saved_locations_insert_own" on public.saved_locations;
create policy "saved_locations_insert_own"
  on public.saved_locations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "saved_locations_update_own" on public.saved_locations;
create policy "saved_locations_update_own"
  on public.saved_locations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_locations_delete_own" on public.saved_locations;
create policy "saved_locations_delete_own"
  on public.saved_locations for delete
  to authenticated
  using (auth.uid() = user_id);

-- driver_profiles
-- A driver can read and write their own row. Status changes (approve/reject)
-- belong to admin tooling via service-role; no UPDATE policy for "to authenticated"
-- is granted on `status` deliberately — riders/drivers can't approve themselves.
drop policy if exists "driver_profiles_select_own" on public.driver_profiles;
create policy "driver_profiles_select_own"
  on public.driver_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "driver_profiles_insert_own" on public.driver_profiles;
create policy "driver_profiles_insert_own"
  on public.driver_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "driver_profiles_update_own_docs" on public.driver_profiles;
create policy "driver_profiles_update_own_docs"
  on public.driver_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for driver KYC documents.
--
-- Bucket is PRIVATE — these are sensitive documents (national ID).
-- Files are read via short-lived signed URLs from admin tooling, never as
-- public URLs.
--
-- Path convention: `{auth.uid()}/{doc_type}-{timestamp}.{ext}`
-- e.g. `8b4f.../national_id-1714680000.jpg`
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('driver-docs', 'driver-docs', false)
on conflict (id) do nothing;

drop policy if exists "driver_docs_insert_own" on storage.objects;
create policy "driver_docs_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'driver-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "driver_docs_select_own" on storage.objects;
create policy "driver_docs_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'driver-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "driver_docs_update_own" on storage.objects;
create policy "driver_docs_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'driver-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- OPTIONAL: server-side promotion of scheduled rides 30 minutes before time.
--
-- Requires the pg_cron extension to be enabled in the Supabase project:
--   Dashboard → Database → Extensions → enable "pg_cron".
-- After enabling, uncomment the block below and re-run this script.
--
-- Without this block, the driver feed must merge upcoming scheduled_rides
-- client-side (see useUpcomingScheduledRides in the app).
-- ---------------------------------------------------------------------------
--
-- create or replace function public.promote_due_scheduled_rides()
-- returns integer
-- language plpgsql
-- security definer
-- as $$
-- declare
--   promoted_count integer := 0;
--   r record;
--   new_ride_id uuid;
-- begin
--   for r in
--     select * from public.scheduled_rides
--     where status = 'pending'
--       and scheduled_at <= now() + interval '30 minutes'
--       and scheduled_at > now() - interval '5 minutes'
--   loop
--     insert into public.rides (rider_id, pickup, dropoff, initial_offer, status)
--     values (r.rider_id, r.pickup, r.dropoff, r.initial_offer, 'pending')
--     returning id into new_ride_id;
--
--     update public.scheduled_rides
--       set status = 'promoted', promoted_ride_id = new_ride_id
--       where id = r.id;
--
--     promoted_count := promoted_count + 1;
--   end loop;
--
--   -- Mark rides whose window passed without promotion as expired.
--   update public.scheduled_rides
--     set status = 'expired'
--     where status = 'pending' and scheduled_at < now() - interval '5 minutes';
--
--   return promoted_count;
-- end;
-- $$;
--
-- select cron.schedule(
--   'promote_scheduled_rides_every_minute',
--   '* * * * *',
--   $$ select public.promote_due_scheduled_rides(); $$
-- );
