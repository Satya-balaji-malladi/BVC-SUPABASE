/**
 * MockData.js
 * Standardized mock datasets for verification.
 */
const MockData = {
  user: {
    'User ID': 'USR-MOCK-TEST',
    'Username': 'mockuser',
    'Password Hash': 'mock_hash',
    'Role': 'Coordinator',
    'Status': 'Active',
    'Email': 'mock@bvc.edu.in',
    'Full Name': 'Mock User'
  },

  student: {
    'Roll Number': 'ROLL-MOCK-TEST',
    'Student Name': 'Mock Student',
    'Department ID': 'CSE',
    'Year': '3',
    'Student Status': 'Active'
  },

  event: {
    'Event ID': 'EVT-MOCK-TEST',
    'Event Name': 'Mock Event',
    'Start Date': '2026-07-22',
    'End Date': '2026-07-22',
    'Event Status': 'Upcoming',
    'Capacity': 100,
    'Location': 'Lab 1',
    'Organizer': 'USR-MOCK-TEST'
  },

  participant: {
    'Registration ID': 'REG-MOCK-TEST',
    'Event ID': 'EVT-MOCK-TEST',
    'Roll Number': 'ROLL-MOCK-TEST',
    'Registration Status': 'Confirmed'
  },

  department: {
    'Department ID': 'CSE',
    'Department Name': 'Computer Science & Engineering',
    'Status': 'Active'
  }
};
