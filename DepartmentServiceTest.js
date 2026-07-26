function testCreateDepartment() {

  Logger.log("==================================");
  Logger.log("TEST 1 : Create Department");
  Logger.log("==================================");

  var department = {};

  department[CONFIG.COLUMNS.DEPARTMENT_NAME] = "Computer Science";
  department[CONFIG.COLUMNS.DEPARTMENT_CODE] = "CSE";
  department[CONFIG.COLUMNS.STATUS] = "Active";

  var result = DepartmentService.createDepartment(
      department,
      "System"
  );

  if (result.success) {
      Logger.log("✅ PASS");
      Logger.log(result.message);
      Logger.log(JSON.stringify(result.department));
  } else {
      Logger.log("❌ FAIL");
      Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : Duplicate Department");
  Logger.log("==================================");

  result = DepartmentService.createDepartment(
      department,
      "System"
  );

  if (!result.success) {
      Logger.log("✅ PASS");
      Logger.log(result.message);
  } else {
      Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : Empty Department");
  Logger.log("==================================");

  result = DepartmentService.createDepartment(
      {},
      "System"
  );

  if (!result.success) {
      Logger.log("✅ PASS");
      Logger.log(result.message);
  } else {
      Logger.log("❌ FAIL");
  }

}
function testDepartmentColumns() {
  Logger.log(CONFIG.COLUMNS.DEPARTMENT_ID);
  Logger.log(CONFIG.COLUMNS.DEPARTMENT_NAME);
  Logger.log(CONFIG.COLUMNS.DEPARTMENT_CODE);
  Logger.log(CONFIG.COLUMNS.STATUS);
}

function testDepartmentMessages() {
  Logger.log("DEPARTMENT_CREATED:");
  Logger.log(CONFIG.MESSAGES.DEPARTMENT_CREATED);

  Logger.log("DEPARTMENT_CREATE_FAILED:");
  Logger.log(CONFIG.MESSAGES.DEPARTMENT_CREATE_FAILED);

  Logger.log("DEPARTMENT_NAME_EXISTS:");
  Logger.log(CONFIG.MESSAGES.DEPARTMENT_NAME_EXISTS);

  Logger.log("DEPARTMENT_CODE_EXISTS:");
  Logger.log(CONFIG.MESSAGES.DEPARTMENT_CODE_EXISTS);
}
function testUpdateDepartment() {

  Logger.log("==================================");
  Logger.log("TEST 1 : Update Department");
  Logger.log("==================================");

  var updateData = {};

  updateData[CONFIG.COLUMNS.DEPARTMENT_NAME] = "AI & Machine Learning";
updateData[CONFIG.COLUMNS.DEPARTMENT_CODE] = "AIML2026";
  updateData[CONFIG.COLUMNS.STATUS] = "Active";

  var result = DepartmentService.updateDepartment(
      "DEP002",
      updateData,
      "System"
  );

  if (result.success) {
      Logger.log("✅ PASS");
      Logger.log(result.message);
      Logger.log(JSON.stringify(result.department));
  } else {
      Logger.log("❌ FAIL");
      Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : Invalid Department");
  Logger.log("==================================");

  result = DepartmentService.updateDepartment(
      "DEP999",
      updateData,
      "System"
  );

  if (!result.success) {
      Logger.log("✅ PASS");
      Logger.log(result.message);
  } else {
      Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : Empty Update");
  Logger.log("==================================");

  result = DepartmentService.updateDepartment(
      "DEP002",
      {},
      "System"
  );

  Logger.log(JSON.stringify(result));

}
function debugDepartments() {

  var records = DepartmentService._getDepartments();

  Logger.log("===== DEPARTMENTS =====");

  records.forEach(function(dept) {
    Logger.log(
      dept[CONFIG.COLUMNS.DEPARTMENT_ID] +
      " | " +
      dept[CONFIG.COLUMNS.DEPARTMENT_NAME] +
      " | " +
      dept[CONFIG.COLUMNS.DEPARTMENT_CODE]
    );
  });

}
function testDeleteDepartment() {

  Logger.log("==================================");
  Logger.log("TEST 1 : Delete Department");
  Logger.log("==================================");

  var result = DepartmentService.deleteDepartment(
      "DEP002",
      "System"
  );

  if(result.success){
      Logger.log("✅ PASS");
      Logger.log(result.message);
  }else{
      Logger.log("❌ FAIL");
      Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : Invalid Department");
  Logger.log("==================================");

  result = DepartmentService.deleteDepartment(
      "DEP999",
      "System"
  );

  if(!result.success){
      Logger.log("✅ PASS");
      Logger.log(result.message);
  }else{
      Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : Verify Soft Delete");
  Logger.log("==================================");

  var dept = DatabaseService.findOne(
      CONFIG.SHEETS.DEPARTMENTS,
      CONFIG.COLUMNS.DEPARTMENT_ID,
      "DEP002"
  );

  Logger.log(
      "Deletion Flag : " +
      dept[CONFIG.COLUMNS.DELETION_FLAG]
  );

}
function testDeletionFlagColumn() {
  Logger.log(CONFIG.COLUMNS.DELETION_FLAG);
}
function debugDeletedDepartment() {

  var dept = DatabaseService.findOne(
      CONFIG.SHEETS.DEPARTMENTS,
      CONFIG.COLUMNS.DEPARTMENT_ID,
      "DEP002"
  );

  Logger.log(JSON.stringify(dept));

}
function debugDepartmentColumns() {
  Logger.log("CREATED_AT : " + CONFIG.COLUMNS.CREATED_AT);
  Logger.log("UPDATED_AT : " + CONFIG.COLUMNS.UPDATED_AT);
  Logger.log("DELETION_FLAG : " + CONFIG.COLUMNS.DELETION_FLAG);
}
function testCreateDepartmentAgain() {

  Logger.log("===== CREATE DEPARTMENT =====");

  var department = {};

  department[CONFIG.COLUMNS.DEPARTMENT_NAME] = "Cyber Security";
  department[CONFIG.COLUMNS.DEPARTMENT_CODE] = "CYB";
  department[CONFIG.COLUMNS.STATUS] = "Active";

  var result = DepartmentService.createDepartment(
      department,
      "System"
  );

  Logger.log(JSON.stringify(result));
}
function testDepartmentService() {

  var departmentId = "DEP003";

  Logger.log("======================================");
  Logger.log("TEST 1 : CREATE DEPARTMENT");
  Logger.log("======================================");

  var department = {};

  department[CONFIG.COLUMNS.DEPARTMENT_NAME] = "Cyber Security";
  department[CONFIG.COLUMNS.DEPARTMENT_CODE] = "CYB";
  department[CONFIG.COLUMNS.STATUS] = "Active";

  var result = DepartmentService.createDepartment(
    department,
    "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);

    if (result.department) {
      Logger.log(JSON.stringify(result.department));
      departmentId = result.department[CONFIG.COLUMNS.DEPARTMENT_ID];
    }
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("======================================");
  Logger.log("TEST 2 : UPDATE DEPARTMENT");
  Logger.log("======================================");

  var updateData = {};

  updateData[CONFIG.COLUMNS.DEPARTMENT_NAME] = "Cyber Security Engineering";
  updateData[CONFIG.COLUMNS.DEPARTMENT_CODE] = "CYB01";
  updateData[CONFIG.COLUMNS.STATUS] = "Inactive";

  result = DepartmentService.updateDepartment(
    departmentId,
    updateData,
    "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
    Logger.log(JSON.stringify(result.department));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("======================================");
  Logger.log("TEST 3 : DELETE DEPARTMENT");
  Logger.log("======================================");

  result = DepartmentService.deleteDepartment(
    departmentId,
    "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("======================================");
  Logger.log("TEST 4 : VERIFY SOFT DELETE");
  Logger.log("======================================");

  var dept = DatabaseService.findOne(
    CONFIG.SHEETS.DEPARTMENTS,
    CONFIG.COLUMNS.DEPARTMENT_ID,
    departmentId
  );

  if (dept) {
    Logger.log(JSON.stringify(dept));

    if (dept[CONFIG.COLUMNS.DELETION_FLAG] === true ||
        dept[CONFIG.COLUMNS.DELETION_FLAG] === "TRUE") {

      Logger.log("✅ PASS");
      Logger.log("Deletion Flag = TRUE");

    } else {

      Logger.log("❌ FAIL");
      Logger.log("Deletion Flag = " + dept[CONFIG.COLUMNS.DELETION_FLAG]);

    }
  } else {
    Logger.log("❌ FAIL");
    Logger.log("Department not found.");
  }

  Logger.log("");

  Logger.log("======================================");
  Logger.log("TEST 5 : INVALID DEPARTMENT");
  Logger.log("======================================");

  result = DepartmentService.updateDepartment(
    "DEP999",
    updateData,
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("======================================");
  Logger.log("TEST 6 : DUPLICATE NAME");
  Logger.log("======================================");

  var duplicateData = {};

  duplicateData[CONFIG.COLUMNS.DEPARTMENT_NAME] = "Computer Science and Engineering";

  result = DepartmentService.updateDepartment(
    departmentId,
    duplicateData,
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("======================================");
  Logger.log("TEST 7 : EMPTY UPDATE");
  Logger.log("======================================");

  result = DepartmentService.updateDepartment(
    departmentId,
    {},
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("======================================");
  Logger.log("DEPARTMENT SERVICE TEST COMPLETED");
  Logger.log("======================================");

}
function debugDeletedDepartment() {

  var all = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS);

  all.forEach(function(row){

    if(row[CONFIG.COLUMNS.DEPARTMENT_ID] == "DEP003"){
      Logger.log(JSON.stringify(row));
    }

  });

}
function testActivateDepartment() {

  Logger.log("==================================");
  Logger.log("TEST 1 : ACTIVATE DEPARTMENT");
  Logger.log("==================================");

  var result = DepartmentService.activateDepartment(
    "DEP003",
    "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
    Logger.log(JSON.stringify(result.department));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : ALREADY ACTIVE");
  Logger.log("==================================");

  result = DepartmentService.activateDepartment(
    "DEP003",
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : INVALID DEPARTMENT");
  Logger.log("==================================");

  result = DepartmentService.activateDepartment(
    "DEP999",
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("ACTIVATE DEPARTMENT TEST COMPLETED");
  Logger.log("==================================");

}
function debugDepartmentStatus() {

  var rows = DatabaseService.readAllRows(CONFIG.SHEETS.DEPARTMENTS);

  rows.forEach(function(row){

    Logger.log(
      row[CONFIG.COLUMNS.DEPARTMENT_ID] + " | " +
      row[CONFIG.COLUMNS.STATUS] + " | " +
      row[CONFIG.COLUMNS.DELETION_FLAG]
    );

  });

}
function testDeactivateDepartment() {

  Logger.log("==================================");
  Logger.log("TEST 1 : DEACTIVATE DEPARTMENT");
  Logger.log("==================================");

  var result = DepartmentService.deactivateDepartment(
    "DEP-001",
    "System"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
    Logger.log(JSON.stringify(result.department));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : VERIFY STATUS");
  Logger.log("==================================");

  var dept = DatabaseService.findOne(
    CONFIG.SHEETS.DEPARTMENTS,
    CONFIG.COLUMNS.DEPARTMENT_ID,
    "DEP-001"
  );

  if (dept) {
    Logger.log("Status : " + dept[CONFIG.COLUMNS.STATUS]);

    if (dept[CONFIG.COLUMNS.STATUS] === CONFIG.DEPARTMENT_STATUS.INACTIVE) {
      Logger.log("✅ PASS");
    } else {
      Logger.log("❌ FAIL");
    }
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : ALREADY INACTIVE");
  Logger.log("==================================");

  result = DepartmentService.deactivateDepartment(
    "DEP-001",
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 4 : INVALID DEPARTMENT");
  Logger.log("==================================");

  result = DepartmentService.deactivateDepartment(
    "DEP999",
    "System"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("DEACTIVATE DEPARTMENT TEST COMPLETED");
  Logger.log("==================================");

}
function testGetDepartmentById() {

  Logger.log("==================================");
  Logger.log("TEST 1 : VALID DEPARTMENT");
  Logger.log("==================================");

  var result = DepartmentService.getDepartmentById("DEP-001");

  if(result.success){
    Logger.log("✅ PASS");
    Logger.log(result.message);
    Logger.log(JSON.stringify(result.department));
  }else{
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : INVALID DEPARTMENT");
  Logger.log("==================================");

  result = DepartmentService.getDepartmentById("DEP999");

  if(!result.success){
    Logger.log("✅ PASS");
    Logger.log(result.message);
  }else{
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : EMPTY ID");
  Logger.log("==================================");

  result = DepartmentService.getDepartmentById("");

  if(!result.success){
    Logger.log("✅ PASS");
    Logger.log(result.message);
  }else{
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("GET DEPARTMENT BY ID TEST COMPLETED");
  Logger.log("==================================");

}
function testGetDepartmentByName() {

  Logger.log("==================================");
  Logger.log("TEST 1 : VALID DEPARTMENT");
  Logger.log("==================================");

  var result = DepartmentService.getDepartmentByName(
    "Computer Science and Engineering"
  );

  if (result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
    Logger.log(JSON.stringify(result.department));
  } else {
    Logger.log("❌ FAIL");
    Logger.log(result.message);
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : INVALID DEPARTMENT");
  Logger.log("==================================");

  result = DepartmentService.getDepartmentByName(
    "XYZ Department"
  );

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : EMPTY NAME");
  Logger.log("==================================");

  result = DepartmentService.getDepartmentByName("");

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("GET DEPARTMENT BY NAME TEST COMPLETED");
  Logger.log("==================================");

}
function testGetAllDepartments() {

  Logger.log("==================================");
  Logger.log("TEST : GET ALL DEPARTMENTS");
  Logger.log("==================================");

  var result = DepartmentService.getAllDepartments();

  if (result.success) {

    Logger.log("✅ PASS");
    Logger.log(result.message);
    Logger.log("Total Departments : " + result.totalRecords);

    result.departments.forEach(function(dept) {
      Logger.log(
        dept[CONFIG.COLUMNS.DEPARTMENT_ID] +
        " | " +
        dept[CONFIG.COLUMNS.DEPARTMENT_NAME] +
        " | " +
        dept[CONFIG.COLUMNS.STATUS]
      );
    });

  } else {

    Logger.log("❌ FAIL");
    Logger.log(result.message);

  }

  Logger.log("");
  Logger.log("==================================");
  Logger.log("GET ALL DEPARTMENTS TEST COMPLETED");
  Logger.log("==================================");

}
function testPaginateDepartments() {

  Logger.log("==================================");
  Logger.log("TEST 1 : PAGE 1");
  Logger.log("==================================");

  var result = DepartmentService.paginateDepartments(1, 3);

  if (result.success) {

    Logger.log("✅ PASS");
    Logger.log(result.message);

    var data = result.data || result;

    Logger.log("Total Records : " + data.totalRecords);
    Logger.log("Current Page  : " + data.currentPage);
    Logger.log("Total Pages   : " + data.totalPages);

    data.items.forEach(function(dept) {

      Logger.log(
        dept[CONFIG.COLUMNS.DEPARTMENT_ID] +
        " | " +
        dept[CONFIG.COLUMNS.DEPARTMENT_NAME]
      );

    });

  } else {

    Logger.log("❌ FAIL");
    Logger.log(result.message);

  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : INVALID PAGE");
  Logger.log("==================================");

  result = DepartmentService.paginateDepartments(0, 5);

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : INVALID PAGE SIZE");
  Logger.log("==================================");

  result = DepartmentService.paginateDepartments(1, 0);

  if (!result.success) {
    Logger.log("✅ PASS");
    Logger.log(result.message);
  } else {
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("PAGINATION TEST COMPLETED");
  Logger.log("==================================");

}
function testSortDepartments() {

  Logger.log("==================================");
  Logger.log("TEST 1 : SORT BY NAME ASC");
  Logger.log("==================================");

  var result = DepartmentService.sortDepartments(
    CONFIG.COLUMNS.DEPARTMENT_NAME,
    "asc"
  );

  if (result.success) {

    Logger.log("✅ PASS");
    Logger.log(result.message);

    var data = result.data || result;

    data.departments.forEach(function(dept){

      Logger.log(
        dept[CONFIG.COLUMNS.DEPARTMENT_NAME]
      );

    });

  } else {

    Logger.log("❌ FAIL");
    Logger.log(result.message);

  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : SORT BY NAME DESC");
  Logger.log("==================================");

  result = DepartmentService.sortDepartments(
    CONFIG.COLUMNS.DEPARTMENT_NAME,
    "desc"
  );

  if(result.success){
    Logger.log("✅ PASS");
    Logger.log(result.message);
  }else{
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : SORT BY STATUS");
  Logger.log("==================================");

  result = DepartmentService.sortDepartments(
    CONFIG.COLUMNS.STATUS,
    "asc"
  );

  if(result.success){
    Logger.log("✅ PASS");
    Logger.log(result.message);
  }else{
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 4 : INVALID COLUMN");
  Logger.log("==================================");

  result = DepartmentService.sortDepartments(
    "XYZ",
    "asc"
  );

  if(!result.success){
    Logger.log("✅ PASS");
    Logger.log(result.message);
  }else{
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("SORT DEPARTMENTS TEST COMPLETED");
  Logger.log("==================================");

}
function testSortDepartments() {

  Logger.log("==================================");
  Logger.log("TEST 1 : SORT BY NAME ASC");
  Logger.log("==================================");

  var result = DepartmentService.sortDepartments(
    CONFIG.COLUMNS.DEPARTMENT_NAME,
    "asc"
  );

  if (result.success) {

    Logger.log("✅ PASS");
    Logger.log(result.message);

    var data = result.data || result;

    data.departments.forEach(function(dept){

      Logger.log(
        dept[CONFIG.COLUMNS.DEPARTMENT_NAME]
      );

    });

  } else {

    Logger.log("❌ FAIL");
    Logger.log(result.message);

  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 2 : SORT BY NAME DESC");
  Logger.log("==================================");

  result = DepartmentService.sortDepartments(
    CONFIG.COLUMNS.DEPARTMENT_NAME,
    "desc"
  );

  if(result.success){
    Logger.log("✅ PASS");
    Logger.log(result.message);
  }else{
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 3 : SORT BY STATUS");
  Logger.log("==================================");

  result = DepartmentService.sortDepartments(
    CONFIG.COLUMNS.STATUS,
    "asc"
  );

  if(result.success){
    Logger.log("✅ PASS");
    Logger.log(result.message);
  }else{
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("TEST 4 : INVALID COLUMN");
  Logger.log("==================================");

  result = DepartmentService.sortDepartments(
    "XYZ",
    "asc"
  );

  if(!result.success){
    Logger.log("✅ PASS");
    Logger.log(result.message);
  }else{
    Logger.log("❌ FAIL");
  }

  Logger.log("");

  Logger.log("==================================");
  Logger.log("SORT DEPARTMENTS TEST COMPLETED");
  Logger.log("==================================");

}

function runDepartmentServiceUnitTests() {
  Logger.log('--- Running DepartmentServiceUnitTests ---');
  testDepartmentService();
  testGetAllDepartments();
  testPaginateDepartments();
  Logger.log('--- DepartmentServiceUnitTests Completed ---');
}