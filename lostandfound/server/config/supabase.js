import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseKey.includes('your-supabase')
);

let client = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('✅ Connected to Supabase Cloud PostgreSQL (' + supabaseUrl + ')');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn(
    '⚠️ Supabase credentials are not fully configured yet in server/.env.\n' +
    '   Running in Local Memory Fallback Mode.\n' +
    '   To connect real Supabase: create a project at https://supabase.com,\n' +
    '   run schema.sql in SQL Editor, and paste SUPABASE_URL & SUPABASE_KEY in server/.env'
  );
}

export const supabase = client;
