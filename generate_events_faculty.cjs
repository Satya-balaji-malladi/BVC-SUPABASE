const fs = require('fs');

const depts = ['DEPT_CSE', 'DEPT_AIML', 'DEPT_ECE', 'DEPT_EEE', 'DEPT_MECH', 'DEPT_CIVIL', 'DEPT_FY'];

let sql = `-- ==========================================\n`;
sql += `-- BVC SEED DATA: FACULTY, ADMINS, EVENTS & COORDINATORS\n`;
sql += `-- ==========================================\n\n`;

let userIdCounter = 1000;
let facultyIdCounter = 1000;
let eventIdCounter = 1000;
let assignmentIdCounter = 1000;

function getRandomDate(offsetDays) {
    const d = new Date('2026-08-15');
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
}

const regFieldsJSON = JSON.stringify([
    { field_name: "Phone Number", required: true },
    { field_name: "T-Shirt Size", required: false },
    { field_name: "Why do you want to join?", required: true }
]);

depts.forEach(dept => {
    sql += `-- ==========================================\n`;
    sql += `-- DATA FOR ${dept}\n`;
    sql += `-- ==========================================\n\n`;

    // 1. Create 3 Event Admins for this department
    sql += `-- Inserting 3 Event Admins\n`;
    const adminUsers = [];
    sql += `INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES\n`;
    for(let i=1; i<=3; i++) {
        const adminId = `USR_EVT_ADM_${userIdCounter++}`;
        adminUsers.push(adminId);
        sql += `('${adminId}', 'EMP_ADM_${dept}_${i}', 'Admin ${i}', '${dept}', 'admin${i}.${dept.toLowerCase()}@bvc.edu.in', 'admin${i}_${dept.toLowerCase()}', 'dummyhash', 'Faculty', '${dept}', 'Active')${i === 3 ? ';' : ','}\n`;
    }
    sql += `\n`;

    // 2. Create 10 Faculty members (who will act as coordinators)
    sql += `-- Inserting 10 Faculty Members\n`;
    const facultyUsers = [];
    sql += `INSERT INTO users (user_id, employee_id, first_name, last_name, email_address, username, password_hash, role, department, status) VALUES\n`;
    for(let i=1; i<=10; i++) {
        const uid = `USR_FAC_${userIdCounter++}`;
        facultyUsers.push(uid);
        sql += `('${uid}', 'EMP_FAC_${dept}_${i}', 'Faculty ${i}', '${dept}', 'faculty${i}.${dept.toLowerCase()}@bvc.edu.in', 'faculty${i}_${dept.toLowerCase()}', 'dummyhash', 'Faculty', '${dept}', 'Active')${i === 10 ? ';' : ','}\n`;
    }
    sql += `\n`;

    sql += `INSERT INTO faculty (faculty_id, employee_id, user_id, faculty_name, designation, department_id, email) VALUES\n`;
    facultyUsers.forEach((uid, index) => {
        const fid = `FAC_${facultyIdCounter++}`;
        const i = index + 1;
        sql += `('${fid}', 'EMP_${dept}_${100+i}', '${uid}', 'Faculty ${i} ${dept}', 'Assistant Professor', '${dept}', 'faculty${i}.${dept.toLowerCase()}@bvc.edu.in')${i === 10 ? ';' : ','}\n`;
    });
    sql += `\n`;

    // 3. Create 5 Events for this department
    sql += `-- Inserting 5 Events (Mix of Open, Fixed, 1-Day, Multi-Day, Registration Fields)\n`;
    const events = [];

    events.push({
        id: `EVT_${eventIdCounter++}`, name: `${dept} Tech Symposium (Open, 1-Day)`, type: 'Open', start: getRandomDate(5), end: getRandomDate(5), reg: 'No', fields: "'[]'"
    });
    events.push({
        id: `EVT_${eventIdCounter++}`, name: `${dept} Guest Lecture (Fixed, 1-Day)`, type: 'Fixed', start: getRandomDate(10), end: getRandomDate(10), reg: 'No', fields: "'[]'"
    });
    events.push({
        id: `EVT_${eventIdCounter++}`, name: `${dept} Hackathon (Open, 3-Days)`, type: 'Open', start: getRandomDate(15), end: getRandomDate(17), reg: 'Yes', fields: `'${regFieldsJSON}'`
    });
    events.push({
        id: `EVT_${eventIdCounter++}`, name: `${dept} Workshop (Fixed, 2-Days)`, type: 'Fixed', start: getRandomDate(20), end: getRandomDate(21), reg: 'Yes', fields: `'${regFieldsJSON}'`
    });
    events.push({
        id: `EVT_${eventIdCounter++}`, name: `${dept} Cultural Fest (Open, 1-Day)`, type: 'Open', start: getRandomDate(25), end: getRandomDate(25), reg: 'Yes', fields: `'${regFieldsJSON}'`
    });

    sql += `INSERT INTO events (event_id, event_name, description, location, organizer, start_date, end_date, start_time, end_time, attendance_type, enable_registration, registration_fields, departments, event_status, allowed_coordinator_ids) VALUES\n`;
    
    // Assign 2 Event Admins per event: 1 as 'organizer' and 1 in 'allowed_coordinator_ids'
    events.forEach((evt, index) => {
        const mainAdmin = adminUsers[0];
        const secondaryAdmin = adminUsers[1]; 
        const allowedIdsJSON = JSON.stringify([mainAdmin, secondaryAdmin]);
        sql += `('${evt.id}', '${evt.name}', 'Dummy description for ${evt.name}', 'Main Auditorium', '${mainAdmin}', '${evt.start}', '${evt.end}', '09:00:00', '16:00:00', '${evt.type}', '${evt.reg}', ${evt.fields}, '${dept}', 'Published', '${allowedIdsJSON}')${index === events.length - 1 ? ';' : ','}\n`;
    });
    sql += `\n`;

    // 4. Assign 3 Coordinators (Faculty) per event in event_coordinators table
    sql += `-- Assigning 3 Coordinators for each event\n`;
    sql += `INSERT INTO event_coordinators (assignment_id, event_id, user_id, assignment_role) VALUES\n`;
    
    let coordEntries = [];
    events.forEach((evt) => {
        // Pick first 3 faculty members to be coordinators for simplicity
        coordEntries.push(`('ASG_${assignmentIdCounter++}', '${evt.id}', '${facultyUsers[0]}', 'Event Coordinator')`);
        coordEntries.push(`('ASG_${assignmentIdCounter++}', '${evt.id}', '${facultyUsers[1]}', 'Event Coordinator')`);
        coordEntries.push(`('ASG_${assignmentIdCounter++}', '${evt.id}', '${facultyUsers[2]}', 'Event Coordinator')`);
    });
    sql += coordEntries.join(',\n') + ';\n\n';

});

fs.writeFileSync('dummy_events_faculty.sql', sql);
console.log('SQL File generated: dummy_events_faculty.sql');
