import { supabase } from './src/supabaseClient.js';

async function test() {
  const { data, error } = await supabase.from('students').select('*').limit(1);
  if (error) {
    console.error('Error fetching students:', error);
  } else {
    console.log('Columns in students table:');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]).join(', '));
    } else {
      console.log('No data, cannot infer columns. Attempting to insert dummy data and catch error...');
      const { error: insertErr } = await supabase.from('students').insert({ student_id: 'test_col_check' });
      console.log(insertErr);
    }
  }
}
test();
