import { createClient } from '@supabase/supabase-js';
import * as SecureStore from './storage';

// Hardcoded fallbacks ensure app never crashes even if env vars aren't resolved
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://shwofnrufpfmgptrqexc.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNod29mbnJ1ZnBmbWdwdHJxZXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDAwMTMsImV4cCI6MjA5MjQ3NjAxM30.GnLyzcR-YzkINqnZioexJ4cv20aChmDWbPvUwlDauH8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
