import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://esfqyvkcurklxjqfurih.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9pnIBMiHqiQcGtASmbMWCA_TUxw44gW';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFaculty() {
  const { data, error } = await supabase.from('faculty').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}

checkFaculty();
