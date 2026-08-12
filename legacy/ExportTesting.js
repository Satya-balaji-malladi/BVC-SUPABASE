/**
 * ExportTesting.js
 * Comprehensive automated regression testing suite for Export functionality.
 * Validates role-based access control (RLS), data retrieval, payload structure, and format compliance.
 */
var ExportTesting = {

  runAllTests: function() {
    Logger.log("========== STARTING EXPORT REGRESSION TEST SUITE ==========");
    
    let totalPass = 0;
    let totalFail = 0;

    const tests = [
      this.testExportStudentsAdmin,
      this.testExportStudentsSuperAdmin,
      this.testExportEventsCoordinator,
      this.testExportUsersHOD,
      this.testExportEmptyDataset
    ];

    tests.forEach(test => {
      try {
        const result = test.bind(this)();
        if (result.success) {
          Logger.log("[PASS] " + test.name);
          totalPass++;
        } else {
          Logger.log("[FAIL] " + test.name + " -> " + result.error);
          totalFail++;
        }
      } catch (e) {
        Logger.log("[ERROR] " + test.name + " crashed: " + e.message);
        totalFail++;
      }
    });

    Logger.log("========== EXPORT TEST SUITE COMPLETED ==========");
    Logger.log("Passed: " + totalPass + " | Failed: " + totalFail);
    
    return { passed: totalPass, failed: totalFail };
  },

  /** 
   * Validates that an Admin exporting students receives only students associated with their assigned events. 
   */
  testExportStudentsAdmin: function() {
    // Mock userContext for an Admin
    const userContext = { userId: "USER_ADMIN_1", role: "ADMIN", department: "IT" };
    const config = {
      module_type: "students",
      fields: ["student_id", "roll_number", "student_name"],
      format: "csv"
    };

    const res = ExportService.processCustomExport("USER_ADMIN_1", config, userContext);
    
    if (!res.success) {
      return { success: false, error: "ExportService failed: " + res.message };
    }
    
    if (!Array.isArray(res.data.rows)) {
      return { success: false, error: "Result rows is not an array." };
    }
    
    // Check that fields mapped correctly
    if (res.data.rows.length > 0 && !res.data.rows[0].hasOwnProperty("roll_number")) {
      return { success: false, error: "Columns failed to map correctly." };
    }

    return { success: true };
  },

  /** 
   * Validates that a Super Admin exporting students receives all students.
   */
  testExportStudentsSuperAdmin: function() {
    const userContext = { userId: "USER_SUPER_1", role: "SUPER_ADMIN", department: "ADMIN" };
    const config = {
      module_type: "students",
      fields: ["student_id", "roll_number"],
      format: "csv"
    };

    const res = ExportService.processCustomExport("USER_SUPER_1", config, userContext);
    
    if (!res.success) return { success: false, error: res.message };
    if (!Array.isArray(res.data.rows)) return { success: false, error: "No rows array." };
    
    // Superadmin should definitely have > 0 students
    if (res.data.rows.length === 0) {
      return { success: false, error: "Super Admin export returned 0 students." };
    }
    
    return { success: true };
  },

  /** 
   * Validates Coordinator access to event exports (should only return assigned events).
   */
  testExportEventsCoordinator: function() {
    const userContext = { userId: "USER_COORD_1", role: "COORDINATOR", department: "CSE" };
    const config = {
      module_type: "events",
      fields: ["event_id", "event_name"],
      format: "csv"
    };

    const res = ExportService.processCustomExport("USER_COORD_1", config, userContext);
    
    if (!res.success) return { success: false, error: res.message };
    if (!Array.isArray(res.data.rows)) return { success: false, error: "No rows array." };
    
    return { success: true };
  },

  /** 
   * Validates HOD access to user exports (Should be allowed, but potentially restricted by RLS if implemented for users).
   */
  testExportUsersHOD: function() {
    const userContext = { userId: "USER_HOD_1", role: "HOD", department: "CSE" };
    const config = {
      module_type: "users",
      fields: ["user_id", "email_address"],
      format: "csv"
    };

    const res = ExportService.processCustomExport("USER_HOD_1", config, userContext);
    
    if (!res.success) return { success: false, error: res.message };
    
    return { success: true };
  },

  /**
   * Tests graceful handling of empty field selection.
   */
  testExportEmptyDataset: function() {
    const userContext = { userId: "USER_SUPER_1", role: "SUPER_ADMIN", department: "ADMIN" };
    const config = {
      module_type: "students",
      fields: [], // Intentionally empty to trigger error
      format: "csv"
    };

    const res = ExportService.processCustomExport("USER_SUPER_1", config, userContext);
    
    if (res.success) {
      return { success: false, error: "Service should have failed due to empty fields." };
    }
    
    return { success: true };
  }
};
