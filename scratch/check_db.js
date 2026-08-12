import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const roll = '23221A4230';
  const { data: att } = await supabase.from('attendance').select('*').eq('roll_number', roll);
  console.log('Attendance Table:', att);

  const { data: ep } = await supabase.from('event_participants').select('*').eq('roll_number', roll);
  console.log('Event Participants Table:', ep);
}

check();
