-- Add is_demo column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
