/**
 * GuestService.js
 * Service for handling Guest entity & user management in BVC Engineering College Attendance System.
 */
var GuestService = {
  _guestsSheet: function () {
    return CONFIG.SHEETS && CONFIG.SHEETS.GUESTS ? CONFIG.SHEETS.GUESTS : 'guests';
  },

  getAllGuests: function (userContext) {
    try {
      var records = DatabaseService.readAllRows(this._guestsSheet()) || [];
      return records.filter(function (g) {
        return !g.deletion_flag && !g['Deletion Flag'];
      });
    } catch (e) {
      Logger.log('GuestService.getAllGuests error: ' + (e && e.message ? e.message : e));
      return [];
    }
  },

  getGuestById: function (guestId) {
    try {
      if (!guestId) return null;
      var cleanId = String(guestId).trim().toUpperCase();
      var records = this.getAllGuests();
      return records.find(function (g) {
        var gId = String(g.guest_id || g['Guest ID'] || '').trim().toUpperCase();
        return gId === cleanId;
      }) || null;
    } catch (e) {
      Logger.log('GuestService.getGuestById error: ' + (e && e.message ? e.message : e));
      return null;
    }
  },

  createGuest: function (sessionToken, guestData) {
    try {
      var userContext = SessionService.getUserContext(sessionToken);
      if (!userContext || !userContext.userId) {
        return Utils.buildResponse(false, 'Unauthorized: Invalid or expired session');
      }

      if (!guestData) return Utils.buildResponse(false, 'Guest data payload is required');

      var firstName = String(guestData.firstName || guestData.first_name || '').trim();
      var lastName = String(guestData.lastName || guestData.last_name || '').trim();
      var fullName = (firstName + ' ' + lastName).trim() || firstName || 'Guest Admin';
      var email = String(guestData.email || guestData.email_address || '').trim().toLowerCase();
      var mobile = String(guestData.mobile || guestData.phone || '').trim();
      var organization = String(guestData.organization || guestData.org || 'Guest Organization').trim();
      var designation = String(guestData.designation || 'Guest').trim();
      var address = String(guestData.address || '').trim();
      var username = String(guestData.username || '').trim();
      var password = String(guestData.password || guestData.tempPassword || 'Guest123!').trim();

      if (!firstName) return Utils.buildResponse(false, 'First Name is required');
      if (!email) return Utils.buildResponse(false, 'Email Address is required');
      if (!username) return Utils.buildResponse(false, 'Username is required');

      if (email && typeof ValidationService !== 'undefined' && typeof ValidationService.validateEmail === 'function') {
        var emailErr = ValidationService.validateEmail(email);
        if (emailErr) return Utils.buildResponse(false, 'Invalid Email Address format');
      }

      if (mobile && (mobile.length !== 10 || isNaN(Number(mobile)))) {
        return Utils.buildResponse(false, 'Mobile Number must be a valid 10-digit number');
      }

      var existingUserByUsername = DatabaseService.findOne(CONFIG.SHEETS.USERS, 'username', username);
      if (existingUserByUsername) {
        return Utils.buildResponse(false, 'Username "' + username + '" is already taken');
      }

      var existingUserByEmail = DatabaseService.findOne(CONFIG.SHEETS.USERS, 'email_address', email);
      var existingGuestByEmail = DatabaseService.findOne(this._guestsSheet(), 'email', email);
      if (existingUserByEmail || existingGuestByEmail) {
        return Utils.buildResponse(false, 'Email Address "' + email + '" is already registered');
      }

      var userId = IdService.generateUserId ? IdService.generateUserId() : ('USR' + Date.now());
      var salt = Utils.generateSalt ? Utils.generateSalt(16) : 'salt123';
      var userPayload = {
        user_id: userId,
        username: username,
        password_hash: password,
        salt: salt,
        employee_id: 'GST_' + userId,
        first_name: fullName,
        email_address: email,
        phone_number: mobile,
        department: 'GUEST',
        role: 'Event Admin',
        status: 'Active',
        first_login: false,
        created_by: userContext.userId,
        created_at: new Date().toISOString()
      };

      var userCreated = DatabaseService.insertRow(CONFIG.SHEETS.USERS, userPayload);
      if (!userCreated) {
        return Utils.buildResponse(false, 'Failed to create guest user authentication record');
      }

      var guestId = IdService.generateId ? IdService.generateId('GUESTS') : ('GST-' + Date.now());
      var guestPayload = {
        guest_id: guestId,
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email: email,
        mobile: mobile,
        organization: organization,
        designation: designation,
        address: address,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      var guestCreated = DatabaseService.insertRow(this._guestsSheet(), guestPayload);
      if (!guestCreated) {
        DatabaseService.deleteRow(CONFIG.SHEETS.USERS, 'user_id', userId);
        return Utils.buildResponse(false, 'Failed to create guest record');
      }

      return Utils.buildResponse(true, 'Guest Event Admin created successfully', {
        userId: userId,
        guestId: guestId,
        username: username,
        name: fullName
      });
    } catch (e) {
      Logger.log('GuestService.createGuest error: ' + (e && e.message ? e.message : e));
      return Utils.buildResponse(false, 'Guest creation failed: ' + e.message);
    }
  }
};
