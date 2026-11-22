-- Diabetes Diary: per-user profile and glucose/insulin journal.
-- Apply this migration in Supabase SQL Editor for the diabetes-journal project.

create table if not exists public.diabetes_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  age smallint check (age is null or age between 1 and 120),
  height_cm numeric(5, 1) check (height_cm is null or height_cm between 40 and 250),
  weight_kg numeric(5, 1) check (weight_kg is null or weight_kg between 10 and 400),
  diabetes_type text,
  day_insulin_name text,
  day_insulin_times smallint check (day_insulin_times is null or day_insulin_times between 1 and 20),
  night_insulin_name text,
  night_insulin_times smallint check (night_insulin_times is null or night_insulin_times between 1 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.diabetes_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date_time timestamptz not null,
  glucose numeric(7, 2) check (glucose is null or glucose >= 0),
  glucose_unit text check (glucose_unit is null or glucose_unit in ('mmol/L', 'mg/dL')),
  insulin_type text check (insulin_type is null or insulin_type in ('day', 'night')),
  insulin_units numeric(7, 2) check (insulin_units is null or insulin_units between 0 and 500),
  note text,
  created_at timestamptz not null default now(),
  constraint glucose_has_unit check (glucose is null or glucose_unit is not null),
  constraint insulin_has_period check (insulin_units is null or insulin_type is not null),
  constraint entry_has_data check (glucose is not null or insulin_units is not null or coalesce(note, '') <> '')
);

create index if not exists diabetes_entries_user_date_idx
  on public.diabetes_entries (user_id, date_time);

alter table public.diabetes_profiles enable row level security;
alter table public.diabetes_entries enable row level security;

drop policy if exists "profiles_read_own" on public.diabetes_profiles;
create policy "profiles_read_own"
  on public.diabetes_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles_insert_own" on public.diabetes_profiles;
create policy "profiles_insert_own"
  on public.diabetes_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles_update_own" on public.diabetes_profiles;
create policy "profiles_update_own"
  on public.diabetes_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles_delete_own" on public.diabetes_profiles;
create policy "profiles_delete_own"
  on public.diabetes_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "entries_read_own" on public.diabetes_entries;
create policy "entries_read_own"
  on public.diabetes_entries for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "entries_insert_own" on public.diabetes_entries;
create policy "entries_insert_own"
  on public.diabetes_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "entries_update_own" on public.diabetes_entries;
create policy "entries_update_own"
  on public.diabetes_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "entries_delete_own" on public.diabetes_entries;
create policy "entries_delete_own"
  on public.diabetes_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Do not expose health data to unauthenticated visitors. Signed-in users get
-- table privileges, while the RLS policies above still restrict every row.
revoke all on table public.diabetes_profiles, public.diabetes_entries from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.diabetes_profiles, public.diabetes_entries to authenticated;
