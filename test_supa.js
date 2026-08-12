import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const eventIds = ['EVT-2026-8962'];
    const { data, error } = await supabase
      .from('event_participants')
      .select('*, students(student_name, department_id, year, section)')
      .in('event_id', eventIds);

    if (error) {
        console.error("ERROR:", error);
    } else {
        console.log("SUCCESS length:", data?.length);
    }
}
run();
