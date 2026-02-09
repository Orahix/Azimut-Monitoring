
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // Instead of crashing the module import, we can log a critical error.
    // The app will likely fail later when trying to use supabase, but at least it might render the ErrorBoundary.
    console.error('CRITICAL: Missing Supabase URL or Anon Key. Please check your .env or Vercel Environment Variables.');
    throw new Error('Missing Supabase URL or Anon Key. Check console for details.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'azimut-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});
