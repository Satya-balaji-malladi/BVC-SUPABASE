import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read from .env
const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const lines = envFile.split('\n');
let supabaseUrl = '';
let supabaseKey = '';
lines.forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = l.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function patch() {
  const { data, error } = await supabase
    .from('event_participants')
    .update({ registration_type: 'Spot Registration' })
    .eq('event_id', 'EVT-2026-2089');
    
  console.log("Error:", error);
  console.log("Patched previous registrations to Spot Registration for EVT-2026-2089");
}
patch();
