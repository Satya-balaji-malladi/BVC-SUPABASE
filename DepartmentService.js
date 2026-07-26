
/**
 * DepartmentService.gs
 * Service for handling department management in BVC Engineering College Event Attendance Management System.
 * Responsibilities: CRUD operations for departments, activation/deactivation, searching, filtering, sorting, pagination, and statistics.
 */
const DepartmentService = {

  _isDepartmentNameAvailable: function(name, excludeId) {
    try {
      const records = this._getDepartments();
      return !records.some(dept =>
        dept[CONFIG.COLUMNS.DEPARTMENT_NAME] === name &&
        dept[CONFIG.COLUMNS.DEPARTMENT_ID] !== excludeId
      );
    } catch (error) {
      Logger.log('DepartmentService._isDepartmentNameAvailable error: ' + (error && error.message ? error.message : error));
      // safest backward-compatible behavior: treat as not available
      return false;
    }
  },

  _isDepartmentCodeAvailable: function(code, excludeId) {
    try {
      const records = this._getDepartments();
      return !records.some(dept =>
        dept[CONFIG.COLUMNS.DEPARTMENT_CODE] === code &&
        dept[CONFIG.COLUMNS.DEPARTMENT_ID] !== excludeId
      );
    } catch (error) {
      Logger.log('DepartmentService._isDepartmentCodeAvailable error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  _departmentExists: function(departmentId) {
    try {
      const records = this._getDepartments();
      return records.some(dept => dept[CONFIG.COLUMNS.DEPARTMENT_ID] === departmentId);
    } catch (error) {
      Logger.log('DepartmentService._departmentExists error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  _buildDepartmentObject: function(data, createdBy) {
    const now = Utils.getCurrentTimestamp();
    return {
      [CONFIG.COLUMNS.DEPARTMENT_ID]: IdService.generateDepartmentId(),
      [CONFIG.COLUMNS.DEPARTMENT_NAME]: data[CONFIG.COLUMNS.DEPARTMENT_NAME],
      [CONFIG.COLUMNS.DEPARTMENT_CODE]: data[CONFIG.COLUMNS.DEPARTMENT_CODE],
      [CONFIG.COLUMNS.DESCRIPTION]: data[CONFIG.COLUMNS.DESCRIPTION],
      [CONFIG.COLUMNS.STATUS]: CONFIG.DEPARTMENT_STATUS.ACTIVE,
      [CONFIG.COLUMNS.DELETION_FLAG]: false,
      [CONFIG.COLUMNS.CREATED_BY]: createdBy,
      [CONFIG.COLUMNS.CREATED_AT]: now,
      [CONFIG.COLUMNS.UPDATED_BY]: createdBy,
      [CONFIG.COLUMNS.UPDATED_AT]: now
    };
  },

  _getDepartments: function() {
    try {
      const records = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS) || [];
      return records.filter(dept => !dept[CONFIG.COLUMNS.DELETION_FLAG]);
    } catch (error) {
      Logger.log('DepartmentService._getDepartments error: ' + (error && error.message ? error.message : error));
      return [];
    }
  },

  departmentInUse: function(departmentId) {
    try {
      const users = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(u => u[CONFIG.COLUMNS.STATUS] === CONFIG.USER_STATUS.ACTIVE && !u[CONFIG.COLUMNS.DELETION_FLAG]);
      const students = DatabaseService.findByColumn(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(s => s[CONFIG.COLUMNS.STATUS] === CONFIG.STUDENT_STATUS.ACTIVE && !s[CONFIG.COLUMNS.DELETION_FLAG]);
      const events = DatabaseService.findByColumn(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(e => e[CONFIG.COLUMNS.STATUS] === CONFIG.EVENT_STATUS.ACTIVE && !e[CONFIG.COLUMNS.DELETION_FLAG]);
      return users.length > 0 || students.length > 0 || events.length > 0;
    } catch (error) {
      Logger.log('DepartmentService.departmentInUse error: ' + (error && error.message ? error.message : error));
      return false;
    }
  },

  createDepartment: function(departmentData, createdBy) {
  try {

    // Check input
    if (!departmentData) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_CREATE_FAILED || "Department data is required."
      );
    }

    // Validate department data
    var validationResult = ValidationService.validateDepartment(departmentData);

    if (!validationResult || !validationResult.valid) {
      var errors = (validationResult && validationResult.errors)
        ? validationResult.errors
        : ["Validation failed"];

      return Utils.buildResponse(false, errors.join(" "));
    }

    // Check Department Name
    if (!this._isDepartmentNameAvailable(
      departmentData[CONFIG.COLUMNS.DEPARTMENT_NAME]
    )) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NAME_EXISTS
      );
    }

    // Check Department Code
    if (!this._isDepartmentCodeAvailable(
      departmentData[CONFIG.COLUMNS.DEPARTMENT_CODE]
    )) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_CODE_EXISTS
      );
    }

    // Build Department Object
    var newDepartment = this._buildDepartmentObject(
      departmentData,
      createdBy
    );

    // Insert into Database
    var inserted = DatabaseService.insertRow(
      CONFIG.SHEETS.DEPARTMENTS,
      newDepartment
    );

    if (!inserted) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_CREATE_FAILED
      );
    }

    // Audit Log
    try {
      AuditService.logAction(
        newDepartment[CONFIG.COLUMNS.DEPARTMENT_ID],
        "DepartmentService",
        "CREATE_DEPARTMENT",
        newDepartment[CONFIG.COLUMNS.DEPARTMENT_ID],
        "Department",
        "Department created",
        "",
        "SUCCESS",
        createdBy || ""
      );
    } catch (auditError) {
      Logger.log(auditError);
    }

    return Utils.buildResponse(
      true,
      CONFIG.MESSAGES.DEPARTMENT_CREATED,
      {
        department: Utils.sanitizeDepartment(
          inserted === true ? newDepartment : inserted
        )
      }
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.createDepartment error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      CONFIG.MESSAGES.DEPARTMENT_CREATE_FAILED
    );
  }
},

  getDepartmentById: function(departmentId) {
  try {

    if (!departmentId) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    var dept = this._getDepartmentByIdRecord
      ? this._getDepartmentByIdRecord(departmentId)
      : DatabaseService.findOne(
          CONFIG.SHEETS.DEPARTMENTS,
          CONFIG.COLUMNS.DEPARTMENT_ID,
          departmentId
        );

    if (!dept) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    return Utils.buildResponse(
      true,
      "Department found.",
      {
        department: Utils.sanitizeDepartment(dept)
      }
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.getDepartmentById error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
    );
  }
},

  getDepartmentByName: function(departmentName) {
  try {

    if (!departmentName || String(departmentName).trim() === "") {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    var dept = DatabaseService.findOne(
      CONFIG.SHEETS.DEPARTMENTS,
      CONFIG.COLUMNS.DEPARTMENT_NAME,
      departmentName
    );

    if (!dept) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    return Utils.buildResponse(
      true,
      "Department found.",
      {
        department: Utils.sanitizeDepartment(dept)
      }
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.getDepartmentByName error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
    );
  }
},

  getAllDepartments: function() {
  try {

    var departments = this._getDepartments() || [];

    var sanitizedDepartments = departments.map(function(dept) {
      return Utils.sanitizeDepartment(dept);
    });

    return Utils.buildResponse(
      true,
      "Departments retrieved successfully.",
      {
        departments: sanitizedDepartments,
        totalRecords: sanitizedDepartments.length
      }
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.getAllDepartments error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      CONFIG.MESSAGES.ERROR_DEFAULT || "Failed to retrieve departments."
    );
  }
},

  getActiveDepartments: function() {
    try {
      return this._getDepartments()
        .filter(dept => dept[CONFIG.COLUMNS.STATUS] === CONFIG.DEPARTMENT_STATUS.ACTIVE)
        .map(dept => Utils.sanitizeDepartment(dept));
    } catch (error) {
      Logger.log("DepartmentService.getActiveDepartments error: " + error.message);
      return [];
    }
  },

  updateDepartment: function(departmentId, updateData, updatedBy) {
  try {

    // Validate input
    if (!departmentId) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    if (!updateData) {
      return Utils.buildResponse(
        false,
        "No department data to update."
      );
    }

    // Check department exists
    if (!this._departmentExists(departmentId)) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    // Check duplicate Department Name
    if (
      updateData[CONFIG.COLUMNS.DEPARTMENT_NAME] &&
      !this._isDepartmentNameAvailable(
        updateData[CONFIG.COLUMNS.DEPARTMENT_NAME],
        departmentId
      )
    ) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NAME_EXISTS
      );
    }

    // Check duplicate Department Code
    if (
      updateData[CONFIG.COLUMNS.DEPARTMENT_CODE] &&
      !this._isDepartmentCodeAvailable(
        updateData[CONFIG.COLUMNS.DEPARTMENT_CODE],
        departmentId
      )
    ) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_CODE_EXISTS
      );
    }

    // Protect fields
    delete updateData[CONFIG.COLUMNS.DEPARTMENT_ID];
    delete updateData[CONFIG.COLUMNS.CREATED_BY];
    delete updateData[CONFIG.COLUMNS.CREATED_AT];
    delete updateData[CONFIG.COLUMNS.DELETION_FLAG];

    // Nothing to update?
    if (Object.keys(updateData).length === 0) {
      return Utils.buildResponse(
        false,
        "No department data to update."
      );
    }

    // Audit fields
    updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || "";
    updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

    // Update
    var updated = DatabaseService.updateRow(
      CONFIG.SHEETS.DEPARTMENTS,
      CONFIG.COLUMNS.DEPARTMENT_ID,
      departmentId,
      updateData
    );

    if (!updated) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_UPDATE_FAILED
      );
    }

    // Audit Log
    try {
      AuditService.logAction(
        departmentId,
        "DepartmentService",
        "UPDATE_DEPARTMENT",
        departmentId,
        "Department",
        "Department updated",
        "",
        "SUCCESS",
        updatedBy || ""
      );
    } catch (auditError) {
      Logger.log(auditError);
    }

    return Utils.buildResponse(
      true,
      CONFIG.MESSAGES.DEPARTMENT_UPDATED,
      {
        department: Utils.sanitizeDepartment(
          updated === true ? updateData : updated
        )
      }
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.updateDepartment error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      CONFIG.MESSAGES.DEPARTMENT_UPDATE_FAILED
    );
  }
},
deleteDepartment: function(departmentId, updatedBy) {
  try {

    // Validate Department ID
    if (!departmentId) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    // Check Department Exists
    if (!this._departmentExists(departmentId)) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    // Check if Department is in use
    if (this.departmentInUse(departmentId)) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_IN_USE || "Department is in use."
      );
    }

    // Soft Delete
    var deleted = DatabaseService.deleteRow(
      CONFIG.SHEETS.DEPARTMENTS,
      CONFIG.COLUMNS.DEPARTMENT_ID,
      departmentId
    );

    if (!deleted) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_DELETE_FAILED
      );
    }

    // Update audit fields
    try {
      var updateData = {};

      updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || "";
      updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

      DatabaseService.updateRow(
        CONFIG.SHEETS.DEPARTMENTS,
        CONFIG.COLUMNS.DEPARTMENT_ID,
        departmentId,
        updateData
      );
    } catch (metaError) {
      Logger.log(
        "Metadata update failed: " +
        (metaError && metaError.message
          ? metaError.message
          : metaError)
      );
    }

    // Audit Log
    try {
      AuditService.logAction(
        departmentId,
        "DepartmentService",
        "DELETE_DEPARTMENT",
        departmentId,
        "Department",
        "Department deleted",
        "",
        "SUCCESS",
        updatedBy || ""
      );
    } catch (auditError) {
      Logger.log(auditError);
    }

    return Utils.buildResponse(
      true,
      CONFIG.MESSAGES.DEPARTMENT_DELETED
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.deleteDepartment error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      CONFIG.MESSAGES.DEPARTMENT_DELETE_FAILED
    );
  }
},

  activateDepartment: function(departmentId, updatedBy) {
  try {

    if (!departmentId) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    if (!this._departmentExists(departmentId)) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    var dept = this._getDepartmentByIdRecord
      ? this._getDepartmentByIdRecord(departmentId)
      : DatabaseService.findOne(
          CONFIG.SHEETS.DEPARTMENTS,
          CONFIG.COLUMNS.DEPARTMENT_ID,
          departmentId
        );

    if (!dept) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    if (dept[CONFIG.COLUMNS.STATUS] === CONFIG.DEPARTMENT_STATUS.ACTIVE) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_ALREADY_ACTIVE || "Department is already active."
      );
    }

    var updateData = {};

    updateData[CONFIG.COLUMNS.STATUS] = CONFIG.DEPARTMENT_STATUS.ACTIVE;
    updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || "";
    updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

    var updated = DatabaseService.updateRow(
      CONFIG.SHEETS.DEPARTMENTS,
      CONFIG.COLUMNS.DEPARTMENT_ID,
      departmentId,
      updateData
    );

    if (!updated) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_ACTIVATE_FAILED
      );
    }

    // Audit Log
    try {
      AuditService.logAction(
        departmentId,
        "DepartmentService",
        "ACTIVATE_DEPARTMENT",
        departmentId,
        "Department",
        "Department activated",
        "",
        "SUCCESS",
        updatedBy || ""
      );
    } catch (auditError) {
      Logger.log(auditError);
    }

    return Utils.buildResponse(
      true,
      CONFIG.MESSAGES.DEPARTMENT_ACTIVATED,
      {
        department: Utils.sanitizeDepartment(
          updated === true ? updateData : updated
        )
      }
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.activateDepartment error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      CONFIG.MESSAGES.DEPARTMENT_ACTIVATE_FAILED
    );
  }
},

   deactivateDepartment: function(departmentId, updatedBy) {
  try {

    if (!departmentId) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    if (!this._departmentExists(departmentId)) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    var dept = this._getDepartmentByIdRecord
      ? this._getDepartmentByIdRecord(departmentId)
      : DatabaseService.findOne(
          CONFIG.SHEETS.DEPARTMENTS,
          CONFIG.COLUMNS.DEPARTMENT_ID,
          departmentId
        );

    if (!dept) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_NOT_FOUND
      );
    }

    if (dept[CONFIG.COLUMNS.STATUS] === CONFIG.DEPARTMENT_STATUS.INACTIVE) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_ALREADY_INACTIVE ||
        "Department is already inactive."
      );
    }

    var updateData = {};

    updateData[CONFIG.COLUMNS.STATUS] = CONFIG.DEPARTMENT_STATUS.INACTIVE;
    updateData[CONFIG.COLUMNS.UPDATED_BY] = updatedBy || "";
    updateData[CONFIG.COLUMNS.UPDATED_AT] = Utils.getCurrentTimestamp();

    var updated = DatabaseService.updateRow(
      CONFIG.SHEETS.DEPARTMENTS,
      CONFIG.COLUMNS.DEPARTMENT_ID,
      departmentId,
      updateData
    );

    if (!updated) {
      return Utils.buildResponse(
        false,
        CONFIG.MESSAGES.DEPARTMENT_DEACTIVATE_FAILED
      );
    }

    // Audit Log
    try {
      AuditService.logAction(
        departmentId,
        "DepartmentService",
        "DEACTIVATE_DEPARTMENT",
        departmentId,
        "Department",
        "Department deactivated",
        "",
        "SUCCESS",
        updatedBy || ""
      );
    } catch (auditError) {
      Logger.log(auditError);
    }

    return Utils.buildResponse(
      true,
      CONFIG.MESSAGES.DEPARTMENT_DEACTIVATED,
      {
        department: Utils.sanitizeDepartment(
          updated === true ? updateData : updated
        )
      }
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.deactivateDepartment error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      CONFIG.MESSAGES.DEPARTMENT_DEACTIVATE_FAILED
    );
  }
},
sortDepartments: function(sortBy, order) {
  try {

    var allowedFields = [
      CONFIG.COLUMNS.DEPARTMENT_NAME,
      CONFIG.COLUMNS.DEPARTMENT_CODE,
      CONFIG.COLUMNS.STATUS,
      CONFIG.COLUMNS.CREATED_AT,
      CONFIG.COLUMNS.UPDATED_AT
    ];

    if (allowedFields.indexOf(sortBy) === -1) {
      return Utils.buildResponse(
        false,
        "Invalid sort column."
      );
    }

    order = (String(order).toLowerCase() === "desc") ? "desc" : "asc";

    var records = this._getDepartments() || [];

    records.sort(function(a, b) {

      var valA = a[sortBy] || "";
      var valB = b[sortBy] || "";

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
      }

      if (typeof valB === "string") {
        valB = valB.toLowerCase();
      }

      if (valA < valB) {
        return order === "asc" ? -1 : 1;
      }

      if (valA > valB) {
        return order === "asc" ? 1 : -1;
      }

      return 0;

    });

    var departments = records.map(function(dept) {
      return Utils.sanitizeDepartment(dept);
    });

    return Utils.buildResponse(
      true,
      "Departments sorted successfully.",
      {
        departments: departments,
        totalRecords: departments.length,
        sortBy: sortBy,
        order: order
      }
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.sortDepartments error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      "Department sorting failed."
    );
  }
},
 paginateDepartments: function(page, pageSize) {
  try {

    page = parseInt(page, 10);
pageSize = parseInt(pageSize, 10);

if (isNaN(page)) {
  page = 1;
}

if (isNaN(pageSize)) {
  pageSize = 10;
}

    if (page < 1 || pageSize < 1) {
      return Utils.buildResponse(
        false,
        "Invalid page or page size."
      );
    }

    var records = this._getDepartments() || [];

    var totalRecords = records.length;
    var totalPages = Math.ceil(totalRecords / pageSize);

    var startIndex = (page - 1) * pageSize;

    var items = records.slice(
      startIndex,
      startIndex + pageSize
    ).map(function(dept) {
      return Utils.sanitizeDepartment(dept);
    });

    return Utils.buildResponse(
      true,
      "Departments retrieved successfully.",
      {
        totalRecords: totalRecords,
        currentPage: page,
        totalPages: totalPages,
        pageSize: pageSize,
        items: items
      }
    );

  } catch (error) {

    Logger.log(
      "DepartmentService.paginateDepartments error: " +
      (error && error.message ? error.message : error)
    );

    return Utils.buildResponse(
      false,
      "Pagination failed."
    );
  }
},

  countUsers: function(departmentId) {
    try {
      const users = DatabaseService.findByColumn(CONFIG.SHEETS.USERS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(u => u[CONFIG.COLUMNS.STATUS] === CONFIG.USER_STATUS.ACTIVE && !u[CONFIG.COLUMNS.DELETION_FLAG]);
      return users.length;
    } catch (error) {
      Logger.log("DepartmentService.countUsers error: " + error.message);
      return 0;
    }
  },

  countStudents: function(departmentId) {
    try {
      const students = DatabaseService.findByColumn(CONFIG.SHEETS.STUDENTS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(s => s[CONFIG.COLUMNS.STATUS] === CONFIG.STUDENT_STATUS.ACTIVE && !s[CONFIG.COLUMNS.DELETION_FLAG]);
      return students.length;
    } catch (error) {
      Logger.log("DepartmentService.countStudents error: " + error.message);
      return 0;
    }
  },

  countEvents: function(departmentId) {
    try {
      const events = DatabaseService.findByColumn(CONFIG.SHEETS.EVENTS, CONFIG.COLUMNS.DEPARTMENT, departmentId)
        .filter(e => e[CONFIG.COLUMNS.STATUS] === CONFIG.EVENT_STATUS.ACTIVE && !e[CONFIG.COLUMNS.DELETION_FLAG]);
      return events.length;
    } catch (error) {
      Logger.log("DepartmentService.countEvents error: " + error.message);
      return 0;
    }
  },

  getDepartmentSummary: function(departmentId) {
    try {
      const dept = this.getDepartmentById(departmentId);
      if (!dept) {
        return null;
      }
      return {
        department: dept,
        userCount: this.countUsers(departmentId),
        studentCount: this.countStudents(departmentId),
        eventCount: this.countEvents(departmentId)
      };
    } catch (error) {
      Logger.log("DepartmentService.getDepartmentSummary error: " + error.message);
      return null;
    }
  }
};
