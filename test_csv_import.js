import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';

// Get these from .env
const envFile = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function testImport() {
  const csvText = fs.readFileSync('large_dummy_students.csv', 'utf-8');
  const { data: departments } = await supabase.from('departments').select('department_id, department_code, department_name');
  const { data: branches } = await supabase.from('branches').select('branch_id, branch_code, branch_name, department_id');
  
  const parsed = Papa.parse(csvText, { header: true, transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_') });
  const rows = parsed.data;
  
  console.log("Found rows:", rows.length);
  
  const mapped = rows.map(r => {
    if (!r.roll_number) return null;
    
    const csvDeptValue = (r.department || 'AIML').trim().toUpperCase();
    let resolvedDeptId = null;

    const matched = departments.find(d => 
      d.department_code.toUpperCase() === csvDeptValue ||
      d.department_name.toUpperCase() === csvDeptValue ||
      d.department_id === csvDeptValue ||
      d.department_id === `DEPT_${csvDeptValue.replace('DEPT_', '')}`
    );
    if (matched) resolvedDeptId = matched.department_id;
    else resolvedDeptId = `DEPT_${csvDeptValue.replace('DEPT_', '')}`; 

    let finalBranchId = null;
    const csvBranchValue = (r.branch || '').trim().toUpperCase();
    if (csvBranchValue && branches) {
      const matchedBranch = branches.find(b => 
        b.branch_code.toUpperCase() === csvBranchValue ||
        b.branch_name.toUpperCase() === csvBranchValue ||
        b.branch_id === csvBranchValue
      );
      if (matchedBranch) finalBranchId = matchedBranch.branch_id;
    }

    if (!finalBranchId && resolvedDeptId && branches) {
       const deptBranches = branches.filter(b => b.department_id === resolvedDeptId);
       if (deptBranches.length > 0) finalBranchId = deptBranches[0].branch_id; 
    }

    return {
      student_id: `STU-${r.roll_number}`,
      roll_number: r.roll_number,
      student_name: r.student_name || 'Unknown',
      department_id: resolvedDeptId,
      branch_id: finalBranchId,
      year: parseInt(r.year) || 1,
      section: r.sec
    };
  }).filter(Boolean);
  
  console.log("Mapped payloads count:", mapped.length);
  if (mapped.length > 0) {
     console.log("First payload:", mapped[0]);
  }
  
  const batchSize = 500;
  for (let i = 0; i < mapped.length; i += batchSize) {
    const batch = mapped.slice(i, i + batchSize);
    const { error } = await supabase.from('students').upsert(batch, { onConflict: 'roll_number', ignoreDuplicates: true });
    
    if (error) {
      console.error(`Upsert Error at batch ${i}:`, error.message);
    } else {
      console.log(`Upsert Success for batch ${i}!`);
    }
  }
}

testImport();
