/**
 * AttendanceCorrectionService.js
 * Handles submitting, reviewing, and approving/rejecting attendance correction requests.
 */
const AttendanceCorrectionService = {

  /**
   * Submits a new correction request.
   */
  submitRequest: function(attendanceId, requestedStatus, reason, userId) {
    try {
      if (!attendanceId || !requestedStatus || !reason) {
        return Utils.buildResponse(false, "Missing required correction details.");
      }

      const requestId = 'COR-' + Date.now();
      const payload = {
        request_id: requestId,
        attendance_id: attendanceId,
        user_id: userId,
        requested_status: requestedStatus,
        reason: reason,
        approval_status: 'Pending',
        deletion_flag: false,
        created_at: new Date().toISOString()
      };

      const success = DatabaseService.insertRow(CONFIG.SHEETS.ATTENDANCE_CORRECTIONS, payload);
      if (success) {
        AuditService.logAction(userId, 'CorrectionService', 'SUBMIT_CORRECTION', attendanceId, 'Attendance', 'Correction requested: ' + reason, '', '', 'SUCCESS', userId);
        return Utils.buildResponse(true, "Correction request submitted successfully.", { request: payload });
      }
      return Utils.buildResponse(false, "Failed to submit request.");
    } catch (e) {
      Logger.log("AttendanceCorrectionService.submitRequest error: " + e.message);
      return Utils.buildResponse(false, e.message);
    }
  },

  /**
   * Retrieves pending requests (HOD/Admin scopes enforced).
   */
  getPendingRequests: function(userContext) {
    try {
      const records = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE_CORRECTIONS) || [];
      const active = records.filter(r => !r.deletion_flag && r.approval_status === 'Pending');

      const isSuper = (userContext.role === 'Super Admin' || userContext.role === 'SUPER ADMIN');
      if (isSuper) return active;

      // Filter by department if HOD
      if (userContext.role === 'HOD') {
        const userDept = String(userContext.department || '').toUpperCase().trim();
        const usersList = DatabaseService.readAllRows(CONFIG.SHEETS.USERS) || [];
        
        return active.filter(r => {
          const reqUser = usersList.find(u => String(u.user_id).trim() === String(r.user_id).trim());
          if (!reqUser) return false;
          const dept = String(reqUser.department || '').toUpperCase().trim();
          return dept === userDept;
        });
      }

      return [];
    } catch (e) {
      Logger.log("AttendanceCorrectionService.getPendingRequests error: " + e.message);
      return [];
    }
  },

  /**
   * Approves correction request and updates original attendance record.
   */
  approveRequest: function(requestId, approverId) {
    try {
      const corrections = DatabaseService.readAllRows(CONFIG.SHEETS.ATTENDANCE_CORRECTIONS) || [];
      const req = corrections.find(c => String(c.request_id).trim() === String(requestId).trim());
      if (!req) return Utils.buildResponse(false, "Request not found.");

      // Update correction status
      DatabaseService.updateRow(CONFIG.SHEETS.ATTENDANCE_CORRECTIONS, 'request_id', requestId, {
        approval_status: 'Approved',
        handled_by: approverId
      });

      // Apply to original attendance
      const success = DatabaseService.updateRow(CONFIG.SHEETS.ATTENDANCE, 'attendance_id', req.attendance_id, {
        attendance_status: req.requested_status,
        correction_status: 'Approved',
        correction_handled_by: approverId,
        remarks: 'Corrected via request ' + requestId
      });

      if (success) {
        AuditService.logAction(approverId, 'CorrectionService', 'APPROVE_CORRECTION', req.attendance_id, 'Attendance', 'Correction request approved: ' + requestId, 'Absent', req.requested_status, 'SUCCESS', approverId);
        return Utils.buildResponse(true, "Correction request approved.");
      }
      return Utils.buildResponse(false, "Failed to apply correction to attendance.");
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  },

  /**
   * Rejects correction request.
   */
  rejectRequest: function(requestId, approverId) {
    try {
      const success = DatabaseService.updateRow(CONFIG.SHEETS.ATTENDANCE_CORRECTIONS, 'request_id', requestId, {
        approval_status: 'Rejected',
        handled_by: approverId
      });
      if (success) {
        AuditService.logAction(approverId, 'CorrectionService', 'REJECT_CORRECTION', requestId, 'Attendance', 'Correction request rejected: ' + requestId, '', '', 'SUCCESS', approverId);
        return Utils.buildResponse(true, "Correction request rejected.");
      }
      return Utils.buildResponse(false, "Failed to reject request.");
    } catch (e) {
      return Utils.buildResponse(false, e.message);
    }
  }
};
