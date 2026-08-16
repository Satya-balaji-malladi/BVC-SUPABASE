const fs = require('fs');

const depts = ['CSE', 'ECE', 'MECH', 'AIML', 'AI&DS'];
const years = ['1', '2', '3', '4'];
const firstNames = ['Satya', 'Rahul', 'Priya', 'Sneha', 'Kiran', 'Ravi', 'Vijay', 'Karthik', 'Ananya', 'Meghana', 'Sandeep', 'Naveen', 'Harsha', 'Sushma', 'Teja', 'Prashanth', 'Srinivas', 'Bhavya', 'Akhil', 'Mounika'];
const lastNames = ['Reddy', 'Rao', 'Kumar', 'Krishna', 'Sharma', 'Naidu', 'Chowdary', 'Goud', 'Varma', 'Yadav'];

let csv = 'roll_number,student_name,department_id,year,phone,email\n';

for (let i = 1; i <= 500; i++) {
  const paddedId = i.toString().padStart(3, '0');
  const id = `21B91A0${paddedId}`;
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  
  const dept = depts[Math.floor(Math.random() * depts.length)];
  const year = years[Math.floor(Math.random() * years.length)];
  
  const phone = `9${Math.floor(Math.random() * 900000000) + 100000000}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${paddedId}@example.com`;
  
  csv += `${id},${name},${dept},${year},${phone},${email}\n`;
}

fs.writeFileSync('dummy_students.csv', csv);
console.log('Generated dummy_students.csv with 500 records');
