import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    env[key.trim()] = rest.join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: student } = await supabase.from('students').select('*').eq('roll_number', '23221A4220');
  console.log('STUDENT:', student);

  const { data: ep } = await supabase.from('event_participants').select('*').eq('roll_number', '23221A4220');
  console.log('EVENT PARTICIPANTS:', ep);

  const { data: other } = await supabase.from('other_students').select('*').eq('roll_number', '23221A4220');
  console.log('OTHER STUDENTS:', other);
}
run();
