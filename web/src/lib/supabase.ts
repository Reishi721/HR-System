import { createClient } from '@supabase/supabase-js'

// You will need to replace these with your actual Supabase URL and Anon Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,     // <--- penting di local dev (bukan OAuth)
    storage: localStorage,
    storageKey: 'sb-auth-token',   // biar mudah dicek
  },
})

// Admin client for privileged operations (e.g. creating auth users from HR portal).
// ⚠️  In production, move user creation to a Supabase Edge Function so the
//     service-role key is never exposed to the browser.
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null

