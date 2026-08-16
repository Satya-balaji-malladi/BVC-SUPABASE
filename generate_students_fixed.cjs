const fs = require('fs');

const departments = [
  { code: 'CSE', branches: ['CSE-CORE', 'CSE-AI', 'CSE-DS'] },
  { code: 'AIML', branches: ['AIML-CORE'] },
  { code: 'AIDS', branches: ['AIDS-CORE'] },
  { code: 'IT', branches: ['IT-CORE'] },
  { code: 'ECE', branches: ['ECE-CORE', 'ECE-VLSI'] },
  { code: 'EEE', branches: ['EEE-CORE'] },
  { code: 'ME', branches: ['ME-CORE'] },
  { code: 'CIVIL', branches: ['CIVIL-CORE'] },
  { code: 'MBA', branches: ['MBA-FIN', 'MBA-HR'] },
  { code: 'MCA', branches: ['MCA-CORE'] }
];

const sections = ['A', 'B', 'C'];
const years = [1, 2, 3, 4];
const firstNames = ['Ravi', 'Kiran', 'Priya', 'Suresh', 'Anita', 'Bhavya', 'Charan', 'Dinesh', 'Eshwar', 'Farooq', 'Ganesh', 'Hari', 'Indira', 'Jaya', 'Karthik', 'Lakshmi', 'Mahesh', 'Naveen', 'Omkar', 'Prashanth', 'Qasim', 'Rahul', 'Swathi', 'Teja', 'Uday', 'Vamshi', 'Yasmin', 'Zahir'];
const lastNames = ['Reddy', 'Sharma', 'Kumar', 'Rao', 'Patil', 'Naidu', 'Chowdary', 'Goud', 'Yadav', 'Singh', 'Das', 'Murthy', 'Nair'];

let csvContent = 'Roll Number,Student Name,Department,Branch,Year,Sec,Email,Phone\n';
let studentCount = 0;

let rollPrefixIndex = 1;

departments.forEach(dept => {
  dept.branches.forEach(branch => {
    years.forEach(year => {
      sections.forEach(sec => {
        for(let i=1; i<=5; i++) {
          studentCount++;
          // Ensure branch uniqueness in roll number!
          // Add a branch index to the roll number to avoid duplicates
          const branchCode = branch.substring(0,2) + rollPrefixIndex.toString();
          const rollNo = `20B81A${branchCode}${year}${sec}${i.toString().padStart(2, '0')}`;
          
          const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
          const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
          const name = `${fName} ${lName}`;
          const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${Math.floor(Math.random()*100)}@bvc.edu.in`;
          const phone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
          
          csvContent += `${rollNo},${name},${dept.code},${branch},${year},${sec},${email},${phone}\n`;
        }
      });
    });
    rollPrefixIndex++;
  });
});

fs.writeFileSync('large_dummy_students_fixed.csv', csvContent);
console.log('Successfully generated large_dummy_students_fixed.csv with ' + studentCount + ' records.');
