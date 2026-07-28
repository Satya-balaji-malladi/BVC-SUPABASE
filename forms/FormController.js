/**
 * FormController.js
 * Core Controller for managing multi-case attendance forms, validation, and Supabase API flows.
 */
if (typeof window !== 'undefined') {
  window.AttendanceFormController = (() => {
    'use strict';

    const state = {
      eventId: null,
      eventObj: null,
      studentData: null,
      participantData: null,
      isBvcOnly: true,
      isRegRequired: false,
      isSpotAllowed: false
    };

    const init = (eventId, eventObj) => {
      state.eventId = eventId;
      state.eventObj = eventObj || {};

      const elig = String(state.eventObj.eligibility || state.eventObj['Eligibility'] || 'BVC_ONLY').toUpperCase();
      state.isBvcOnly = elig.indexOf('BVC') !== -1;

      const reg = state.eventObj.enable_registration || state.eventObj['Enable Registration'];
      state.isRegRequired = String(reg).toLowerCase() === 'true';

      const spot = state.eventObj.allow_spot_registration || state.eventObj['Allow Spot Registration'];
      state.isSpotAllowed = String(spot).toLowerCase() === 'true';

      bindFormEvents();
    };

    const bindFormEvents = () => {
      // Open Event confirm button
      const btnOpenMark = document.getElementById('btnConfirmOpenEventMark');
      if (btnOpenMark) btnOpenMark.onclick = () => handleMarkAttendance();

      // Fixed Event confirm button
      const btnFixedMark = document.getElementById('btnConfirmFixedEventMark');
      if (btnFixedMark) btnFixedMark.onclick = () => handleMarkAttendance();

      // Spot Register & Mark button
      const btnSpotMark = document.getElementById('btnConfirmSpotRegisterMark');
      if (btnSpotMark) btnSpotMark.onclick = () => handleSpotRegisterAndMark();

      // Create New Student & Mark button
      const btnCreateMark = document.getElementById('btnConfirmCreateAndMark');
      if (btnCreateMark) btnCreateMark.onclick = () => handleCreateStudentAndMark();

      // Save Profile & Mark button
      const btnSaveProfileMark = document.getElementById('btnConfirmSaveProfileAndMark');
      if (btnSaveProfileMark) btnSaveProfileMark.onclick = () => handleSaveProfileAndMark();
    };

    const handleScanOrManualEntry = async (rawRollNumber) => {
      const valid = AttendanceFormValidator.validateRollNumber(rawRollNumber);
      if (!valid.valid) {
        if (typeof App !== 'undefined' && App.UI) App.UI.showError(valid.message);
        return;
      }
      const roll = valid.clean;

      // 1. Check Duplicate Attendance
      const dupCheck = await AttendanceFormValidator.checkDuplicateAttendance(state.eventId, roll);
      if (dupCheck.isDuplicate) {
        showDuplicateModal(dupCheck);
        return;
      }

      // 2. Fetch Student Record via App.API
      let student = null;
      try {
        if (typeof App !== 'undefined' && App.API && App.API.getStudentByRollNumber) {
          student = await App.API.getStudentByRollNumber(roll);
        }
      } catch (e) {
        console.warn('Student API fetch failed:', e);
      }

      state.studentData = student;

      // Dispatch Flow Cases
      if (!state.isRegRequired) {
        // CASE 1: OPEN EVENT
        if (student) {
          const missing = checkMissingStudentFields(student);
          if (missing.length > 0) {
            // CASE 1B: Student Exists but Required Data Missing
            openStudentMissingDetailsModal(student, missing);
          } else {
            // CASE 1A: Student Exists with Complete Data
            openOpenEventVerificationModal(student);
          }
        } else {
          // CASE 1C: Student NOT Found
          openStudentNotFoundModal(roll);
        }
      } else {
        // CASE 3: FIXED EVENT (Registration Required)
        if (student) {
          const participant = await checkParticipantRegistration(state.eventId, roll);
          if (participant) {
            // CASE 3A: Registered & Approved
            openFixedEventVerificationModal(student, participant);
          } else if (state.isSpotAllowed) {
            // CASE 3B: Not Registered -> Spot Registration Enabled
            openSpotRegistrationModal(roll, student);
          } else {
            // CASE 3B: Not Registered -> Spot Registration Disabled
            if (typeof App !== 'undefined' && App.UI) {
              App.UI.showError('Registration Closed. Student is not registered for this fixed event.');
            }
          }
        } else if (state.isSpotAllowed) {
          openSpotRegistrationModal(roll, null);
        } else {
          if (typeof App !== 'undefined' && App.UI) {
            App.UI.showError('Registration Closed. Student record not found.');
          }
        }
      }
    };

    const checkMissingStudentFields = (student) => {
      let requiredList = [];
      const openFields = state.eventObj.open_required_fields || state.eventObj['Open Required Fields'] || state.eventObj.required_student_fields;
      if (typeof openFields === 'string') {
        try { requiredList = JSON.parse(openFields); } catch (e) { requiredList = openFields.split(',').map(s => s.trim()); }
      } else if (Array.isArray(openFields)) {
        requiredList = openFields;
      }

      if (!requiredList || requiredList.length === 0) {
        requiredList = ['Student Full Name', 'Department / Branch', 'Academic Year', 'Mobile / Phone Number'];
      }

      const fieldKeyMap = {
        'Student Full Name': ['student_name', 'name', 'full_name'],
        'Department / Branch': ['department', 'department_id', 'branch', 'dept'],
        'Academic Year': ['year', 'academic_year'],
        'Section': ['section'],
        'Mobile / Phone Number': ['phone', 'mobile', 'phone_number'],
        'Email Address': ['email', 'email_address'],
        'Gender': ['gender'],
        'College / Institution Name': ['college_name', 'college', 'institution'],
        'Guardian Name': ['guardian_name', 'parent_name'],
        'Date of Birth': ['dob', 'date_of_birth'],
        'Notes': ['notes', 'remarks']
      };

      const missing = [];
      requiredList.forEach(reqName => {
        const keys = fieldKeyMap[reqName] || [reqName.toLowerCase().replace(/[^a-z0-9_]/g, '_')];
        const hasVal = keys.some(k => student[k] !== undefined && student[k] !== null && String(student[k]).trim() !== '');
        if (!hasVal) {
          missing.push(reqName);
        }
      });
      return missing;
    };

    const checkParticipantRegistration = async (eventId, roll) => {
      try {
        if (typeof App !== 'undefined' && App.API && App.API.getEventParticipants) {
          const parts = await App.API.getEventParticipants(eventId);
          if (Array.isArray(parts)) {
            const norm = String(roll).toUpperCase();
            return parts.find(p => String(p.roll_number || p['Roll Number']).toUpperCase() === norm);
          }
        }
      } catch (e) {
        console.warn('Participant check failed:', e);
      }
      return null;
    };

    const handleMarkAttendance = async () => {
      if (!state.studentData || !state.eventId) return;
      try {
        const payload = {
          event_id: state.eventId,
          roll_number: state.studentData.roll_number || state.studentData.roll,
          status: 'Present',
          action_by: (App.State && App.State.currentUser) ? App.State.currentUser.user_id : 'Coordinator'
        };

        if (App.API && App.API._call) {
          const res = await App.API._call('markAttendanceFast', payload);
          if (res && res.success !== false) {
            hideAllModals();
            showSuccessModal('Attendance recorded successfully!');
          } else {
            if (App.UI) App.UI.showError(res.message || 'Failed to mark attendance.');
          }
        }
      } catch (e) {
        if (App.UI) App.UI.showError('Error marking attendance: ' + e.message);
      }
    };

    const handleSpotRegisterAndMark = async () => {
      const name = document.getElementById('spotNameInput').value.trim();
      const dept = document.getElementById('spotDeptSelect').value;
      const year = document.getElementById('spotYearSelect').value;
      const roll = document.getElementById('spotRollInput').value;
      const college = state.isBvcOnly ? 'BVC Engineering College' : document.getElementById('spotCollegeInput').value.trim();

      if (!name || (!state.isBvcOnly && !college)) {
        if (App.UI) App.UI.showError('Please fill in all required fields.');
        return;
      }

      state.studentData = { roll_number: roll, student_name: name, department: dept, year, college_name: college };
      await handleMarkAttendance();
    };

    const handleCreateStudentAndMark = async () => {
      const roll = document.getElementById('newStudentRollInput').value;
      const name = document.getElementById('newStudentNameInput').value.trim();
      const dept = document.getElementById('newStudentDeptSelect').value;
      const year = document.getElementById('newStudentYearSelect').value;
      const college = state.isBvcOnly ? 'BVC Engineering College' : document.getElementById('newStudentCollegeInput').value.trim();

      if (!name || (!state.isBvcOnly && !college)) {
        if (App.UI) App.UI.showError('Please fill in all required fields.');
        return;
      }

      state.studentData = { roll_number: roll, student_name: name, department: dept, year, college_name: college };
      await handleMarkAttendance();
    };

    const handleSaveProfileAndMark = async () => {
      await handleMarkAttendance();
    };

    // Modal display helpers using Bootstrap Modal API
    const openOpenEventVerificationModal = (student) => {
      const container = document.getElementById('openEventProfileContainer');
      if (container) container.innerHTML = AttendanceFormRenderer.renderProfileCard(student);
      const modal = new bootstrap.Modal(document.getElementById('openEventVerificationModal'));
      modal.show();
    };

    const openFixedEventVerificationModal = (student, participant) => {
      const container = document.getElementById('fixedEventProfileContainer');
      if (container) container.innerHTML = AttendanceFormRenderer.renderProfileCard(student);
      const seatEl = document.getElementById('fixedSeatNumber');
      if (seatEl) seatEl.textContent = participant.seat_number || 'General';
      const modal = new bootstrap.Modal(document.getElementById('fixedEventVerificationModal'));
      modal.show();
    };

    const openSpotRegistrationModal = (roll, student) => {
      document.getElementById('spotRollInput').value = roll;
      if (student) {
        document.getElementById('spotNameInput').value = student.student_name || '';
      }
      const colGroup = document.getElementById('spotCollegeContainer');
      if (colGroup) colGroup.style.display = state.isBvcOnly ? 'none' : 'block';
      const modal = new bootstrap.Modal(document.getElementById('spotRegistrationModal'));
      modal.show();
    };

    const openStudentNotFoundModal = (roll) => {
      document.getElementById('newStudentRollInput').value = roll;
      const colGroup = document.getElementById('newStudentCollegeGroup');
      if (colGroup) colGroup.style.display = state.isBvcOnly ? 'none' : 'block';
      const modal = new bootstrap.Modal(document.getElementById('studentNotFoundModal'));
      modal.show();
    };

    const openStudentMissingDetailsModal = (student, missingFields) => {
      document.getElementById('missingReadOnlyName').textContent = student.student_name || student.name || '--';
      document.getElementById('missingReadOnlyRoll').textContent = student.roll_number || student.roll || '--';

      const inputsContainer = document.getElementById('missingFieldsDynamicInputs');
      if (inputsContainer) {
        inputsContainer.innerHTML = missingFields.map(field => `
        <div class="col-12">
          <label class="form-label small fw-bold text-muted text-capitalize">${field} <span class="text-danger">*</span></label>
          <input type="text" class="form-control af-form-control af-field-missing" name="${field}" required placeholder="Enter ${field}" />
        </div>
      `).join('');
      }
      const modal = new bootstrap.Modal(document.getElementById('studentMissingDetailsModal'));
      modal.show();
    };

    const showDuplicateModal = (details) => {
      if (App.UI) App.UI.showWarning(`Already marked present at ${new Date(details.timestamp).toLocaleTimeString()}`);
    };

    const showSuccessModal = (msg) => {
      const msgEl = document.getElementById('successModalMessage');
      if (msgEl) msgEl.textContent = msg;
      const modal = new bootstrap.Modal(document.getElementById('verificationSuccessModal'));
      modal.show();
    };

    const hideAllModals = () => {
      const modals = document.querySelectorAll('.modal.show');
      modals.forEach(m => {
        const inst = bootstrap.Modal.getInstance(m);
        if (inst) inst.hide();
      });
    };

    return {
      init,
      handleScanOrManualEntry
    };
  })();
}
