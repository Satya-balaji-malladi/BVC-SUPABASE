import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data: event } = await supabase.from('events').select('event_id').limit(1).single();
  if (!event) return console.log('No event found');

  const { data: student } = await supabase.from('students').select('roll_number').limit(1).single();
  if (!student) return console.log('No student found');

  const now = new Date().toISOString();
  console.log('Inserting for:', event.event_id, student.roll_number);

  const { data, error } = await supabase.from('attendance').insert([{ 
    attendance_id: `ATT_TEST_${Date.now()}`,
    event_id: event.event_id, 
    roll_number: student.roll_number,
    attendance_status: 'Present',
    timestamp: now,
    date: now.split('T')[0],
    time: now.split('T')[1].split('.')[0],
    attendance_method: 'Manual'
  }]);

  if (error) {
    console.error('INSERT FAILED:', error);
  } else {
    console.log('INSERT SUCCESS:', data);
  }
}

testInsert();
