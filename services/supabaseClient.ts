import { createClient } from '@supabase/supabase-js';

// Supabase is disabled for Mock Simulation mode.
// If you want to use Supabase, uncomment the lines below and update apiService/AuthContext.

const supabaseUrl = 'https://placeholder.supabase.co';
const supabaseKey = 'placeholder';

// export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabase = {
    auth: { 
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }) })
} as any;