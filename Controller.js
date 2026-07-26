/**
 * Controller.js
 * 
 * Acts as the API layer between the frontend and the Service layer.
 * Contains no business logic, validation, calculations, or database operations.
 * Delegates all operations to the appropriate service.
 */

const Controller = {

  // ==========================================
  // Authentication Controller
  // ==========================================
  Auth: {
    /**
     * Authenticates a user and creates a session.
     * @param {object} credentials - { usernameOrEmail, password }
     * @returns {object} Response object.
     */
    login: function (credentials) {
      return AuthService.login(credentials);
    },

    /**
     * Destroys an active session.
     * @param {string} sessionToken 
     * @returns {object} Response object.
     */
    logout: function (sessionToken) {
      return AuthService.logout(sessionToken);
    },

    /**
     * Validates a session token via AuthService.
     * @param {string} sessionToken 
     * @returns {object} Response object.
     */
    authenticate: function (sessionToken) {
      return AuthService.authenticate(sessionToken);
    }
  },

  // ==========================================
  // Session Controller
  // ==========================================
  Session: {
    /**
     * Validates a session token.
     * @param {string} sessionToken 
     * @returns {object|null} The session object if valid, else null.
     */
    validateSession: function (sessionToken) {
      return SessionService.validateSession(sessionToken);
    },

    /**
     * Retrieves the current user for a session.
     * @param {string} sessionToken 
     * @returns {object|null} The user object if session is valid.
     */
    getCurrentUser: function (sessionToken) {
      return SessionService.getCurrentUser(sessionToken);
    },

    /**
     * Checks if a session belongs to a user with a specific role.
     * @param {string} sessionToken 
     * @param {string} role 
     * @returns {boolean} True if user has the specified role.
     */
    hasRole: function (sessionToken, role) {
      return SessionService.hasRole(sessionToken, role);
    }
  },

  // ==========================================
  // User Controller
  // ==========================================
  User: {
    /**
     * Creates a new user.
     * @param {object} userData 
     * @returns {object} Response object.
     */
    createUser: function (sessionToken, userData) {
      return SessionService.withSession(sessionToken, function (userId) {
        if (!SecurityUtils.hasPermission(userId, 'create_user')) {
          return Utils.buildResponse(false, 'Unauthorized: You do not have permission to create users.');
        }
        Logger.log("BACKEND STEP 2: Controller.User.createUser started");
        const callerUserContext = SessionService.getUserContext(sessionToken);
        const result = UserService.createUser(userData, callerUserContext);
        Logger.log("BACKEND STEP 7: Controller.User.createUser finished.");
        return result;
      });
    },

    /**
     * Imports multiple users in bulk.
     * @param {object[]} usersDataArray 
     * @returns {object} Response object.
     */
    importUsers: function (sessionToken, usersDataArray) {
      return SessionService.withSession(sessionToken, function (userId) {
        if (!SecurityUtils.hasPermission(userId, 'create_user')) {
          return Utils.buildResponse(false, 'Unauthorized: You do not have permission to import users.');
        }
        Logger.log("BACKEND STEP 2: Controller.User.importUsers started");
        const result = UserService.importUsers(usersDataArray);
        Logger.log("BACKEND STEP 7: Controller.User.importUsers finished.");
        return result;
      });
    },

    /**
     * Retrieves a user by ID.
     * @param {string} userId 
     * @returns {object|null}
     */
    getUserById: function (sessionToken, userId) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return UserService.getUserById(userId);
      });
    },

    /**
     * Completes first-time login setup (password & details).
     */
    completeFirstTimeSetup: function (sessionToken, setupData) {
      return SessionService.withSession(sessionToken, function (userId) {
        return UserService.completeFirstTimeSetup(userId, setupData);
      });
    },

    /**
     * Retrieves a user by username.
     * @param {string} username 
     * @returns {object|null}
     */
    getUserByUsername: function (sessionToken, username) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return UserService.getUserByUsername(username);
      });
    },

    /**
     * @returns {object[]} Array of all users.
     */
    getAllUsers: function (sessionToken) {
      Logger.log("BACKEND STEP 5: Entering Controller.User.getAllUsers");
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        Logger.log("BACKEND STEP 6: Session validated. sessionUserId: " + _sessionUserId);
        const userContext = SessionService.getUserContext(sessionToken);
        const users = UserService.getAllUsers(userContext);
        Logger.log("BACKEND STEP 7 - Controller.User.getAllUsers received from UserService: " + typeof users + " / Array? " + Array.isArray(users) + " / Length: " + (users ? users.length : 0));
        return users || [];
      });
    },

    /**
     * Updates an existing user.
     * @param {string} userId 
     * @param {object} userData 
     * @returns {object} Response object.
     */
    updateUser: function (sessionToken, userId, userData) {
      return SessionService.withSession(sessionToken, function (callerId) {
        if (!SecurityUtils.hasPermission(callerId, 'edit_user')) {
          return Utils.buildResponse(false, 'Unauthorized: You do not have permission to update users.');
        }
        return UserService.updateUser(userId, userData);
      });
    },

    /**
     * Deletes a user.
     * @param {string} userId 
     * @returns {object} Response object.
     */
    deleteUser: function (sessionToken, userId) {
      return SessionService.withSession(sessionToken, function (callerId) {
        if (!SecurityUtils.hasPermission(callerId, 'delete_user')) {
          return Utils.buildResponse(false, 'Unauthorized: You do not have permission to delete users.');
        }
        return UserService.deleteUser(userId);
      });
    },

    /**
     * Deactivates a user.
     * @param {string} userId 
     * @returns {object} Response object.
     */
    deactivateUser: function (sessionToken, userId) {
      return SessionService.withSession(sessionToken, function (callerId) {
        if (!SecurityUtils.hasPermission(callerId, 'edit_user')) {
          return Utils.buildResponse(false, 'Unauthorized: You do not have permission to deactivate users.');
        }
        return UserService.deactivateUser(userId);
      });
    },

    /**
     * Resets a user's password to the default.
     * @param {string} userId 
     * @returns {object} Response object.
     */
    resetPassword: function (sessionToken, userId) {
      return SessionService.withSession(sessionToken, function (callerId) {
        if (!SecurityUtils.hasPermission(callerId, 'reset_password')) {
          return Utils.buildResponse(false, 'Unauthorized: You do not have permission to reset user passwords.');
        }
        return UserService.resetPassword(userId);
      });
    },

    /**
     * Activates a user.
     * @param {string} userId 
     * @returns {object} Response object.
     */
    activateUser: function (sessionToken, userId) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return UserService.activateUser(userId);
      });
    },

    /**
     * Searches users by keyword.
     * @param {string} keyword 
     * @returns {object[]}
     */
    searchUsers: function (sessionToken, keyword) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return UserService.searchUsers(keyword);
      });
    },

    /**
     * Changes a user's password.
     * @param {string} userId 
     * @param {string} oldPassword 
     * @param {string} newPassword 
     * @returns {object} Response object.
     */
    changePassword: function (sessionToken, userId, oldPassword, newPassword) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return UserService.changePassword(userId, oldPassword, newPassword);
      });
    },
  },

  // ==========================================
  // Student Controller
  // ==========================================
  Student: {
    /**
     * Creates a new student.
     * @param {object} studentData 
     * @returns {object} Response object.
     */
    createStudent: function (sessionToken, studentData) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return StudentService.createStudent(studentData);
      });
    },

    /**
     * Updates an existing student.
     * @param {string} rollNumber 
     * @param {object} studentData 
     * @returns {object} Response object.
     */
    updateStudent: function (sessionToken, rollNumber, studentData) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return StudentService.updateStudent(rollNumber, studentData);
      });
    },

    /**
     * Deletes a student.
     * @param {string} rollNumber 
     * @returns {object} Response object.
     */
    deleteStudent: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return StudentService.deleteStudent(rollNumber);
      });
    },

    /**
     * Retrieves a student by Roll Number.
     * @param {string} rollNumber 
     * @returns {object|null}
     */
    getStudentByRollNumber: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        if (!rollNumber) return Utils.buildResponse(false, 'Missing roll number parameter.');
        const student = StudentService.getStudentByRollNumber(rollNumber);
        if (student) {
          return Utils.buildResponse(true, 'Student retrieved successfully', { student: student });
        }
        return Utils.buildResponse(false, (CONFIG.MESSAGES && CONFIG.MESSAGES.STUDENT_NOT_FOUND) ? CONFIG.MESSAGES.STUDENT_NOT_FOUND : 'Student not found');
      });
    },

    /**
     * Retrieves all students.
     * @returns {object[]}
     */
    getAllStudents: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        const userContext = SessionService.getUserContext(sessionToken);
        return StudentService.getAllStudents(userContext);
      });
    },

    /**
     * Searches students by keyword.
     * @param {string} keyword 
     * @returns {object[]}
     */
    searchStudents: function (sessionToken, keyword) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return StudentService.searchStudents(keyword);
      });
    },

    /**
     * Retrieves students by Department.
     * @param {string} department 
     * @returns {object[]}
     */
    getStudentsByDepartment: function (sessionToken, department) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return StudentService.getStudentsByDepartment(department);
      });
    },

    /**
     * Retrieves students by Year.
     * @param {string|number} year 
     * @returns {object[]}
     */
    getStudentsByYear: function (sessionToken, year) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return StudentService.getStudentsByYear(year);
      });
    },

    /**
     * Retrieves students by Section.
     * @param {string} section 
     * @returns {object[]}
     */
    getStudentsBySection: function (sessionToken, section) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return StudentService.getStudentsBySection(section);
      });
    },
  },

  // ==========================================
  // Event Controller
  // ==========================================
  Event: {
    /**
     * Creates a new event.
     * @param {object} eventData 
     * @returns {object} Response object.
     */
    createEvent: function (sessionToken, eventData) {
      return SessionService.withSession(sessionToken, function (userId) {
        if (!SecurityUtils.hasPermission(userId, 'create_event')) {
          return Utils.buildResponse(false, 'Unauthorized: You do not have permission to create events.');
        }
        return EventService.createEvent(eventData, userId);
      });
    },

    /**
     * Updates an existing event.
     * @param {string} eventId 
     * @param {object} eventData 
     * @returns {object} Response object.
     */
    updateEvent: function (sessionToken, eventId, eventData) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        if (!SecurityUtils.hasPermission(_sessionUserId, 'edit_event', eventId)) {
          return Utils.buildResponse(false, 'Unauthorized: You do not have permission to edit this event.');
        }
        Logger.log("BACKEND: Controller.Event.updateEvent started for " + eventId);
        const result = EventService.updateEvent(eventId, eventData, _sessionUserId);
        Logger.log("BACKEND: Controller.Event.updateEvent finished.");
        return result;
      });
    },

    /**
     * Deletes an event.
     * @param {string} eventId 
     * @returns {object} Response object.
     */
    deleteEvent: function (sessionToken, eventId) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        if (!SecurityUtils.hasPermission(_sessionUserId, 'delete_event', eventId)) {
          return Utils.buildResponse(false, 'Unauthorized: You do not have permission to delete this event.');
        }
        return EventService.deleteEvent(eventId);
      });
    },

    /**
     * Retrieves an event by ID.
     * @param {string} eventId 
     * @returns {object|null}
     */
    getEventById: function (sessionToken, eventId) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        Logger.log("BACKEND: Controller.Event.getEventById started for " + eventId);
        const userContext = SessionService.getUserContext(sessionToken);
        const result = EventService.getEventById(eventId, userContext);
        Logger.log("BACKEND: Controller.Event.getEventById finished.");
        return result;
      });
    },

    /**
     * Retrieves event details along with computed timeline days.
     * @param {string} eventId
     * @returns {object} Response object with timeline days.
     */
    getEventDetailsWithTimeline: function (sessionToken, eventId) {
      return SessionService.withSession(sessionToken, function (userId) {
        Logger.log("BACKEND: Controller.Event.getEventDetailsWithTimeline started for " + eventId);
        const userContext = SessionService.getUserContext(sessionToken);
        const result = EventService.getEventDetailsWithTimeline(eventId, userContext);
        Logger.log("BACKEND: Controller.Event.getEventDetailsWithTimeline finished.");
        return result;
      });
    },

    /**
     * Retrieves all events.
     * @returns {object} Response object.
     */
    getAllEvents: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        const userContext = SessionService.getUserContext(sessionToken);
        const events = EventService.getAllEvents(userContext);
        Logger.log("Controller.Event.getAllEvents() events length: " + (events ? events.length : "null"));
        return events || [];
      });
    },

    /**
     * Searches events by keyword.
     * @param {string} keyword 
     * @returns {object[]}
     */
    searchEvents: function (sessionToken, keyword) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        const userContext = SessionService.getUserContext(sessionToken);
        return EventService.searchEvents(keyword, userContext);
      });
    },

    /**
     * Retrieves events managed by a specific coordinator.
     * @param {string} coordinatorId 
     * @returns {object[]}
     */
    getEventsByCoordinator: function (sessionToken, coordinatorId) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return EventService.getEventsByCoordinator(coordinatorId);
      });
    },

    /**
     * Retrieves events by status.
     * @param {string} status 
     * @returns {object[]}
     */
    getEventsByStatus: function (sessionToken, status) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return EventService.getEventsByStatus(status);
      });
    },

    /**
     * Retrieves events by date.
     * @param {string} date 
     * @returns {object[]}
     */
    getEventsByDate: function (sessionToken, date) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return EventService.getEventsByDate(date);
      });
    },

  },

  // ==========================================
  // Attendance Controller
  // ==========================================
  Attendance: {
    /**
     * Marks attendance for a student at an event.
     * @param {object} attendanceData 
     * @returns {object} Response object.
     */
    markAttendance: function (sessionToken, attendanceData) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          // Validate request payload (minimal null safety)
          if (!attendanceData || typeof attendanceData !== 'object') {
            return Utils.buildResponse(false, 'Invalid attendance request');
          }
          const res = AttendanceService.markAttendance(attendanceData, sessionUserId);
          return res && (typeof res === 'object') && (res.success !== undefined) ? res : Utils.buildResponse(true, 'Attendance processed', { result: res });
        } catch (e) {
          Logger.log('Controller.Attendance.markAttendance error: ' + (e && e.message ? e.message : e));
          return Utils.buildResponse(false, e && e.message ? e.message : 'Attendance marking failed');
        }
      });
    },


    /**
     * Deletes an attendance record.
     * @param {string} attendanceId 
     * @returns {object} Response object.
     */
    deleteAttendance: function (sessionToken, attendanceId) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          if (!attendanceId) return Utils.buildResponse(false, 'Invalid attendance request');
          return AttendanceService.deleteAttendance(attendanceId, sessionUserId);
        } catch (e) {
          Logger.log('Controller.Attendance.deleteAttendance error: ' + (e && e.message ? e.message : e));
          return Utils.buildResponse(false, e && e.message ? e.message : 'Attendance deletion failed');
        }
      });
    },


    /**
     * Retrieves an attendance record by ID.
     * @param {string} attendanceId 
     * @returns {object|null}
     */
    getAttendanceById: function (sessionToken, attendanceId) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.getAttendanceById(attendanceId);
      });
    },

    /**
     * Retrieves attendance records by Event ID.
     * @param {string} eventId 
     * @returns {object[]}
     */
    getAttendanceByEvent: function (sessionToken, eventId) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        const userContext = SessionService.getUserContext(sessionToken);
        if (userContext && typeof SecurityUtils !== 'undefined' && SecurityUtils.canAccessEvent) {
          if (!SecurityUtils.canAccessEvent(eventId, userContext)) {
            return [];
          }
        }
        return AttendanceService.getAttendanceByEvent(eventId);
      });
    },

    /**
     * Retrieves attendance list for a specific day of an event.
     * @param {string} eventId
     * @param {number} dayNumber
     * @returns {object} Response object with attendance records.
     */
    getEventDayAttendance: function (sessionToken, eventId, dayNumber) {
      return SessionService.withSession(sessionToken, function (userId) {
        const userContext = SessionService.getUserContext(sessionToken);
        return AttendanceService.getEventDayAttendance(eventId, dayNumber, userContext);
      });
    },

    /**
     * Retrieves attendance records by Student Roll Number.
     * @param {string} rollNumber 
     * @returns {object[]}
     */
    getAttendanceByStudent: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.getAttendanceByStudent(rollNumber);
      });
    },

    /**
     * Retrieves attendance records by date.
     * @param {string} date 
     * @returns {object[]}
     */
    getAttendanceByDate: function (sessionToken, date) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.getAttendanceByDate(date);
      });
    },

    /**
     * Retrieves attendance records by status.
     * @param {string} status 
     * @returns {object[]}
     */
    getAttendanceByStatus: function (sessionToken, status) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.getAttendanceByStatus(status);
      });
    },

    /**
     * Checks if an attendance record already exists.
     * @param {string} eventId 
     * @param {string} rollNumber 
     * @returns {boolean}
     */
    checkAttendanceExists: function (sessionToken, eventId, rollNumber) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.checkAttendanceExists(eventId, rollNumber);
      });
    },

    /**
     * Retrieves attendance counts for a specific event.
     * @param {string} eventId 
     * @returns {object}
     */
    getEventAttendanceCount: function (sessionToken, eventId) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.getEventAttendanceCount(eventId);
      });
    },

    /**
     * Retrieves the total attendance records count for a student.
     * @param {string} rollNumber 
     * @returns {number}
     */
    getStudentAttendanceCount: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.getStudentAttendanceCount(rollNumber);
      });
    },

    /**
     * Retrieves the summarized attendance data for a student.
     * @param {string} rollNumber 
     * @returns {object}
     */
    getStudentAttendanceSummary: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.getStudentAttendanceSummary(rollNumber);
      });
    },

    /**
     * Retrieves overall attendance statistics across all events.
     * @returns {object}
     */
    getOverallAttendanceStatistics: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.getOverallAttendanceStatistics();
      });
    },

    /**
     * Retrieves an attendance summary for a specific event.
     * @param {string} eventId 
     * @returns {object|null}
     */
    getAttendanceSummaryByEvent: function (sessionToken, eventId) {
      return SessionService.withSession(sessionToken, function (_sessionUserId) {
        return AttendanceService.getAttendanceSummaryByEvent(eventId);
      });
    },
  },

  // ==========================================
  // Report Controller
  // ==========================================
  Report: {
    getDashboardSummary: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDashboardSummary(userId);
      });
    },
    getReportsDashboardSummary: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getReportsDashboardSummary(userId);
      });
    },
    getEventReport: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getEventReport(userId, filters);
      });
    },
    getStudentReport: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getStudentReport(userId, rollNumber);
      });
    },
    getDepartmentReport: function (sessionToken, department) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDepartmentReport(userId, department);
      });
    },
    getCoordinatorReport: function (sessionToken, coordinatorId) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getCoordinatorReport(userId, coordinatorId);
      });
    },
    getDateRangeReport: function (sessionToken, fromDate, toDate) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDateRangeReport(userId, fromDate, toDate);
      });
    },
    getAttendanceDefaulters: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getAttendanceDefaulters(userId, filters);
      });
    },
    getTopParticipants: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getTopParticipants(userId, filters);
      });
    },
    getCollegeRankingReport: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getCollegeRankingReport(userId);
      });
    },
    getDepartmentRankingReport: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDepartmentRankingReport(userId);
      });
    },
    getDepartmentBranchRankingReport: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDepartmentBranchRankingReport(userId);
      });
    },
    getAbsentStudents: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getAbsentStudents(userId, filters);
      });
    },
    getYearWiseReport: function (sessionToken, year) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getYearWiseReport(userId, year);
      });
    },
    getDepartmentComparison: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDepartmentComparison(userId);
      });
    },
    getMonthlyReport: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getMonthlyReport(userId, filters);
      });
    },
    getEventTrendReport: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getEventTrendReport(userId, filters);
      });
    },
    getCancelledEvents: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getCancelledEvents(userId, filters);
      });
    },
    getCoordinatorPerformance: function (sessionToken, coordinatorId) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getCoordinatorPerformance(userId, coordinatorId);
      });
    },
    getStudentEventHistory: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getStudentEventHistory(userId, rollNumber);
      });
    }
  },

  // ==========================================
  // Participant Controller
  // ==========================================
  Participant: {
    getEventParticipants: function (sessionToken, eventId) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          if (!eventId) return [];
          const userContext = SessionService.getUserContext(sessionToken);
          if (userContext && typeof SecurityUtils !== 'undefined' && SecurityUtils.canAccessEvent) {
            if (!SecurityUtils.canAccessEvent(eventId, userContext)) {
              return [];
            }
          }
          return ParticipantService.getEventParticipants(eventId, sessionUserId);
        } catch (e) {
          Logger.log('Controller.Participant.getEventParticipants error: ' + (e && e.message ? e.message : e));
          return [];
        }
      });
    },

    addParticipant: function (sessionToken, eventId, rollNumber) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          if (!eventId || !rollNumber) return Utils.buildResponse(false, 'Invalid participant request');
          const userContext = SessionService.getUserContext(sessionToken);
          if (userContext && typeof SecurityUtils !== 'undefined' && SecurityUtils.canAccessEvent) {
            if (!SecurityUtils.canAccessEvent(eventId, userContext)) {
              return Utils.buildResponse(false, 'Access denied for event.');
            }
          }
          return ParticipantService.addParticipant(eventId, rollNumber, sessionUserId);
        } catch (e) {
          Logger.log('Controller.Participant.addParticipant error: ' + (e && e.message ? e.message : e));
          return Utils.buildResponse(false, e && e.message ? e.message : 'Failed to add participant');
        }
      });
    },

    removeParticipant: function (sessionToken, eventId, rollNumber) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          if (!eventId || !rollNumber) return Utils.buildResponse(false, 'Invalid participant request');
          const userContext = SessionService.getUserContext(sessionToken);
          if (userContext && typeof SecurityUtils !== 'undefined' && SecurityUtils.canAccessEvent) {
            if (!SecurityUtils.canAccessEvent(eventId, userContext)) {
              return Utils.buildResponse(false, 'Access denied for event.');
            }
          }
          return ParticipantService.removeParticipant(eventId, rollNumber, sessionUserId);
        } catch (e) {
          Logger.log('Controller.Participant.removeParticipant error: ' + (e && e.message ? e.message : e));
          return Utils.buildResponse(false, e && e.message ? e.message : 'Failed to remove participant');
        }
      });
    },

    restoreParticipant: function (sessionToken, eventId, rollNumber) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          if (!eventId || !rollNumber) return Utils.buildResponse(false, 'Invalid participant request');
          return ParticipantService.restoreParticipant(eventId, rollNumber, sessionUserId);
        } catch (e) {
          Logger.log('Controller.Participant.restoreParticipant error: ' + (e && e.message ? e.message : e));
          return Utils.buildResponse(false, e && e.message ? e.message : 'Failed to restore participant');
        }
      });
    },

    checkEligibility: function (sessionToken, eventId, rollNumber) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          if (!eventId || !rollNumber) return Utils.buildResponse(false, 'Invalid participant request');
          return ParticipantService.checkEligibility(eventId, rollNumber, sessionUserId);
        } catch (e) {
          Logger.log('Controller.Participant.checkEligibility error: ' + (e && e.message ? e.message : e));
          return Utils.buildResponse(false, e && e.message ? e.message : 'Failed to check eligibility');
        }
      });
    },

    getAllEnrichedParticipants: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          return ParticipantService.getAllEnrichedParticipants(sessionUserId);
        } catch (e) {
          Logger.log('Controller.Participant.getAllEnrichedParticipants error: ' + (e && e.message ? e.message : e));
          return Utils.buildResponse(false, e && e.message ? e.message : 'Failed to get enriched participants');
        }
      });
    },

    bulkAddParticipants: function (sessionToken, eventId, rollNumbers) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          if (!eventId || !rollNumbers || !Array.isArray(rollNumbers)) return Utils.buildResponse(false, 'Invalid bulk import request');
          return ParticipantService.bulkAddParticipants(eventId, rollNumbers, sessionUserId);
        } catch (e) {
          Logger.log('Controller.Participant.bulkAddParticipants error: ' + (e && e.message ? e.message : e));
          return Utils.buildResponse(false, e && e.message ? e.message : 'Failed to bulk add participants');
        }
      });
    },

    bulkRemoveParticipants: function (sessionToken, eventId, rollNumbers) {
      return SessionService.withSession(sessionToken, function (sessionUserId) {
        try {
          if (!eventId || !rollNumbers || !Array.isArray(rollNumbers)) return Utils.buildResponse(false, 'Invalid bulk remove request');
          return ParticipantService.bulkRemoveParticipants(eventId, rollNumbers, sessionUserId);
        } catch (e) {
          Logger.log('Controller.Participant.bulkRemoveParticipants error: ' + (e && e.message ? e.message : e));
          return Utils.buildResponse(false, e && e.message ? e.message : 'Failed to bulk remove participants');
        }
      });
    }

  },

  // ==========================================
  // Analytics API
  // ==========================================
  Analytics: {
    getAnalyticsSummary: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return AnalyticsService.getAnalyticsSummary(userId);
      });
    },
    getTrendData: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return AnalyticsService.getTrendData(userId);
      });
    },
    getDepartmentData: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return AnalyticsService.getDepartmentData(userId);
      });
    },
    getEventWiseData: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return AnalyticsService.getEventWiseData(userId);
      });
    },
    getCheckInPatterns: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return AnalyticsService.getCheckInPatterns(userId);
      });
    },
    getPerformanceDistribution: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return AnalyticsService.getPerformanceDistribution(userId);
      });
    },
    getDefaulterDistribution: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return AnalyticsService.getDefaulterDistribution(userId);
      });
    },
    getLeaderboard: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return AnalyticsService.getLeaderboard(userId);
      });
    }
  },

  // ==========================================
  // Settings API
  // ==========================================
  Settings: {
    getSettings: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return SettingsService.getSettings();
      });
    },
    saveSettings: function (sessionToken, payload) {
      return SessionService.withSession(sessionToken, function (userId) {
        return SettingsService.saveSettings(payload);
      });
    },
    clearAttendanceLogs: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return SettingsService.clearAttendanceLogs(userId);
      });
    },
    resetSystem: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return SettingsService.resetSystem(userId);
      });
    }
  },

  // ==========================================
  // Audit API
  // ==========================================
  Audit: {
    getAuditLogs: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        const user = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, 'User ID', userId)[0];
        const role = user ? (user['Role'] || user.role) : null;
        if (role !== CONFIG.ROLES.ADMIN) {
          return Utils.buildResponse(false, 'Unauthorized. Admins only.');
        }
        const logs = AuditService.getAuditLogs();
        return Utils.buildResponse(true, 'Logs retrieved', { logs: logs });
      });
    }
  },

  // ==========================================
  // Department API
  // ==========================================
  Department: {
    getActiveDepartments: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return DepartmentService.getActiveDepartments();
      });
    }
  },

  // ==========================================
  // Dashboard API (Feature-Based Development)
  // ==========================================
  Dashboard: {
    getTotalUsers: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        Logger.log("DASHBOARD_MODULE | STEP 2 - Session validated | User ID: " + userId);
        const userContext = SessionService.getUserContext(sessionToken);
        return DashboardService.getTotalUsersCount(userContext);
      });
    },
    getTotalStudents: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        Logger.log("DASHBOARD_MODULE | STEP 2 - Session validated | User ID: " + userId);
        const userContext = SessionService.getUserContext(sessionToken);
        return DashboardService.getTotalStudentsCount(userContext);
      });
    },
    getTotalEvents: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        Logger.log("DASHBOARD_MODULE | STEP 2 - Session validated | User ID: " + userId);
        const userContext = SessionService.getUserContext(sessionToken);
        return DashboardService.getTotalEventsCount(userContext);
      });
    },
    getActiveEvents: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        Logger.log("DASHBOARD_MODULE | STEP 2 - Session validated | User ID: " + userId);
        const userContext = SessionService.getUserContext(sessionToken);
        return DashboardService.getActiveEventsCount(userContext);
      });
    },
    getUpcomingEvents: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        Logger.log("DASHBOARD_MODULE | STEP 2 - Session validated | User ID: " + userId);
        const userContext = SessionService.getUserContext(sessionToken);
        return DashboardService.getUpcomingEventsCount(userContext);
      });
    },
    getTotalParticipants: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        Logger.log("DASHBOARD_MODULE | STEP 2 - Session validated | User ID: " + userId);
        // Fallback or placeholder for participants list check
        const userContext = SessionService.getUserContext(sessionToken);
        return DashboardService.getTotalCoordinatorsCount(userContext);
      });
    },
    getAttendanceToday: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        Logger.log("DASHBOARD_MODULE | STEP 2 - Session validated | User ID: " + userId);
        return DashboardService.getAttendanceTodayCount(userId);
      });
    },
    getRecentEvents: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        Logger.log("DASHBOARD_MODULE | STEP 2 - Session validated | User ID: " + userId);
        return DashboardService.getRecentActivities();
      });
    }
  },

  // ==========================================
  // CoordinatorTerminal API
  // ==========================================
  CoordinatorTerminal: {
    getContext: function (sessionToken) {
      Logger.log("================================");
      Logger.log("ENTER Controller.getContext()");
      Logger.log("Token: " + sessionToken);
      Logger.log("================================");

      try {
        Logger.log("STEP 1");
        Logger.log("Validating session");

        var response = SessionService.withSession(sessionToken, function (userId) {
          try {
            Logger.log("STEP 2");
            Logger.log("Fetching coordinator");
            const user = UserService.getUserById(userId);
            Logger.log("Coordinator");
            Logger.log(JSON.stringify(user));

            Logger.log("Validating coordinator role and status");
            const validation = CoordinatorService.validateCoordinatorSession(user);
            Logger.log("Validation Result: " + JSON.stringify(validation));

            Logger.log("STEP 3");
            Logger.log("Fetching assigned event");
            const activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
            Logger.log("Assigned event IDs: " + JSON.stringify(activeAssignedIds));

            if (!user) {
              Logger.log("Returning Failure");
              return Utils.buildResponse(false, 'User not found.');
            }

            if (!validation.success) {
              Logger.log("Returning Failure");
              return validation;
            }

            if (activeAssignedIds.length === 0) {
              Logger.log("Returning Failure");
              return Utils.buildResponse(false, 'No active event assignments associated with this account credentials.');
            }

            const targetEvent = EventService.getEventById(activeAssignedIds[0]);
            Logger.log("Event");
            Logger.log(JSON.stringify(targetEvent));

            if (!targetEvent) {
              Logger.log("Returning Failure");
              return Utils.buildResponse(false, 'Assigned event record is missing or deleted.');
            }

            const eventId = targetEvent['Event ID'] || targetEvent.eventId;

            Logger.log("STEP 5");
            Logger.log("Building statistics");
            const counts = AttendanceService.getEventAttendanceCount(eventId);
            const stats = {
              present: counts.present || 0,
              remaining: counts.absent || counts.total - counts.present || 0,
              total: counts.total || 0
            };
            Logger.log("Statistics");
            Logger.log(JSON.stringify(stats));

            Logger.log("STEP 4");
            Logger.log("Fetching attendance");
            const allAttendance = AttendanceService.getAttendanceByEvent(eventId) || [];

            Logger.log("Enriching recent scans");
            const allScans = allAttendance.map(record => {
              const roll = record['Roll Number'] || record.roll_number || '';
              const studentData = StudentService.getStudentByRollNumber(roll) || {};
              return {
                roll: roll,
                name: studentData['Student Name'] || studentData['Full Name'] || studentData['Name'] || 'Unknown Student',
                dept: studentData['Department ID'] || studentData['Department'] || 'N/A',
                time: record['Attendance Time'] || record['Time'] || record['Created At'] || '',
                isDuplicate: false
              };
            });
            Logger.log("Recent Scans");
            Logger.log(JSON.stringify(allScans));

            Logger.log("STEP 6");
            Logger.log("Preparing response");
            var finalResult = Utils.buildResponse(true, 'Terminal context loaded successfully.', {
              user: user,
              event: targetEvent,
              statistics: stats,
              recentScans: allScans
            });

            Logger.log("========== FINAL RESPONSE ==========");
            Logger.log("Type : " + typeof finalResult);
            Logger.log("Is Null : " + (finalResult == null));
            if (finalResult == null) {
              Logger.log("CRITICAL");
              Logger.log("Response became NULL");
              Logger.log("Investigating previous variable");
            } else {
              Logger.log("Success : " + finalResult.success);
              Logger.log("Message : " + finalResult.message);
              Logger.log("Keys : " + JSON.stringify(Object.keys(finalResult)));
              Logger.log("Full Response:");
              Logger.log(JSON.stringify(finalResult));
            }
            Logger.log("====================================");

            Logger.log("Returning Success");
            return finalResult;
          } catch (innerError) {
            Logger.log("Inner callback error: " + innerError);
            Logger.log(innerError.stack);
            throw innerError;
          }
        });

        return response;
      } catch (e) {
        Logger.log("getContext outer error: " + e);
        Logger.log(e.stack);
        throw e;
      }
    },

    processParticipant: function (sessionToken, rollNumber, eventId) {
      return SessionService.withSession(sessionToken, function (userId) {
        let targetEventId = eventId;
        if (!targetEventId) {
          const activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
          if (activeAssignedIds.length === 0) {
            return Utils.buildResponse(false, 'No active event assignments associated with this account credentials.', { state: 'EVENT_NOT_AVAILABLE' });
          }
          targetEventId = activeAssignedIds[0];
        }
        return CoordinatorService.processParticipantForEvent(sessionToken, targetEventId, rollNumber);
      });
    },

    confirmMarkParticipation: function (sessionToken, rollNumber, eventId, additionalData) {
      return SessionService.withSession(sessionToken, function (userId) {
        let targetEventId = eventId;
        if (!targetEventId) {
          const activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
          if (activeAssignedIds.length === 0) {
            return Utils.buildResponse(false, 'No active event assignments associated with this account credentials.', { state: 'EVENT_NOT_AVAILABLE' });
          }
          targetEventId = activeAssignedIds[0];
        }
        return CoordinatorService.confirmMarkParticipation(sessionToken, targetEventId, rollNumber, additionalData);
      });
    },

    spotRegisterParticipant: function (sessionToken, rollNumber, eventId, spotData) {
      return SessionService.withSession(sessionToken, function (userId) {
        let targetEventId = eventId;
        if (!targetEventId) {
          const activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
          if (activeAssignedIds.length === 0) {
            return Utils.buildResponse(false, 'No active event assignments associated with this account credentials.', { state: 'EVENT_NOT_AVAILABLE' });
          }
          targetEventId = activeAssignedIds[0];
        }
        return CoordinatorService.spotRegisterParticipant(sessionToken, targetEventId, rollNumber, spotData);
      });
    },

    markAttendance: function (sessionToken, rollNumber, attendanceMethod) {

      return SessionService.withSession(sessionToken, function (userId) {
        const activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
        if (activeAssignedIds.length === 0) {
          return Utils.buildResponse(false, 'No active event assignments associated with this account credentials.');
        }
        const eventId = activeAssignedIds[0];

        if (!rollNumber) {
          return Utils.buildResponse(false, 'Missing required student registration identifier.');
        }

        const normalizedRoll = rollNumber.trim().toUpperCase();

        // For Open Events: if student not in DB, auto-register them and mark attendance
        var event = EventService.getEventById(eventId);
        var attendanceType = event ? (event.attendance_type || event['Attendance Type'] || event.attendanceType || 'Fixed') : 'Fixed';

        if (String(attendanceType).trim().toLowerCase() === 'open') {
          var existingStudent = StudentService.getStudentByRollNumber(normalizedRoll);
          if (!existingStudent) {
            // Auto-create student record for Open Event spot attendance
            var actionUser = UserService.getUserById(userId);
            var creatorName = actionUser ? (actionUser.username || actionUser.name || 'Coordinator') : 'Coordinator';
            var autoStudentPayload = {};
            autoStudentPayload[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = normalizedRoll;
            autoStudentPayload[CONFIG.COLUMNS.STUDENT_NAME] = 'Spot Guest';
            autoStudentPayload[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = 'OPEN';
            autoStudentPayload[CONFIG.COLUMNS.STUDENT_YEAR] = '1';
            autoStudentPayload[CONFIG.COLUMNS.STUDENT_SECTION] = 'A';
            autoStudentPayload[CONFIG.COLUMNS.STUDENT_STATUS] = CONFIG.STUDENT_STATUS.ACTIVE;
            autoStudentPayload['College'] = 'BVC Engineering College';
            StudentService.createStudent(autoStudentPayload, creatorName);
          }
        }

        const attendanceData = {
          event_id: eventId,
          roll_number: normalizedRoll,
          attendanceMethod: attendanceMethod || 'Barcode',
          status: CONFIG.ATTENDANCE_STATUS.PRESENT
        };

        return AttendanceService.markAttendance(attendanceData, userId);
      });
    },

    /**
     * FAST PATH for Open Events — bypasses student lookup, LockManager, audit, notification.
     * Uses AttendanceService.markOpenEventAttendanceFast → single sheet.appendRow().
     * Target: 0.5–1s end-to-end.
     */
    markAttendanceFast: function(sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function(userId) {
        if (!rollNumber) return Utils.buildResponse(false, 'Missing roll number.');
        var normalizedRoll = rollNumber.trim().toUpperCase();
        var activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
        if (activeAssignedIds.length === 0) {
          return Utils.buildResponse(false, 'No active event assignment.');
        }
        return AttendanceService.markOpenEventAttendanceFast(activeAssignedIds[0], normalizedRoll, userId, 'Barcode');
      });
    },

    registerSpotStudentAndMarkAttendance: function (sessionToken, rollNumber, studentName, departmentId, year, section, collegeName) {
      return SessionService.withSession(sessionToken, function (userId) {
        const activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
        if (activeAssignedIds.length === 0) {
          return Utils.buildResponse(false, 'No active event assignments associated with this account credentials.');
        }
        const eventId = activeAssignedIds[0];

        if (!rollNumber) {
          return Utils.buildResponse(false, 'Missing required student registration identifier.');
        }

        const normalizedRoll = rollNumber.trim().toUpperCase();

        // 1. Check if student already exists in BVC students table or other_college_students table
        var student = StudentService.getStudentByRollNumber(normalizedRoll);
        var targetCollege = (collegeName || '').trim();
        var isBvcStudent = !targetCollege || targetCollege.toLowerCase().includes('bvc') || targetCollege.toLowerCase().includes('bonam venkata');

        if (!student) {
          var actionUser = UserService.getUserById(userId);
          var creatorName = actionUser ? (actionUser.username || actionUser.name) : 'Coordinator';

          if (isBvcStudent) {
            // Save to main 'students' table/sheet for BVC students
            var studentPayload = {};
            studentPayload[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = normalizedRoll;
            studentPayload[CONFIG.COLUMNS.STUDENT_NAME] = (studentName || 'Spot Registered Student').trim();
            studentPayload[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = (departmentId || 'CSE').trim().toUpperCase();
            studentPayload[CONFIG.COLUMNS.STUDENT_YEAR] = year || '1';
            studentPayload[CONFIG.COLUMNS.STUDENT_SECTION] = section || 'A';
            studentPayload[CONFIG.COLUMNS.STUDENT_STATUS] = CONFIG.STUDENT_STATUS.ACTIVE;
            studentPayload["College"] = targetCollege || 'BVC Engineering College';

            var createResp = StudentService.createStudent(studentPayload, creatorName);
            if (!createResp.success) {
              return Utils.buildResponse(false, 'Failed to add student to database: ' + createResp.message);
            }
            student = StudentService.getStudentByRollNumber(normalizedRoll);
          } else {
            // Save to 'other_college_students' table/sheet for other college students
            var otherStudentPayload = {
              id: 'OCS' + Date.now(),
              roll_number: normalizedRoll,
              student_name: (studentName || 'Guest Student').trim(),
              college_name: targetCollege,
              department: (departmentId || '').trim().toUpperCase(),
              year: String(year || '1'),
              section: String(section || 'A'),
              status: 'Active',
              created_by: creatorName,
              created_at: new Date().toISOString()
            };
            try {
              DatabaseService.insertRow(CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS, otherStudentPayload);
            } catch (ocsErr) {
              Logger.log('Warning saving to other_college_students: ' + ocsErr.message);
            }

            // Also create a stub entry in main 'students' table to satisfy strict foreign keys if present
            try {
              var mainStudentStub = {};
              mainStudentStub[CONFIG.COLUMNS.STUDENT_ROLL_NUMBER] = normalizedRoll;
              mainStudentStub[CONFIG.COLUMNS.STUDENT_NAME] = (studentName || 'Guest Student').trim();
              mainStudentStub[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] = (departmentId || 'GUEST').trim().toUpperCase();
              mainStudentStub[CONFIG.COLUMNS.STUDENT_YEAR] = year || '1';
              mainStudentStub[CONFIG.COLUMNS.STUDENT_SECTION] = section || 'G';
              mainStudentStub[CONFIG.COLUMNS.STUDENT_STATUS] = 'Active';
              mainStudentStub["College"] = targetCollege;
              StudentService.createStudent(mainStudentStub, creatorName);
            } catch (stubErr) {
              Logger.log('Stub student creation fallback warning: ' + stubErr.message);
            }

            student = otherStudentPayload;
          }
        }

        // 2. If the event is Fixed type, register them as a participant
        var event = EventService.getEventById(eventId);
        if (event) {
          var attendanceType = event.attendance_type || event.attendanceType || 'Fixed';
          if (attendanceType === 'Fixed') {
            // Check if already registered as participant
            var parts = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Event ID', eventId) || [];
            var isPart = parts.find(function (p) {
              return String(p['Roll Number'] || p.roll_number || p.rollNumber).trim().toUpperCase() === normalizedRoll;
            });
            if (!isPart) {
              var participantData = {};
              participantData['Participant ID'] = 'PAR' + Date.now();
              participantData['Event ID'] = eventId;
              participantData['Roll Number'] = normalizedRoll;
              participantData['Registration Status'] = 'Confirmed';
              participantData['Status'] = 'Active';
              participantData['Created At'] = Utils.getCurrentTimestamp();
              DatabaseService.insertRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, participantData);
            }
          }
        }

        // 3. Mark attendance
        var attendanceData = {
          event_id: eventId,
          roll_number: normalizedRoll,
          attendanceMethod: 'Manual',
          status: CONFIG.ATTENDANCE_STATUS.PRESENT
        };

        return AttendanceService.markAttendance(attendanceData, userId);
      });
    },

    getLiveStatistics: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        const activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
        if (activeAssignedIds.length === 0) {
          return Utils.buildResponse(false, 'No active event assignments.');
        }
        const eventId = activeAssignedIds[0];
        const counts = AttendanceService.getEventAttendanceCount(eventId);
        return Utils.buildResponse(true, 'Live statistics compiled.', {
          present: counts.present || 0,
          remaining: counts.absent || counts.total - counts.present || 0,
          total: counts.total || 0
        });
      });
    },

    getRecentScansStream: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        const activeAssignedIds = CoordinatorService.getAssignedEventIds(userId) || [];
        if (activeAssignedIds.length === 0) {
          return Utils.buildResponse(false, 'No active event assignments.');
        }
        const eventId = activeAssignedIds[0];
        const allAttendance = AttendanceService.getAttendanceByEvent(eventId) || [];
        const truncatedList = allAttendance.slice(0, 10).map(record => {
          const student = StudentService.getStudentByRollNumber(record['Roll Number'] || record.roll_number) || {};
          return {
            roll: record['Roll Number'] || record.roll_number,
            name: student['Student Name'] || 'Unknown Student',
            time: record['Time'] || ''
          };
        });
        return Utils.buildResponse(true, 'Recent scans stream populated.', truncatedList);
      });
    },

    getStudentProfile: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (userId) {
        if (!rollNumber) return Utils.buildResponse(false, 'Missing roll number parameter.');
        const normalizedRoll = rollNumber.trim().toUpperCase();
        const student = StudentService.getStudentByRollNumber(normalizedRoll);
        if (!student) return Utils.buildResponse(false, 'Student not found in database.');
        return Utils.buildResponse(true, 'Student verified successfully.', {
          student_name: student['Student Name'] || student.student_name || 'Unknown',
          name: student['Student Name'] || student.student_name || 'Unknown',
          roll: normalizedRoll,
          roll_number: normalizedRoll,
          department_id: student['Department ID'] || student.department_id || student.department || 'Unknown',
          dept: student['Department ID'] || student.department_id || student.department || 'Unknown',
          branch: student['Branch'] || student.department || student['Department ID'] || 'Unknown',
          year: student['Year'] || student.year || 'Unknown',
          college: student['College'] || student.college_name || 'BVC Engineering College',
          email_address: student['Email Address'] || student.email_address || '',
          phone_number: student['Phone Number'] || student.phone_number || '',
          gender: student['Gender'] || student.gender || '',
          city: student['City'] || student.city || '',
          state: student['State'] || student.state || '',
          emergency_contact: student['Emergency Contact'] || student.emergency_contact || '',
          accommodation_needed: student['Accommodation Needed'] || student.accommodation_needed || 'No',
          food_preference: student['Food Preference'] || student.food_preference || '',
          id_proof_number: student['ID Proof Number'] || student.id_proof_number || ''
        });
      });
    },

    getStudentDetailsByRoll: function (rollNumber) {
      if (!rollNumber) return Utils.buildResponse(false, 'Missing roll number parameter.');
      const normalizedRoll = String(rollNumber).trim().toUpperCase();
      const student = StudentService.getStudentByRollNumber(normalizedRoll);
      if (!student) return Utils.buildResponse(false, 'Student not found in database.');
      return Utils.buildResponse(true, 'Student details retrieved.', {
        student_name: student['Student Name'] || student.student_name || 'Unknown',
        name: student['Student Name'] || student.student_name || 'Unknown',
        roll: normalizedRoll,
        roll_number: normalizedRoll,
        department_id: student['Department ID'] || student.department_id || student.department || 'Unknown',
        dept: student['Department ID'] || student.department_id || student.department || 'Unknown',
        branch: student['Branch'] || student.department || student['Department ID'] || 'Unknown',
        year: student['Year'] || student.year || 'Unknown',
        college: student['College'] || student.college_name || 'BVC Engineering College',
        email_address: student['Email Address'] || student.email_address || '',
        phone_number: student['Phone Number'] || student.phone_number || '',
        gender: student['Gender'] || student.gender || '',
        city: student['City'] || student.city || '',
        state: student['State'] || student.state || '',
        emergency_contact: student['Emergency Contact'] || student.emergency_contact || '',
        accommodation_needed: student['Accommodation Needed'] || student.accommodation_needed || 'No',
        food_preference: student['Food Preference'] || student.food_preference || '',
        id_proof_number: student['ID Proof Number'] || student.id_proof_number || ''
      });
    },

    terminateSession: function (sessionToken) {
      return AuthService.logout(sessionToken);
    },

    validateActiveSession: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        const user = UserService.getUserById(userId);
        if (!user) return Utils.buildResponse(false, 'User not found.');
        return CoordinatorService.validateCoordinatorSession(user);
      });
    }
  },

  // ==========================================
  // Report Controller
  // ==========================================
  Report: {
    getDashboardSummary: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDashboardSummary(userId);
      });
    },
    getCrossDepartmentAttendance: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getCrossDepartmentAttendance(userId);
      });
    },
    getReportsDashboardSummary: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getReportsDashboardSummary(userId);
      });
    },
    getEventReport: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getEventReport(userId, filters || {});
      });
    },
    getStudentReport: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getStudentReport(userId, rollNumber);
      });
    },
    getDepartmentReport: function (sessionToken, department) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDepartmentReport(userId, department);
      });
    },
    getDepartmentComparison: function (sessionToken) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDepartmentComparison(userId);
      });
    },
    getCoordinatorReport: function (sessionToken, coordinatorId) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getCoordinatorReport(coordinatorId || userId, userId);
      });
    },
    getCoordinatorPerformance: function (sessionToken, coordinatorId) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getCoordinatorReport(coordinatorId || userId, userId);
      });
    },
    getDateRangeReport: function (sessionToken, fromDate, toDate) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getDateRangeReport(userId, fromDate, toDate);
      });
    },
    getMonthlyReport: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getMonthlyReport(userId, filters || {});
      });
    },
    getEventTrendReport: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getEventTrendReport(userId, filters || {});
      });
    },
    getYearWiseReport: function (sessionToken, year) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getYearWiseReport(userId, year);
      });
    },
    getAttendanceDefaulters: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getAttendanceDefaulters(userId, filters || {});
      });
    },
    getTopParticipants: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getTopParticipants(userId, filters || {});
      });
    },
    getAbsentStudents: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getAbsentStudents(userId, filters || {});
      });
    },
    getCancelledEvents: function (sessionToken, filters) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getCancelledEvents(userId, filters || {});
      });
    },
    getStudentEventHistory: function (sessionToken, rollNumber) {
      return SessionService.withSession(sessionToken, function (userId) {
        return ReportService.getStudentEventHistory(userId, rollNumber);
      });
    }
  },

  // ==========================================
  // Public Event Registration Controller
  // ==========================================
  EventRegistration: {
    getEventDetailsForRegistration: function (eventId) {
      try {
        if (!eventId) return Utils.buildResponse(false, 'Missing Event ID.');
        const event = EventService.getEventById(eventId);
        if (!event) return Utils.buildResponse(false, 'Event not found.');
        
        const status = event[CONFIG.COLUMNS.EVENT_STATUS] || event.status;
        if (status === 'Cancelled' || status === 'Completed') {
          return Utils.buildResponse(false, 'This event is no longer active.');
        }

        const enableReg = event[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION];
        if (enableReg !== 'Yes') {
          return Utils.buildResponse(false, 'Registration is not enabled for this event.');
        }

        return Utils.buildResponse(true, 'Event details retrieved.', {
          data: {
            eventId: event[CONFIG.COLUMNS.EVENT_ID],
            eventName: event[CONFIG.COLUMNS.EVENT_NAME],
            description: event[CONFIG.COLUMNS.DESCRIPTION],
            venue: event[CONFIG.COLUMNS.VENUE],
            startDate: event[CONFIG.COLUMNS.START_DATE],
            endDate: event[CONFIG.COLUMNS.END_DATE],
            startTime: event[CONFIG.COLUMNS.START_TIME],
            endTime: event[CONFIG.COLUMNS.END_TIME],
            departments: event[CONFIG.COLUMNS.DEPARTMENTS],
            years: event[CONFIG.COLUMNS.YEARS],
            capacity: event[CONFIG.COLUMNS.CAPACITY],
            maxSeats: event[CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS],
            allowSpot: event[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION],
            fields: event[CONFIG.COLUMNS.EVENT_REGISTRATION_FIELDS],
            terms: event[CONFIG.COLUMNS.EVENT_TERMS_AND_CONDITIONS],
            registeredCount: event['Registered Count'] || event.registered_count || 0
          }
        });
      } catch (e) {
        Logger.log('Controller.EventRegistration.getEventDetailsForRegistration error: ' + e.message);
        return Utils.buildResponse(false, 'Failed to fetch event registration details.');
      }
    },

    getStudentForRegistration: function (eventId, rollNumber) {
      try {
        if (!eventId || !rollNumber) return Utils.buildResponse(false, 'Missing required fields.');
        const normalizedRoll = rollNumber.trim().toUpperCase();

        const student = StudentService.getStudentByRollNumber(normalizedRoll);
        if (!student) {
          const event = EventService.getEventById(eventId);
          const allowSpot = event ? event[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION] : 'No';
          if (allowSpot === 'Yes') {
            return Utils.buildResponse(true, 'Student not found but spot registration is allowed.', {
              data: {
                found: false,
                allowSpot: true
              }
            });
          }
          return Utils.buildResponse(false, 'Roll number not found in student database.');
        }

        const event = EventService.getEventById(eventId);
        if (event) {
          const allowedDepts = event[CONFIG.COLUMNS.DEPARTMENTS];
          if (allowedDepts) {
            const deptsArr = allowedDepts.split(',').map(d => d.trim().toUpperCase());
            const studentDept = String(student[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID] || '').trim().toUpperCase();
            if (deptsArr.length > 0 && !deptsArr.includes(studentDept)) {
              return Utils.buildResponse(false, 'Department mismatch: Your department is not eligible for this event.');
            }
          }
          const allowedYears = event[CONFIG.COLUMNS.YEARS];
          if (allowedYears) {
            const yearsArr = allowedYears.split(',').map(y => y.trim());
            const studentYear = String(student[CONFIG.COLUMNS.STUDENT_YEAR] || '').trim();
            if (yearsArr.length > 0 && !yearsArr.includes(studentYear)) {
              return Utils.buildResponse(false, 'Year mismatch: Your academic year is not eligible for this event.');
            }
          }
        }

        return Utils.buildResponse(true, 'Student found.', {
          data: {
            found: true,
            name: student[CONFIG.COLUMNS.STUDENT_NAME],
            dept: student[CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID],
            year: student[CONFIG.COLUMNS.STUDENT_YEAR],
            section: student[CONFIG.COLUMNS.STUDENT_SECTION]
          }
        });
      } catch (e) {
        Logger.log('Controller.EventRegistration.getStudentForRegistration error: ' + e.message);
        return Utils.buildResponse(false, 'Failed to fetch student details.');
      }
    },

    submitEventRegistration: function (payload) {
      try {
        if (!payload || !payload.eventId || !payload.rollNumber) {
          return Utils.buildResponse(false, 'Missing required fields.');
        }

        const eventId = payload.eventId;
        const rollNumber = payload.rollNumber.trim().toUpperCase();

        const event = EventService.getEventById(eventId);
        if (!event) return Utils.buildResponse(false, 'Event not found.');

        const enableReg = event[CONFIG.COLUMNS.EVENT_ENABLE_REGISTRATION];
        if (enableReg !== 'Yes') {
          return Utils.buildResponse(false, 'Registration is not enabled for this event.');
        }

        const openTimeStr = event[CONFIG.COLUMNS.EVENT_REGISTRATION_OPEN];
        const closeTimeStr = event[CONFIG.COLUMNS.EVENT_REGISTRATION_CLOSE];
        const now = new Date();

        if (openTimeStr) {
          const openTime = new Date(openTimeStr);
          if (!isNaN(openTime.getTime()) && now < openTime) {
            return Utils.buildResponse(false, 'Registration has not opened yet. It opens on ' + openTimeStr);
          }
        }

        if (closeTimeStr) {
          const closeTime = new Date(closeTimeStr);
          if (!isNaN(closeTime.getTime()) && now > closeTime) {
            return Utils.buildResponse(false, 'Registration is closed.');
          }
        }

        const maxSeats = parseInt(event[CONFIG.COLUMNS.EVENT_MAXIMUM_SEATS], 10);
        if (!isNaN(maxSeats) && maxSeats > 0) {
          const participants = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Event ID', eventId) || [];
          const activeParticipants = participants.filter(p => !p['Deletion Flag'] && p['Registration Status'] === 'Confirmed');
          if (activeParticipants.length >= maxSeats) {
            return Utils.buildResponse(false, 'Registration is full. Maximum seats reached.');
          }
        }

        const existingParts = DatabaseService.findByColumn(CONFIG.SHEETS.EVENT_PARTICIPANTS, 'Event ID', eventId) || [];
        const isRegistered = existingParts.some(p => {
          return !p['Deletion Flag'] && 
                 String(p['Roll Number'] || '').trim().toUpperCase() === rollNumber;
        });
        if (isRegistered) {
          return Utils.buildResponse(false, 'You have already registered for this event.');
        }

        let student = StudentService.getStudentByRollNumber(rollNumber);
        const targetCollege = (payload.collegeName || '').trim();
        const isBvcStudent = !targetCollege || targetCollege.toLowerCase().includes('bvc') || targetCollege.toLowerCase().includes('bonam venkata');

        if (!student) {
          const allowSpot = event[CONFIG.COLUMNS.EVENT_ALLOW_SPOT_REGISTRATION];
          if (allowSpot !== 'Yes') {
            return Utils.buildResponse(false, 'Roll number not found in database. Spot registration is disabled.');
          }

          if (isBvcStudent) {
            // Save to main 'students' database table
            const studentPayload = {
              [CONFIG.COLUMNS.STUDENT_ROLL_NUMBER]: rollNumber,
              [CONFIG.COLUMNS.STUDENT_NAME]: (payload.studentName || 'Spot Guest Student').trim(),
              [CONFIG.COLUMNS.STUDENT_DEPARTMENT_ID]: (payload.department || 'CSE').trim().toUpperCase(),
              [CONFIG.COLUMNS.STUDENT_YEAR]: payload.year || '1',
              [CONFIG.COLUMNS.STUDENT_SECTION]: payload.section || 'A',
              [CONFIG.COLUMNS.STUDENT_STATUS]: CONFIG.STUDENT_STATUS.ACTIVE,
              "College": targetCollege || 'BVC Engineering College'
            };

            const createResp = StudentService.createStudent(studentPayload, 'Self-Registration');
            if (!createResp.success) {
              return Utils.buildResponse(false, 'Failed to create student profile: ' + createResp.message);
            }
            student = studentPayload;
          } else {
            // Save to 'other_college_students' database table
            const otherStudentPayload = {
              id: 'OCS' + Date.now(),
              roll_number: rollNumber,
              student_name: (payload.studentName || 'Guest Student').trim(),
              college_name: targetCollege,
              department: (payload.department || '').trim().toUpperCase(),
              year: String(payload.year || '1'),
              section: String(payload.section || 'A'),
              email_address: (payload.email || '').trim(),
              phone_number: (payload.phone || '').trim(),
              status: 'Active',
              created_by: 'Self-Registration',
              created_at: new Date().toISOString()
            };
            DatabaseService.insertRow(CONFIG.SHEETS.OTHER_COLLEGE_STUDENTS, otherStudentPayload);
            student = otherStudentPayload;
          }
        }

        const participantId = IdService.generateParticipantId();
        const customDataJson = payload.customResponses ? JSON.stringify(payload.customResponses) : '';
        const nowIso = new Date().toISOString();

        const participantData = {
          'Participant ID': participantId,
          'Event ID': eventId,
          'Roll Number': rollNumber,
          'Registration Type': 'Self-Registered',
          'Registration Status': 'Confirmed',
          'Attendance Status': 'Absent',
          'Approval Status': 'Approved',
          'Created At': nowIso,
          'Updated At': nowIso,
          'Created By': 'Self-Registration',
          'Deletion Flag': false,
          'Custom Fields Data': customDataJson
        };

        const success = DatabaseService.insertRow(CONFIG.SHEETS.EVENT_PARTICIPANTS, participantData);
        if (success) {
          const currentCount = parseInt(event['Registered Count'] || event.registered_count || 0, 10);
          DatabaseService.updateRow(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.EVENT_ID, eventId, {
            'Registered Count': currentCount + 1
          });

          try {
            AuditService.logAction(
              'Student',
              'EventRegistration',
              'SUBMIT_REGISTRATION',
              eventId,
              'Participant',
              'Student self-registered for event',
              '',
              'SUCCESS',
              rollNumber
            );
          } catch (auditErr) {
            Logger.log('Audit log error: ' + auditErr.message);
          }

          return Utils.buildResponse(true, 'Successfully registered for ' + event[CONFIG.COLUMNS.EVENT_NAME] + '!', {
            data: {
              participantId: participantId
            }
          });
        }

        return Utils.buildResponse(false, 'Failed to register. Please try again.');
      } catch (e) {
        Logger.log('Controller.EventRegistration.submitEventRegistration error: ' + e.message);
        return Utils.buildResponse(false, 'Failed to submit registration: ' + e.message);
      }
    }
  },

  // ==========================================
  // Custom Export Builder Controller
  // ==========================================
  Export: {
    getExportTemplates: function(sessionToken) {
      return SessionService.withSession(sessionToken, function(userId) {
        return ExportService.getTemplates(userId);
      });
    },

    saveExportTemplate: function(sessionToken, data) {
      return SessionService.withSession(sessionToken, function(userId) {
        return ExportService.saveTemplate(userId, data);
      });
    },

    deleteExportTemplate: function(sessionToken, templateId) {
      return SessionService.withSession(sessionToken, function(userId) {
        return ExportService.deleteTemplate(userId, templateId);
      });
    },

    processCustomExport: function(sessionToken, config) {
      return SessionService.withSession(sessionToken, function(userId) {
        const userContext = SessionService.getUserContext(sessionToken);
        return ExportService.processCustomExport(userId, config, userContext);
      });
    }
  },

  // ==========================================
  // Enterprise platform upgrades Controller
  // ==========================================
  Enterprise: {
    getEventTemplates: function(sessionToken) {
      return SessionService.withSession(sessionToken, function() {
        return EnterpriseEventService.getEventTemplates();
      });
    },

    saveEventTemplate: function(sessionToken, name, config) {
      return SessionService.withSession(sessionToken, function() {
        return EnterpriseEventService.saveEventTemplate(name, config);
      });
    },

    cloneEvent: function(sessionToken, eventId, newName, newDates, newAdminId) {
      return SessionService.withSession(sessionToken, function(userId) {
        return EnterpriseEventService.cloneEvent(eventId, newName, newDates, newAdminId, userId);
      });
    },

    submitForApproval: function(sessionToken, eventId) {
      return SessionService.withSession(sessionToken, function(userId) {
        return EnterpriseEventService.submitForApproval(eventId, userId);
      });
    },

    approveEvent: function(sessionToken, eventId) {
      return SessionService.withSession(sessionToken, function(userId) {
        return EnterpriseEventService.approveEvent(eventId, userId);
      });
    },

    submitAttendanceCorrection: function(sessionToken, attendanceId, requestedStatus, reason) {
      return SessionService.withSession(sessionToken, function(userId) {
        return AttendanceCorrectionService.submitRequest(attendanceId, requestedStatus, reason, userId);
      });
    },

    getPendingCorrections: function(sessionToken) {
      return SessionService.withSession(sessionToken, function(userId) {
        const userContext = SessionService.getUserContext(sessionToken);
        return AttendanceCorrectionService.getPendingRequests(userContext);
      });
    },

    approveCorrection: function(sessionToken, requestId) {
      return SessionService.withSession(sessionToken, function(userId) {
        return AttendanceCorrectionService.approveRequest(requestId, userId);
      });
    },

    rejectCorrection: function(sessionToken, requestId) {
      return SessionService.withSession(sessionToken, function(userId) {
        return AttendanceCorrectionService.rejectRequest(requestId, userId);
      });
    }
  },

  // ==========================================
  // Test Center Health Verification Controller
  // ==========================================
  TestCenter: {
    runSystemHealthCheck: function(sessionToken) {
      return SessionService.withSession(sessionToken, function(userId) {
        // Enforce Super Admin or Developer access only
        const userContext = SessionService.getUserContext(sessionToken);
        const role = String(userContext.role || '').toUpperCase().trim();
        if (role !== 'SUPER ADMIN' && role !== 'SUPER_ADMIN' && role !== 'SUPERADMIN' && role !== 'DEVELOPER') {
          return Utils.buildResponse(false, "Access Denied: Only Super Admins can run system diagnostics.");
        }
        return SystemHealthChecker.runAllChecks(userId);
      });
    },

    getTestHistory: function(sessionToken) {
      return SessionService.withSession(sessionToken, function() {
        return SystemHealthChecker.getHistory();
      });
    }
  },

  // ==========================================
  // Department Controller
  // ==========================================
  Department: {
    getAllDepartments: function(sessionToken) {
      return SessionService.withSession(sessionToken, function() {
        return DepartmentService.getAllDepartments();
      });
    },
    createDepartment: function(sessionToken, departmentData) {
      return SessionService.withSession(sessionToken, function(userId) {
        return DepartmentService.createDepartment(departmentData, userId);
      });
    },
    updateDepartment: function(sessionToken, departmentId, updates) {
      return SessionService.withSession(sessionToken, function(userId) {
        return DepartmentService.updateDepartment(departmentId, updates, userId);
      });
    },
    deleteDepartment: function(sessionToken, departmentId) {
      return SessionService.withSession(sessionToken, function() {
        return DepartmentService.deleteDepartment(departmentId);
      });
    }
  },

  Seed: {
    seed100CollegeStudents: function(sessionToken) {
      return SessionService.withSession(sessionToken, function() {
        if (typeof seed100CollegeStudents === 'function') {
          return seed100CollegeStudents();
        }
        return Utils.buildResponse(false, "Seed function not available.");
      });
    }
  }

};
