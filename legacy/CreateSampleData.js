/**
 * CreateSampleData.js
 * Utility script to seed sample data into all tables in Supabase.
 * Run this function from the Apps Script Editor.
 */

function runCreateSampleData() {
  Logger.log("🚀 Starting Sample Data Seeding...");
  
  try {
    // 1. Departments
    Logger.log("Seeding DEPARTMENTS...");
    var existingDepts = DatabaseService.readAllRows("DEPARTMENTS") || [];
    var existingCodes = existingDepts.map(d => String(d.department_code || d['Department Code'] || '').toUpperCase());

    var departments = [
      { "Department ID": "DEP-001", "Department Code": "CSE", "Department Name": "Computer Science & Engineering", "Status": "Active" },
      { "Department ID": "DEP-002", "Department Code": "ECE", "Department Name": "Electronics & Communication Engineering", "Status": "Active" },
      { "Department ID": "DEP-003", "Department Code": "ME", "Department Name": "Mechanical Engineering", "Status": "Active" }
    ].filter(d => existingCodes.indexOf(d["Department Code"].toUpperCase()) === -1);

    if (departments.length > 0) {
      DatabaseService.insertRows("DEPARTMENTS", departments);
    } else {
      Logger.log("Departments already exist. Skipping department insertion.");
    }

    // 2. Users (HODs & Coordinators)
    Logger.log("Seeding USERS...");
    var users = [
      { "User ID": "USR-002", "Employee ID": "EMP0002", "First Name": "Satya", "Last Name": "Balaji", "Email Address": "satya.cse@bvc.edu.in", "Username": "satya_cse", "Password Hash": "Password123!", "Role": "HOD", "Status": "Active", "Department": "DEP-001" },
      { "User ID": "USR-003", "Employee ID": "EMP0003", "First Name": "John", "Last Name": "Doe", "Email Address": "john.ece@bvc.edu.in", "Username": "john_ece", "Password Hash": "Password123!", "Role": "Coordinator", "Status": "Active", "Department": "DEP-002" },
      { "User ID": "USR-004", "Employee ID": "EMP0004", "First Name": "Jane", "Last Name": "Smith", "Email Address": "jane.me@bvc.edu.in", "Username": "jane_me", "Password Hash": "Password123!", "Role": "Coordinator", "Status": "Active", "Department": "DEP-003" }
    ];
    DatabaseService.insertRows("USERS", users);

    // 3. Students
    Logger.log("Seeding STUDENTS...");
    var students = [
      { "Student ID": "STD-001", "Roll Number": "23A91A0501", "Student Name": "Aditya Vardhan", "Email Address": "aditya.23a91a0501@bvc.edu.in", "Year": 3, "Semester": 1, "Section": "A", "Gender": "Male", "Student Status": "Active", "Department ID": "DEP-001" },
      { "Student ID": "STD-002", "Roll Number": "23A91A0502", "Student Name": "Bhavana Rao", "Email Address": "bhavana.23a91a0502@bvc.edu.in", "Year": 3, "Semester": 1, "Section": "A", "Gender": "Female", "Student Status": "Active", "Department ID": "DEP-001" },
      { "Student ID": "STD-003", "Roll Number": "23A91A0401", "Student Name": "Charan Kumar", "Email Address": "charan.23a91a0401@bvc.edu.in", "Year": 2, "Semester": 2, "Section": "B", "Gender": "Male", "Student Status": "Active", "Department ID": "DEP-002" },
      { "Student ID": "STD-004", "Roll Number": "23A91A0301", "Student Name": "Dinesh Reddy", "Email Address": "dinesh.23a91a0301@bvc.edu.in", "Year": 4, "Semester": 1, "Section": "A", "Gender": "Male", "Student Status": "Active", "Department ID": "DEP-003" }
    ];
    DatabaseService.insertRows("STUDENTS", students);

    // 4. Events
    Logger.log("Seeding EVENTS...");
    var events = [
      { "Event ID": "EVT-001", "Event Name": "National Level Hackathon 2026", "Description": "A 24-hour coding challenge on real-world problems.", "Location": "CSE Seminar Hall", "Start Date": "2026-07-25", "End Date": "2026-07-26", "Start Time": "09:00:00", "End Time": "17:00:00", "Event Status": "Upcoming", "Capacity": 120, "Organizer": "DEP-001" },
      { "Event ID": "EVT-002", "Event Name": "Embedded Systems Workshop", "Description": "Hands-on training session on IoT and Arduino development.", "Location": "ECE Lab 2", "Start Date": "2026-08-01", "End Date": "2026-08-02", "Start Time": "10:00:00", "End Time": "16:00:00", "Event Status": "Draft", "Capacity": 60, "Organizer": "DEP-002" }
    ];
    DatabaseService.insertRows("EVENTS", events);

    // 5. Event Coordinators
    Logger.log("Seeding EVENT_COORDINATORS...");
    var coordinators = [
      { "Assignment ID": "ASN-001", "Event ID": "EVT-001", "User ID": "USR-003", "Assignment Role": "Technical Coordinator" },
      { "Assignment ID": "ASN-002", "Event ID": "EVT-002", "User ID": "USR-004", "Assignment Role": "Lab Instructor" }
    ];
    DatabaseService.insertRows("EVENT_COORDINATORS", coordinators);

    // 6. Settings
    Logger.log("Seeding SETTINGS...");
    var settings = [
      { "Setting ID": "SET-001", "Category": "General", "Key": "college_name", "Value": "BVC Engineering College", "Data Type": "String", "Description": "Name of the college displayed in headers" },
      { "Setting ID": "SET-002", "Category": "Attendance", "Key": "auto_approve_scans", "Value": "true", "Data Type": "Boolean", "Description": "Enable automatic scan validation" }
    ];
    DatabaseService.insertRows("SETTINGS", settings);
    
    Logger.log("🎉 Sample Data Seeding Completed Successfully!");
    return "Sample Data Seeded!";
  } catch (err) {
    Logger.log("❌ Error Seeding Data: " + err.message);
    return "Failed: " + err.message;
  }
}

/**
 * Seed 100 realistic BVC Engineering College Student Records into Supabase.
 * Call seed100CollegeStudents() in Google Apps Script Editor.
 */
function seed100CollegeStudents() {
  Logger.log("🎓 Generating & Seeding 100 BVC College Students...");

  var firstNames = [
    "Sai", "Aditya", "Venkatesh", "Lakshmi", "Bhavana", "Harsha", "Pavan", "Kalyan", "Deepika", "Srinivas",
    "Anusha", "Tarun", "Divya", "Charan", "Nikhil", "Sneha", "Prasad", "Teja", "Manish", "Ramya",
    "Ganesh", "Mahesh", "Sravani", "Krishna", "Meghana", "Rajesh", "Kavya", "Varun", "Sindhu", "Pradeep",
    "Mounika", "Kiran", "Lavanya", "Rahul", "Pooja", "Vikram", "Swathi", "Ramesh", "Anitha", "Gopi",
    "Sailaja", "Vamsi", "Aparna", "Sandeep", "Sirisha", "Naveen", "Madhuri", "Satish", "Yamini", "Suresh"
  ];

  var lastNames = [
    "Malladi", "Vaddi", "Kolla", "Penumarthy", "Reddy", "Kakarla", "Chintala", "Gudimetla", "Kondeti", "Yeluri",
    "Medapati", "Golla", "Boddapati", "Gandu", "Adapa", "Dondapati", "Kotta", "Nallamothu", "Vangapandu", "Kilaru",
    "Bandaru", "Challa", "Meka", "Alluri", "Akula", "Pasupuleti", "Nidamanuri", "Rayavarapu", "Grandhi", "Guduru"
  ];

  var deptConfigs = [
    { code: "CSE", codeNum: "05", name: "Computer Science & Engineering" },
    { code: "ECE", codeNum: "04", name: "Electronics & Communication Engineering" },
    { code: "AIDS", codeNum: "54", name: "Artificial Intelligence & Data Science" },
    { code: "EEE", codeNum: "02", name: "Electrical & Electronics Engineering" },
    { code: "ME", codeNum: "03", name: "Mechanical Engineering" },
    { code: "CIVIL", codeNum: "01", name: "Civil Engineering" }
  ];

  var years = ["1", "2", "3", "4"];
  var sections = ["A", "B", "C"];
  var genders = ["Male", "Female"];

  var studentsToInsert = [];

  for (var i = 1; i <= 100; i++) {
    var fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    var lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    var fullName = fName + " " + lName;
    var deptObj = deptConfigs[i % deptConfigs.length];
    var year = years[i % years.length];
    var sem = (parseInt(year) * 2 - (i % 2)).toString();
    var section = sections[i % sections.length];
    var gender = genders[i % genders.length];
    
    var seqStr = (i < 10 ? "00" + i : (i < 100 ? "0" + i : "" + i));
    var rollNo = "23W11A" + deptObj.codeNum + seqStr;
    var studentId = "STD" + String(1000 + i);
    var email = fName.toLowerCase() + "." + rollNo.toLowerCase() + "@bvcgroup.in";
    var phone = "9848" + Math.floor(100000 + Math.random() * 900000);

    studentsToInsert.push({
      "Student ID": studentId,
      "Roll Number": rollNo,
      "Student Name": fullName,
      "Email Address": email,
      "Year": year,
      "Semester": sem,
      "Section": section,
      "Gender": gender,
      "Student Status": "Active",
      "Department ID": deptObj.code,
      "Phone Number": phone,
      "Notes": "BVC Batch 2023-2027"
    });
  }

  try {
    var inserted = DatabaseService.insertRows("STUDENTS", studentsToInsert);
    Logger.log("✅ Successfully seeded 100 college students into BVC database!");
    return Utils.buildResponse(true, "100 BVC College Students successfully created!", { count: studentsToInsert.length });
  } catch (err) {
    Logger.log("❌ Failed to seed 100 students: " + err.message);
    return Utils.buildResponse(false, "Failed to seed students: " + err.message);
  }
}
