/**
 * SettingsService.js
 * Handles global key-value configurations and individual setting parameters.
 */

// Runtime patch of CONFIG schema validation for Settings table
if (typeof CONFIG !== 'undefined') {
  CONFIG.ID_COLUMNS = CONFIG.ID_COLUMNS || {};
  CONFIG.ID_FORMATS = CONFIG.ID_FORMATS || {};
  CONFIG.REQUIRED_FIELDS = CONFIG.REQUIRED_FIELDS || {};

  if (!CONFIG.ID_COLUMNS.SETTINGS) {
    CONFIG.ID_COLUMNS.SETTINGS = 'Setting ID';
  }
  if (!CONFIG.ID_FORMATS.SETTINGS) {
    CONFIG.ID_FORMATS.SETTINGS = { prefix: 'SET', digits: 3 };
  }
  if (!CONFIG.REQUIRED_FIELDS.SETTINGS) {
    CONFIG.REQUIRED_FIELDS.SETTINGS = ['Setting ID', 'Category', 'Key', 'Value', 'Status'];
  }
}

const SettingsService = {

  _cache: null,
  _clearCache: function() { this._cache = null; },

  _applyDefaults: function(data) {
    try {
      if (!data.collegeName) {
        data.collegeName = (CONFIG && CONFIG.DEFAULT_SETTINGS && CONFIG.DEFAULT_SETTINGS.COLLEGE_NAME)
          ? CONFIG.DEFAULT_SETTINGS.COLLEGE_NAME
          : (CONFIG && CONFIG.APP && CONFIG.APP.NAME ? CONFIG.APP.NAME : 'BVC Engineering College');
      }
      if (!data.pagination && data.pagination !== 0) data.pagination = 10;
      if (!data.theme) data.theme = 'light';
      if (data.adminEmail === undefined || data.adminEmail === null) data.adminEmail = '';
      if (data.language === undefined || data.language === null) data.language = 'en';
      if (data.notificationsEnabled === undefined || data.notificationsEnabled === null) data.notificationsEnabled = true;
      return data;
    } catch (e) {
      Logger.log('SettingsService._applyDefaults error: ' + e.message);
      return data || {};
    }
  },

  _generateSettingId: function() {
    try {
      if (IdService && IdService._generateNextIdWithLock) {
        return IdService._generateNextIdWithLock('SETTINGS');
      }
    } catch (e) {}
    const all = DatabaseService.readAllRows(CONFIG.SHEETS.SETTINGS) || [];
    return 'SET' + Utils.padNumber(all.length + 1, 3);
  },

  // ============================================================
  // Backward-Compatible Consolidated APIs
  // ============================================================

  getSettings: function() {
    try {
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.SETTINGS) || [];
      const data = {};
      all.forEach(row => {
        const key = row['Key'] || row.key;
        let val = row['Value'] || row.value;
        const type = row['Data Type'] || row.dataType || 'String';
        if (type === 'Boolean') {
          val = (String(val).toLowerCase() === 'true' || val === true);
        } else if (type === 'Integer' || type === 'Number') {
          val = Number(val) || 0;
        }
        if (key) {
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          data[camelKey] = val;
          data[key] = val;
        }
      });
      const finalData = this._applyDefaults(data);
      return Utils.buildResponse(true, 'Settings retrieved', { data: finalData });
    } catch (e) {
      Logger.log('SettingsService.getSettings error: ' + e.message);
      return Utils.buildResponse(false, 'Failed to get settings');
    }
  },

  saveSettings: function(payload) {
    try {
      payload = payload || {};
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.SETTINGS) || [];

      const keysToSave = {
        'collegeName': { category: 'System', type: 'String', desc: 'College Name' },
        'pagination': { category: 'System', type: 'Integer', desc: 'Items per page' },
        'adminEmail': { category: 'Email', type: 'String', desc: 'Admin email' },
        'theme': { category: 'System', type: 'String', desc: 'UI Theme' },
        'language': { category: 'System', type: 'String', desc: 'UI Language' },
        'notificationsEnabled': { category: 'Notification', type: 'Boolean', desc: 'Enable notifications' },
        'securityLevel': { category: 'Security', type: 'String', desc: 'System security level' },
        'attendanceThreshold': { category: 'Attendance', type: 'Integer', desc: 'Default attendance threshold (%)' },
        'academicYears': { category: 'Academic', type: 'String', desc: 'Active academic years config' }
      };

      Object.keys(keysToSave).forEach(key => {
        if (payload[key] !== undefined) {
          const config = keysToSave[key];
          const existing = all.find(r => String(r['Key'] || r.key).toLowerCase() === key.toLowerCase());
          const valStr = String(payload[key]);
          if (existing) {
            const updates = {
              'Value': valStr,
              'Updated At': new Date().toISOString(),
              'Updated By': 'System'
            };
            DatabaseService.updateRow(CONFIG.SHEETS.SETTINGS, 'Setting ID', existing['Setting ID'] || existing.setting_id, updates);
          } else {
            const settingId = this._generateSettingId();
            const record = {
              'Setting ID': settingId,
              'Category': config.category,
              'Key': key,
              'Value': valStr,
              'Data Type': config.type,
              'Description': config.desc,
              'Editable': true,
              'Status': 'Active',
              'Created At': new Date().toISOString(),
              'Created By': 'System',
              'Updated At': new Date().toISOString(),
              'Updated By': 'System'
            };
            DatabaseService.insertRow(CONFIG.SHEETS.SETTINGS, record);
          }
        }
      });

      this._clearCache();
      try {
        AuditService.logAction('System', 'SettingsService', 'UPDATE_SETTINGS', '', 'Settings', 'Settings updated', '', 'SUCCESS', 'System');
      } catch (e) {}
      return Utils.buildResponse(true, 'Settings saved successfully');
    } catch (e) {
      Logger.log('SettingsService.saveSettings error: ' + e.message);
      return Utils.buildResponse(false, 'Failed to save settings');
    }
  },

  // ============================================================
  // Granular Row-Level Setting Management APIs
  // ============================================================

  createSetting: function(category, key, value, dataType, description, editable, status, createdBy) {
    try {
      if (!category || !key) return Utils.buildResponse(false, 'Category and Key are required.');
      const all = DatabaseService.readAllRows(CONFIG.SHEETS.SETTINGS) || [];
      const duplicate = all.find(r => String(r['Key'] || r.key).toLowerCase() === String(key).toLowerCase());
      if (duplicate) return Utils.buildResponse(false, 'Setting key already exists.');

      const settingId = this._generateSettingId();
      const record = {
        'Setting ID': settingId,
        'Category': category,
        'Key': key,
        'Value': String(value),
        'Data Type': dataType || 'String',
        'Description': description || '',
        'Editable': editable !== undefined ? editable : true,
        'Status': status || 'Active',
        'Created At': new Date().toISOString(),
        'Created By': createdBy || 'System',
        'Updated At': new Date().toISOString(),
        'Updated By': createdBy || 'System'
      };

      const success = DatabaseService.insertRow(CONFIG.SHEETS.SETTINGS, record);
      if (success) {
        return Utils.buildResponse(true, 'Setting created successfully.', { setting: record });
      }
      return Utils.buildResponse(false, 'Failed to insert setting row.');
    } catch (e) {
      Logger.log('SettingsService.createSetting error: ' + e.message);
      return Utils.buildResponse(false, e.message);
    }
  },

  updateSetting: function(settingId, updates, updatedBy) {
    try {
      if (!settingId) return Utils.buildResponse(false, 'Setting ID is required.');
      const record = {
        'Updated At': new Date().toISOString(),
        'Updated By': updatedBy || 'System'
      };
      if (updates.Category !== undefined) record['Category'] = updates.Category;
      if (updates.Key !== undefined) record['Key'] = updates.Key;
      if (updates.Value !== undefined) record['Value'] = String(updates.Value);
      if (updates['Data Type'] !== undefined) record['Data Type'] = updates['Data Type'];
      if (updates.Description !== undefined) record['Description'] = updates.Description;
      if (updates.Editable !== undefined) record['Editable'] = updates.Editable;
      if (updates.Status !== undefined) record['Status'] = updates.Status;

      const success = DatabaseService.updateRow(CONFIG.SHEETS.SETTINGS, 'Setting ID', settingId, record);
      if (success) return Utils.buildResponse(true, 'Setting updated successfully.');
      return Utils.buildResponse(false, 'Failed to update setting.');
    } catch (e) {
      Logger.log('SettingsService.updateSetting error: ' + e.message);
      return Utils.buildResponse(false, e.message);
    }
  },

  deleteSetting: function(settingId, updatedBy) {
    try {
      if (!settingId) return Utils.buildResponse(false, 'Setting ID is required.');
      DatabaseService.hardDelete(CONFIG.SHEETS.SETTINGS, 'Setting ID', settingId);
      const check = DatabaseService.readAllRows(CONFIG.SHEETS.SETTINGS).find(r => r['Setting ID'] === settingId);
      if (!check) return Utils.buildResponse(true, 'Setting deleted successfully.');
      return Utils.buildResponse(false, 'Failed to delete setting.');
    } catch (e) {
      Logger.log('SettingsService.deleteSetting error: ' + e.message);
      return Utils.buildResponse(false, e.message);
    }
  },

  getSetting: function(key) {
    if (!key) return null;
    const all = DatabaseService.readAllRows(CONFIG.SHEETS.SETTINGS) || [];
    return all.find(r => String(r['Key'] || r.key).toLowerCase() === String(key).toLowerCase()) || null;
  },

  getCategory: function(categoryName) {
    if (!categoryName) return [];
    const all = DatabaseService.readAllRows(CONFIG.SHEETS.SETTINGS) || [];
    return all.filter(r => String(r['Category'] || r.category).toLowerCase() === String(categoryName).toLowerCase());
  },

  enableSetting: function(settingId, updatedBy) {
    return this.updateSetting(settingId, { Status: 'Active' }, updatedBy);
  },

  disableSetting: function(settingId, updatedBy) {
    return this.updateSetting(settingId, { Status: 'Inactive' }, updatedBy);
  },

  getSystemSettings: function() {
    return this.getCategory('System');
  },

  getAttendanceSettings: function() {
    return this.getCategory('Attendance');
  },

  getNotificationSettings: function() {
    return this.getCategory('Notification');
  },

  getEmailSettings: function() {
    return this.getCategory('Email');
  },

  getSecuritySettings: function() {
    return this.getCategory('Security');
  },

  clearAttendanceLogs: function(userId) {
    try {
      const user = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, 'User ID', userId)[0];
      const role = user ? (user['Role'] || user.role) : null;
      if (role !== CONFIG.ROLES.ADMIN) {
        return Utils.buildResponse(false, 'Unauthorized. Admins only.');
      }

      const sheet = DatabaseService.getSheet(CONFIG.SHEETS.ATTENDANCE);
      if (sheet) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.deleteRows(2, lastRow - 1);
        }
        DatabaseService.clearCache(CONFIG.SHEETS.ATTENDANCE);
      }

      try {
        AuditService.logAction(userId, 'SettingsService', 'CLEAR_ATTENDANCE_LOGS', '', 'Attendance', 'Attendance sheet logs cleared', '', 'SUCCESS', userId);
      } catch (e) {}

      return Utils.buildResponse(true, 'Attendance logs cleared successfully.');
    } catch (e) {
      Logger.log('SettingsService.clearAttendanceLogs error: ' + e.message);
      return Utils.buildResponse(false, e.message);
    }
  },

  resetSystem: function(userId) {
    try {
      const user = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, 'User ID', userId)[0];
      const role = user ? (user['Role'] || user.role) : null;
      if (role !== CONFIG.ROLES.ADMIN) {
        return Utils.buildResponse(false, 'Unauthorized. Admins only.');
      }

      const targetSheets = [
        CONFIG.SHEETS.ATTENDANCE,
        CONFIG.SHEETS.EVENT_PARTICIPANTS,
        CONFIG.SHEETS.EVENTS
      ];

      targetSheets.forEach(s => {
        const sheet = DatabaseService.getSheet(s);
        if (sheet) {
          const lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            sheet.deleteRows(2, lastRow - 1);
          }
          DatabaseService.clearCache(s);
        }
      });

      try {
        AuditService.logAction(userId, 'SettingsService', 'RESET_SYSTEM', '', 'System', 'System environment fully reset to empty templates', '', 'SUCCESS', userId);
      } catch (e) {}

      return Utils.buildResponse(true, 'System reset successfully.');
    } catch (e) {
      Logger.log('SettingsService.resetSystem error: ' + e.message);
      return Utils.buildResponse(false, e.message);
    }
  }

};
