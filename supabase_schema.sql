-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (Extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('admin', 'client')) default 'client',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'client');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. PROJECTS TABLE (Powerplants)
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  name text not null,
  location text,
  installed_capacity_kw numeric,
  panel_count integer,
  inverter_model text,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;

-- Policies for projects
create policy "Admins can view all projects"
  on projects for select
  to authenticated
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

create policy "Users can view own projects"
  on projects for select
  to authenticated
  using ( user_id = auth.uid() );

create policy "Admins can insert projects"
  on projects for insert
  to authenticated
  with check ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );
  
create policy "Admins can update projects"
  on projects for update
  to authenticated
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );  


-- 3. POWER READINGS TABLE (Raw Time Series)
create table public.power_readings (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) not null,
  recorded_at timestamptz default now(),
  
  -- Voltage
  voltage_l1 numeric,
  voltage_l2 numeric,
  voltage_l3 numeric,
  
  -- Current
  current_l1 numeric,
  current_l2 numeric,
  current_l3 numeric,
  
  -- Power
  active_power_total numeric, -- Watts
  active_power_l1 numeric,
  active_power_l2 numeric,
  active_power_l3 numeric,
  
  reactive_power_total numeric, -- VAR
  power_factor numeric,
  frequency numeric, -- Hz
  
  -- Energy (Cumulative)
  total_energy_import numeric, -- kWh (Consumption)
  total_energy_export numeric, -- kWh (Production)
  daily_generation_cumulative numeric 
);

-- Index for faster time-series queries
create index power_readings_project_time_idx on power_readings (project_id, recorded_at desc);

alter table public.power_readings enable row level security;

create policy "Admins can view all readings"
  on power_readings for select
  to authenticated
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

create policy "Users can view own project readings"
  on power_readings for select
  to authenticated
  using ( exists (select 1 from projects where id = power_readings.project_id and user_id = auth.uid()) );

create policy "Ingestion key or Admin can insert readings"
  on power_readings for insert
  to authenticated
  with check ( true ); -- Simplified for now, typically restricted to API keys or IoT roles


-- 4. AGGREGATED STATS (Hourly)
create table public.hourly_stats (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) not null,
  start_time timestamptz not null,
  
  avg_active_power numeric,
  max_active_power numeric,
  total_energy_produced numeric, -- Delta of export
  total_energy_consumed numeric, -- Delta of import
  
  unique(project_id, start_time)
);

alter table public.hourly_stats enable row level security;

create policy "Admins can view all hourly stats"
  on hourly_stats for select TO authenticated
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

create policy "Users can view own project hourly stats"
  on hourly_stats for select TO authenticated
  using ( exists (select 1 from projects where id = hourly_stats.project_id and user_id = auth.uid()) );


-- 5. FUNCTION TO AGGREGATE DATA (Can be called via pg_cron)
create or replace function aggregate_hourly_readings()
returns void as $$
begin
  insert into public.hourly_stats (project_id, start_time, avg_active_power, max_active_power)
  select 
    project_id,
    date_trunc('hour', recorded_at) as hour_start,
    avg(active_power_total),
    max(active_power_total)
  from public.power_readings
  where recorded_at >= date_trunc('hour', now()) - interval '1 hour'
    and recorded_at < date_trunc('hour', now())
  group by project_id, hour_start
  on conflict (project_id, start_time) do nothing;
end;
$$ language plpgsql;
