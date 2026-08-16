import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Get these from .env if possible, or we will just read .env
const envFile = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function testImport() {
  const { data, error } = await supabase.from('students').insert({
    student_id: 'STU-TEST-1',
    roll_number: 'TEST001',
    student_name: 'Test Student',
    department_id: 'DEPT_CSE',
    year: 1,
    section: 'A',
    branch_id: null
  });
  
  if (error) {
    console.error("Insert Error:", error.message);
  } else {
    console.log("Insert Success!");
    await supabase.from('students').delete().eq('student_id', 'STU-TEST-1');
  }
}

testImport();
