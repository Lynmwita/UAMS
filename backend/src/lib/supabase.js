import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export function createSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase = createSupabaseClient();
