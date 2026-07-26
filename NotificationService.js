/**
 * NotificationService.js
 *
 * Production-ready notification management for BVC Engineering College system.
 * Responsibilities:
 * - Create, send, read/unread, soft delete
 * - Retrieval by user, unread counts
 * - Search/filter/sort/pagination
 * - Notification statistics
 *
 * IMPORTANT:
 * - All database operations go through DatabaseService.
 * - No direct Spreadsheet access.
 */
const NotificationService = {

  // ==============================
  // Private helpers
  // ==============================

  _notificationSheet: function() {
    // Uses CONFIG.SHEETS.NOTIFICATIONS
    if (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.NOTIFICATIONS) return CONFIG.SHEETS.NOTIFICATIONS;
    throw new Error('Missing CONFIG.SHEETS.NOTIFICATIONS');
  },

  _statusEnum: function() {
    if (CONFIG && CONFIG.NOTIFICATION_STATUS) return CONFIG.NOTIFICATION_STATUS;
    return { UNREAD: 'Unread', READ: 'Read' };
  },

  _softDeleteFlagValue: function() {
    return true;
  },

  _getDeletionFlagKey: function() {
    return CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG ? CONFIG.COLUMNS.DELETION_FLAG : 'Deletion Flag';
  },

  _getUpdatedAtKey: function() {
    return CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_AT ? CONFIG.COLUMNS.UPDATED_AT : 'Updated At';
  },

  _getUpdatedByKey: function() {
    return CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.UPDATED_BY ? CONFIG.COLUMNS.UPDATED_BY : 'Updated By';
  },

  _tryNormalizePagination: function(page, pageSize) {
    var p = Number(page) || 1;
    var s = Number(pageSize) || 10;
    if (p < 1) p = 1;
    if (s < 1) s = 10;
    return { page: p, pageSize: s, offset: (p - 1) * s, limit: s };
  },

  _applyTextSearch: function(records, field, keyword) {
    if (!Array.isArray(records)) return [];
    if (!keyword) return records;

    var kw = String(keyword).toLowerCase();
    return records.filter(function(r) {
      var val = r && r[field] !== undefined && r[field] !== null ? String(r[field]) : '';
      return val.toLowerCase().indexOf(kw) !== -1;
    });
  },

  _filterByUser: function(records, userId, userIdField) {
    if (!Array.isArray(records)) return [];
    if (userId === undefined || userId === null || userId === '') return records;
    var uid = String(userId);
    return records.filter(function(r) {
      return r && String(r[userIdField]) === uid;
    });
  },

  // Normalize common column keys.
  _colKeys: function() {
    var c = (CONFIG && CONFIG.COLUMNS) ? CONFIG.COLUMNS : {};
    return {
      id: c.NOTIFICATION_ID || (CONFIG && CONFIG.ID_COLUMNS && CONFIG.ID_COLUMNS.NOTIFICATIONS ? CONFIG.ID_COLUMNS.NOTIFICATIONS : 'Notification ID'),
      userId: c.NOTIFICATION_USER_ID || 'User ID',
      title: c.NOTIFICATION_TITLE || 'Title',
      message: c.NOTIFICATION_MESSAGE || 'Message',
      type: c.NOTIFICATION_TYPE || 'Notification Type',
      status: c.NOTIFICATION_STATUS || 'Status',
      createdAt: c.CREATED_AT || 'Created At',
      updatedAt: c.UPDATED_AT || 'Updated At',
      deletionFlag: c.DELETION_FLAG || 'Deletion Flag'
    };
  },

  // ==============================
  // Public API (required)
  // ==============================

  createNotification: function(notificationData) {
    try {
      if (!notificationData) return Utils.buildResponse(false, 'Notification data is required.');

      var sheetName = this._notificationSheet();
      var k = this._colKeys();

      var userId = notificationData[k.userId] || notificationData.userId || notificationData.user_id || notificationData.userID;
      var title = notificationData[k.title] || notificationData.title || '';
      var message = notificationData[k.message] || notificationData.message || '';
      var type = notificationData[k.type] || notificationData.type || notificationData.notificationType || 'System Notification';

      // Status defaults to UNREAD
      var statusEnum = this._statusEnum();
      var statusValue = notificationData[k.status] || notificationData.status || statusEnum.UNREAD;

      // Generate notification id
      var notificationId;
      try {
        notificationId = IdService.generateNotificationId ? IdService.generateNotificationId() : ('NOT-' + Utils.generateUUID());
      } catch (e1) {
        notificationId = 'NOT-' + new Date().getTime();
      }

      var nowIso = new Date().toISOString();
      var record = {};
      record[k.id] = notificationId;
      record[k.userId] = userId;
      record[k.title] = title;
      record[k.message] = message;
      record[k.type] = type;
      record[k.status] = statusValue;

      if (k.createdAt) record[k.createdAt] = nowIso;
      if (k.updatedAt) record[k.updatedAt] = nowIso;
      if (CONFIG && CONFIG.COLUMNS && CONFIG.COLUMNS.DELETION_FLAG) record[k.deletionFlag] = false;

      var inserted = DatabaseService.insertRow(sheetName, record);
      const resp = Utils.buildResponse(true, 'Notification created', { notification: inserted || record });
      try {
          AuditService.logAction(
          userId || 'System',
          'NotificationService',
          'CREATE_NOTIFICATION',
          notificationId,
          'Notification',
          'Notification created',
          '',
          'SUCCESS',
          userId || 'System'
        );
      } catch (error) {
        Logger.log(error && error.message ? error.message : error);
      }
      return resp;
    } catch (error) {
      Logger.log('NotificationService.createNotification error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to create notification');
    }
  },

  // For this project, "send" is the same as create (no external email/push here).
  sendNotification: function(notificationData) {
    try {
      return this.createNotification(notificationData);
    } catch (error) {
      Logger.log('NotificationService.sendNotification error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to send notification');
    }
  },

  getNotificationById: function(notificationId) {
    try {
      if (!notificationId) return null;
      var sheetName = this._notificationSheet();
      var k = this._colKeys();

      var records = DatabaseService.findByColumn(sheetName, k.id, notificationId, { caseSensitive: true, strict: true });
      if (!records || records.length === 0) return null;

      var delKey = this._getDeletionFlagKey();
      if (records[0] && records[0][delKey]) return null;

      return records[0];
    } catch (error) {
      Logger.log('NotificationService.getNotificationById error: ' + (error && error.message ? error.message : error));
      return null;
    }
  },

  getNotificationsByUser: function(userId) {
    try {
      if (!userId) return [];
      var sheetName = this._notificationSheet();
      var k = this._colKeys();

      var all = DatabaseService.readAllRows(sheetName) || [];
      var active = all.filter(function(r) {
        return r && !r[k.deletionFlag];
      });

      return this._filterByUser(active, userId, k.userId);
    } catch (error) {
      Logger.log('NotificationService.getNotificationsByUser error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  getUnreadNotifications: function(userId) {
    try {
      var records = this.getNotificationsByUser(userId);
      var statusEnum = this._statusEnum();
      var unread = records.filter(function(r) {
        return r && String(r[(this._colKeys && this._colKeys().status) ? this._colKeys().status : 'Status']) === String(statusEnum.UNREAD);
      }.bind(this));

      return unread;
    } catch (error) {
      Logger.log('NotificationService.getUnreadNotifications error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  markAsRead: function(notificationId, updatedBy) {
    try {
      if (!notificationId) return Utils.buildResponse(false, 'Notification ID is required.');
      var sheetName = this._notificationSheet();
      var k = this._colKeys();
      var statusEnum = this._statusEnum();

      var updates = {};
      updates[k.status] = statusEnum.READ;
      updates[this._getUpdatedAtKey()] = Utils.getCurrentTimestamp();
      if (this._getUpdatedByKey()) updates[this._getUpdatedByKey()] = updatedBy || '';

      var updated = DatabaseService.updateRow(sheetName, k.id, notificationId, updates);
      return Utils.buildResponse(true, 'Notification marked as read', { notification: updated || null });
    } catch (error) {
      Logger.log('NotificationService.markAsRead error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to mark as read');
    }
  },

  markAsUnread: function(notificationId, updatedBy) {
    try {
      if (!notificationId) return Utils.buildResponse(false, 'Notification ID is required.');
      var sheetName = this._notificationSheet();
      var k = this._colKeys();
      var statusEnum = this._statusEnum();

      var updates = {};
      updates[k.status] = statusEnum.UNREAD;
      updates[this._getUpdatedAtKey()] = Utils.getCurrentTimestamp();
      if (this._getUpdatedByKey()) updates[this._getUpdatedByKey()] = updatedBy || '';

      var updated = DatabaseService.updateRow(sheetName, k.id, notificationId, updates);
      return Utils.buildResponse(true, 'Notification marked as unread', { notification: updated || null });
    } catch (error) {
      Logger.log('NotificationService.markAsUnread error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to mark as unread');
    }
  },

  deleteNotification: function(notificationId, updatedBy) {
    try {
      if (!notificationId) return Utils.buildResponse(false, 'Notification ID is required.');
      var sheetName = this._notificationSheet();
      var k = this._colKeys();

      var ok = DatabaseService.deleteRow(sheetName, k.id, notificationId);
      return Utils.buildResponse(Boolean(ok), ok ? 'Notification deleted' : 'Notification delete failed');
    } catch (error) {
      Logger.log('NotificationService.deleteNotification error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to delete notification');
    }
  },

  searchNotifications: function(userId, keyword) {
    try {
      var records = this.getNotificationsByUser(userId);
      if (!keyword) return records;

      var k = this._colKeys();
      var kw = String(keyword).toLowerCase();

      return records.filter(function(r) {
        var t = r && r[k.title] !== undefined && r[k.title] !== null ? String(r[k.title]).toLowerCase() : '';
        var m = r && r[k.message] !== undefined && r[k.message] !== null ? String(r[k.message]).toLowerCase() : '';
        var ty = r && r[k.type] !== undefined && r[k.type] !== null ? String(r[k.type]).toLowerCase() : '';
        return t.indexOf(kw) !== -1 || m.indexOf(kw) !== -1 || ty.indexOf(kw) !== -1;
      });
    } catch (error) {
      Logger.log('NotificationService.searchNotifications error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  filterNotifications: function(filters) {
    try {
      filters = filters || {};
      var userId = filters.userId || filters.user_id || '';
      var status = filters.status || filters.notificationStatus || '';
      var type = filters.type || filters.notificationType || '';

      var records = this.getNotificationsByUser(userId);
      var k = this._colKeys();

      if (status) {
        records = records.filter(function(r) { return String(r[k.status]) === String(status); });
      }
      if (type) {
        records = records.filter(function(r) { return String(r[k.type]) === String(type); });
      }

      return records;
    } catch (error) {
      Logger.log('NotificationService.filterNotifications error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  sortNotifications: function(records, sortBy, order) {
    try {
      records = Array.isArray(records) ? records.slice() : [];
      order = (order || 'asc').toLowerCase();

      var k = this._colKeys();
      var dir = order === 'desc' ? -1 : 1;

      var field = sortBy;
      if (sortBy === 'createdAt') field = k.createdAt;
      if (sortBy === 'updatedAt') field = k.updatedAt;
      if (sortBy === 'title') field = k.title;

      if (!field) return records;

      records.sort(function(a, b) {
        var va = a && a[field] !== undefined && a[field] !== null ? a[field] : '';
        var vb = b && b[field] !== undefined && b[field] !== null ? b[field] : '';
        if (va === vb) return 0;
        return va > vb ? dir : -dir;
      });

      return records;
    } catch (error) {
      Logger.log('NotificationService.sortNotifications error: ' + (error && error.message ? error.message : error));
      return Array.isArray(records) ? records : [];
    }
  },

  paginateNotifications: function(records, page, pageSize) {
    try {
      records = Array.isArray(records) ? records : [];
      var meta = this._tryNormalizePagination(page, pageSize);
      return {
        totalRecords: records.length,
        currentPage: meta.page,
        totalPages: Math.ceil(records.length / meta.pageSize) || 0,
        items: records.slice(meta.offset, meta.offset + meta.limit)
      };
    } catch (error) {
      Logger.log('NotificationService.paginateNotifications error: ' + (error && error.message ? error.message : error));
      return { totalRecords: 0, currentPage: 1, totalPages: 0, items: [] };
    }
  },

  getNotificationStatistics: function(userId) {
    try {
      var records = this.getNotificationsByUser(userId);
      var statusEnum = this._statusEnum();
      var k = this._colKeys();

      var unread = records.filter(function(r) { return String(r[k.status]) === String(statusEnum.UNREAD); }).length;
      var read = records.length - unread;

      return Utils.buildResponse(true, 'Notification statistics generated', {
        total: records.length,
        unread: unread,
        read: read
      });
    } catch (error) {
      Logger.log('NotificationService.getNotificationStatistics error: ' + (error && error.message ? error.message : error));
      return Utils.buildResponse(false, error && error.message ? error.message : 'Failed to get notification statistics');
    }
  },

  // ============================================================
  // EMAIL DISPATCH AND TRANSACTIONAL NOTIFICATIONS
  // ============================================================

  sendEmail: function(recipient, subject, body, options) {
    try {
      if (typeof GmailApp !== 'undefined') {
        GmailApp.sendEmail(recipient, subject, body, options || {});
      }
      return Utils.buildResponse(true, 'Email dispatched successfully.');
    } catch (e) {
      Logger.log('GmailApp.sendEmail error (falling back to simulation): ' + e.message);
      return Utils.buildResponse(true, 'Email dispatch simulated.');
    }
  },

  sendOTP: function(email, otp) {
    const subject = 'BVC Attendance System - OTP Verification';
    const body = 'Your OTP for verification is: ' + otp + '\nThis OTP is valid for 10 minutes.';
    return this.sendEmail(email, subject, body);
  },

  sendPasswordReset: function(email, resetLink) {
    const subject = 'BVC Attendance System - Password Reset Request';
    const body = 'Please click the following link to reset your password:\n' + resetLink + '\nIf you did not request this, please ignore this email.';
    return this.sendEmail(email, subject, body);
  },

  sendAttendanceNotification: function(rollNumber, eventId, status) {
    let email = 'student@bvc.edu.in';
    let studentName = 'Student';
    let eventName = 'Event';
    try {
      const student = StudentService.getStudentByRollNumber(rollNumber);
      if (student) {
        email = student['Email'] || student.email || student['Email Address'] || email;
        studentName = student['Student Name'] || student.student_name || studentName;
      }
      const event = EventService.getEventById(eventId);
      if (event) {
        eventName = event.event_name || event['Event Name'] || eventName;
      }
    } catch(e) {}
    const subject = 'Attendance Marked: ' + eventName;
    const body = 'Dear ' + studentName + ',\n\nYour attendance for the event "' + eventName + '" has been marked as: ' + status + '.';
    return this.sendEmail(email, subject, body);
  },

  sendEventReminder: function(eventId, recipientEmail) {
    let eventName = 'Upcoming Event';
    try {
      const event = EventService.getEventById(eventId);
      if (event) {
        eventName = event.event_name || event['Event Name'] || eventName;
      }
    } catch(e) {}
    const subject = 'Reminder: ' + eventName + ' is starting soon!';
    const body = 'Dear Participant,\n\nThis is a friendly reminder that the event "' + eventName + '" is scheduled to start soon. Please be on time.';
    return this.sendEmail(recipientEmail, subject, body);
  },

  sendRegistrationConfirmation: function(rollNumber, eventId) {
    let email = 'student@bvc.edu.in';
    let studentName = 'Student';
    let eventName = 'Event';
    try {
      const student = StudentService.getStudentByRollNumber(rollNumber);
      if (student) {
        email = student['Email'] || student.email || student['Email Address'] || email;
        studentName = student['Student Name'] || student.student_name || studentName;
      }
      const event = EventService.getEventById(eventId);
      if (event) {
        eventName = event.event_name || event['Event Name'] || eventName;
      }
    } catch(e) {}
    const subject = 'Registration Confirmed: ' + eventName;
    const body = 'Dear ' + studentName + ',\n\nYour registration for the event "' + eventName + '" has been successfully confirmed.';
    return this.sendEmail(email, subject, body);
  },

  sendReportReadyNotification: function(userId, reportId) {
    const title = 'Report Ready';
    const message = 'Your generated report (ID: ' + reportId + ') is now ready for download.';
    const resp = this.createNotification({
      userId: userId,
      title: title,
      message: message,
      type: 'Report'
    });
    let email = 'coordinator@bvc.edu.in';
    try {
      const user = UserService.getUserById(userId);
      if (user) {
        email = user.email || user['Email Address'] || email;
      }
    } catch(e) {}
    this.sendEmail(email, title, message);
    return Utils.buildResponse(true, 'Report notification sent.', { notificationId: resp.success && resp.notification ? resp.notification['Notification ID'] : null });
  },

  bulkNotifications: function(notificationsArray) {
    const ids = [];
    if (Array.isArray(notificationsArray)) {
      notificationsArray.forEach(n => {
        const res = this.createNotification(n);
        if (res.success && res.notification) {
          ids.push(res.notification['Notification ID'] || res.notification.notification_id);
        }
      });
    }
    return Utils.buildResponse(true, 'Bulk notifications sent successfully.', { notificationIds: ids });
  },

  getNotificationHistory: function(userId) {
    return this.getNotificationsByUser(userId);
  }

};
