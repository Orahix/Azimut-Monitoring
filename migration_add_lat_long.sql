-- Add latitude and longitude columns to projects table
alter table public.projects 
add column latitude numeric,
add column longitude numeric;
