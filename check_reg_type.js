import { supabase } from './src/supabaseClient.js';
async function test() {
  const { data, error } = await supabase.from('event_participants').select('registration_type').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
