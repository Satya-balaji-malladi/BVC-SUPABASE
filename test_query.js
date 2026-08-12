import { supabase } from './src/supabaseClient.js';
import fetch from 'node-fetch';

global.fetch = fetch; // Polyfill fetch for supabase in Node

async function test() {
  const token = 'test-token'; // We can't really test with a real token easily without logging in.
  // Let's just run the query that we added directly with the anon key
  const eventIds = ['EVT-2026-8962'];
  
  const { data, error } = await supabase
    .from('event_participants')
    .select('*, students(student_name, department_id, year, section)')
    .in('event_id', eventIds);

  console.log("Error:", error);
  console.log("Data length:", data?.length);
}

test();
