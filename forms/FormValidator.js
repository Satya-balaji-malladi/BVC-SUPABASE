/**
 * FormValidator.js
 * Comprehensive Client-Side & Business Rule Validator for Attendance Forms Module.
 */
if (typeof window !== 'undefined') {
  window.AttendanceFormValidator = (() => {
    'use strict';

  const validateRollNumber = (roll) => {
    if (!roll || typeof roll !== 'string' || !roll.trim()) {
      return { valid: false, message: 'Roll Number is required.' };
    }
    const clean = roll.trim().toUpperCase();
    if (clean.length < 3) {
      return { valid: false, message: 'Roll Number must be at least 3 characters.' };
    }
    return { valid: true, clean };
  };

  const validateRequiredFields = (formData, requiredFieldsList) => {
    const errors = {};
    let isValid = true;

    requiredFieldsList.forEach(field => {
      const val = formData[field];
      if (val === undefined || val === null || String(val).trim() === '') {
        errors[field] = 'This field is required.';
        isValid = false;
      }
    });

    return { isValid, errors };
  };

  const checkDuplicateAttendance = async (eventId, rollNumber) => {
    try {
      if (typeof App !== 'undefined' && App.API && App.API._call) {
        const attendanceList = await App.API._call('getAttendanceByEvent', eventId);
        if (Array.isArray(attendanceList)) {
          const normRoll = String(rollNumber).trim().toUpperCase();
          const existing = attendanceList.find(a => {
            const r = a.roll_number || a['Roll Number'] || '';
            const isDel = a.deletion_flag || a['Deletion Flag'];
            return String(r).trim().toUpperCase() === normRoll && !isDel;
          });
          if (existing) {
            return {
              isDuplicate: true,
              timestamp: existing.attendance_time || existing.Timestamp || existing.created_at || new Date().toISOString(),
              coordinator: existing.action_by || existing.created_by || 'Coordinator'
            };
          }
        }
      }
    } catch (e) {
      console.warn('Duplicate check API call error, falling back:', e);
    }
    return { isDuplicate: false };
  };

  return {
    validateRollNumber,
    validateRequiredFields,
    checkDuplicateAttendance
  };
})();
}
