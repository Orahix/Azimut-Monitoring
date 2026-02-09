
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Missing Supabase URL or Anon Key. Please check your .env or Vercel Environment Variables.');
}

// Create client with potentially empty strings (will likely fail on use, but won't crash import)
// We add a fallback to avoid createClient throwing immediately if url is empty
export const supabase = createClient(
    supabaseUrl || "https://placeholder-url.supabase.co",
    supabaseAnonKey || "placeholder-key",
    {
        auth: {
            persistSession: true,
            storageKey: 'azimut-auth',
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });
