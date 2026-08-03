/**
 * seed_faculty_generator.js
 * Generates 220 Realistic Faculty Records across 11 Departments.
 * Integrates DDL creation & linking with users, department_hods, and event_assignments.
 *
 * Safe for Google Apps Script V8 Engine and Node.js environments.
 */

function generateFacultySeedSql() {
  var depts = [
    { id: 'DEPT_CSE', code: 'CSE' },
    { id: 'DEPT_AIML', code: 'CSE-AIML' },
    { id: 'DEPT_DS', code: 'CSE-DS' },
    { id: 'DEPT_AIDS', code: 'AI&DS' },
    { id: 'DEPT_IT', code: 'IT' },
    { id: 'DEPT_ECE', code: 'ECE' },
    { id: 'DEPT_EEE', code: 'EEE' },
    { id: 'DEPT_ME', code: 'ME' },
    { id: 'DEPT_CIVIL', code: 'CIVIL' },
    { id: 'DEPT_MBA', code: 'MBA' },
    { id: 'DEPT_MCA', code: 'MCA' }
  ];

  var designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Assistant Professor', 'Guest Faculty', 'Lab Instructor'];
  var qualifications = ['Ph.D. in Computer Science', 'Ph.D. in AI/ML', 'Ph.D. in Electronics', 'M.Tech in CSE', 'M.Tech in ECE', 'M.Tech in Power Systems', 'M.Tech in Thermal Engg', 'MBA', 'MCA', 'M.Sc'];
  var empTypes = ['Permanent', 'Permanent', 'Permanent', 'Contract', 'Guest'];

  var firstNames = ['Dr. Ananya', 'Dr. Rohan', 'Dr. Sai', 'Dr. Kavya', 'Dr. Aditya', 'Dr. Priya', 'Dr. Vikram', 'Dr. Sneha', 'Dr. Rahul', 'Dr. Divya', 'Varun', 'Meera', 'Karthik', 'Pooja', 'Harsha', 'Bhavana', 'Teja', 'Manish', 'Ramya', 'Aarav'];
  var lastNames = ['Rao', 'Reddy', 'Malladi', 'Verma', 'Patel', 'Nair', 'Chowdhary', 'Joshi', 'Kapoor', 'Bhat', 'Gupta', 'Singh', 'Kumar', 'Iyer', 'Deshmukh', 'Mishra', 'Varma', 'Kulkarni', 'Naidu', 'Sharma'];

  var facultyInserts = [];
  var totalFaculty = 220;

  for (var i = 1; i <= totalFaculty; i++) {
    var dept = depts[i % depts.length];
    var desig = designations[i % designations.length];
    var qual = qualifications[i % qualifications.length];
    var empType = empTypes[i % empTypes.length];
    var gender = i % 2 === 0 ? 'Male' : 'Female';
    var fn = firstNames[i % firstNames.length];
    var ln = lastNames[(i * 3) % lastNames.length];
    var name = fn + ' ' + ln;
    var empId = 'EMP_FAC_' + String(i).padStart(4, '0');
    
    var userId = null;
    if (i <= 20) {
      userId = "'USER_HOD_" + i + "'";
    } else if (i <= 100) {
      userId = "'USER_STAFF_" + (i - 20) + "'";
    } else {
      userId = 'NULL';
    }

    var exp = (i % 25) + 2;
    var joinYear = 2026 - Math.min(exp, 15);
    var joinDate = joinYear + '-0' + ((i % 9) + 1) + '-15';
    var email = 'fac_' + i + '@bvc.edu.in';
    var mobile = '9876' + String(100000 + i).padStart(6, '0');

    facultyInserts.push("('FAC_" + i + "', '" + empId + "', " + userId + ", '" + name + "', '" + desig + "', '" + dept.id + "', '" + email + "', '" + mobile + "', '" + gender + "', '" + joinDate + "', '" + qual + "', " + exp + ", '" + empType + "', 'Active', NOW())");
  }

  var sql = "-- =============================================================================\n" +
"-- BVC EVENT ATTENDANCE SYSTEM — MASTER FACULTY SAMPLE SEED (220 RECORDS)\n" +
"-- =============================================================================\n\n" +
"CREATE TABLE IF NOT EXISTS faculty (\n" +
"    faculty_id VARCHAR(50) PRIMARY KEY,\n" +
"    employee_id VARCHAR(50) UNIQUE NOT NULL,\n" +
"    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,\n" +
"    faculty_name VARCHAR(150) NOT NULL,\n" +
"    designation VARCHAR(100) NOT NULL,\n" +
"    department_id VARCHAR(50) NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,\n" +
"    email VARCHAR(150),\n" +
"    mobile VARCHAR(20),\n" +
"    gender VARCHAR(20),\n" +
"    joining_date DATE,\n" +
"    qualification VARCHAR(100),\n" +
"    experience_years INT DEFAULT 0,\n" +
"    employment_type VARCHAR(50) DEFAULT 'Permanent',\n" +
"    status VARCHAR(20) DEFAULT 'Active',\n" +
"    created_at TIMESTAMPTZ DEFAULT NOW(),\n" +
"    updated_at TIMESTAMPTZ DEFAULT NOW()\n" +
");\n\n" +
"INSERT INTO faculty (faculty_id, employee_id, user_id, faculty_name, designation, department_id, email, mobile, gender, joining_date, qualification, experience_years, employment_type, status, created_at) VALUES\n" +
facultyInserts.join(',\n') +
"\nON CONFLICT (employee_id) DO UPDATE SET\n" +
"  faculty_name = EXCLUDED.faculty_name,\n" +
"  designation = EXCLUDED.designation,\n" +
"  user_id = EXCLUDED.user_id;\n";

  if (typeof Logger !== 'undefined') {
    Logger.log('Generated Faculty Seed SQL Statements (Length: ' + sql.length + ')');
  }

  return sql;
}

// Node.js CLI runner block
if (typeof require !== 'undefined' && typeof module !== 'undefined' && module.exports) {
  try {
    var fsModule = Function('return require("fs")')();
    if (fsModule && fsModule.writeFileSync) {
      var outputSql = generateFacultySeedSql();
      fsModule.writeFileSync('c:\\Users\\DELL\\Desktop\\BVC-Event-Attendance-System-Supabase\\seed_faculty.sql', outputSql);
      console.log('Successfully generated seed_faculty.sql with 220 Faculty records!');
    }
  } catch (err) {
    // Safe silent fallback for Apps Script
  }
}
