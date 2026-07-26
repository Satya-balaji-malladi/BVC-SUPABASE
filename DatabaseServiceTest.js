function testGetSheet() {

  Logger.log("===== TEST : getSheet =====");

  const sheets = [
  "USERS",
  "STUDENTS",
  "DEPARTMENTS",
  "EVENTS",
  "EVENT_PARTICIPANTS",
  "EVENT_COORDINATORS",
  "ATTENDANCE",
  "SESSIONS"
];

  sheets.forEach(function(sheetName) {

    const sheet = DatabaseService.getSheet(sheetName);

    if(sheet){
      Logger.log("✅ " + sheetName + " : PASS");
    }else{
      Logger.log("❌ " + sheetName + " : FAIL");
    }

  });

}
function testGetHeaderRow() {

  Logger.log("===== TEST : getHeaderRow =====");

  const sheets = [
    "USERS",
    "STUDENTS",
    "DEPARTMENTS",
    "EVENTS",
    "EVENT_PARTICIPANTS",
    "EVENT_COORDINATORS",
    "ATTENDANCE",
    "SESSIONS"
  ];

  sheets.forEach(function(sheetName){

    const headers = DatabaseService.getHeaderRow(sheetName);

    if(headers && headers.length > 0){
      Logger.log("✅ " + sheetName + " : PASS");
      Logger.log("Headers : " + headers.join(", "));
    }else{
      Logger.log("❌ " + sheetName + " : FAIL");
    }

  });

}
function testReadAllRows() {

  Logger.log("===== TEST : readAllRows =====");

  const sheets = [
    "USERS",
    "STUDENTS",
    "DEPARTMENTS",
    "EVENTS",
    "EVENT_PARTICIPANTS",
    "EVENT_COORDINATORS",
    "ATTENDANCE",
    "SESSIONS"
  ];

  sheets.forEach(function(sheetName){

    const rows = DatabaseService.readAllRows(sheetName);

    Logger.log(sheetName + " : " + rows.length + " records");

    if(Array.isArray(rows)){
      Logger.log("✅ PASS");
    }else{
      Logger.log("❌ FAIL");
    }

  });

}
function testFindOne() {

  Logger.log("===== TEST : findOne =====");

  const user = DatabaseService.findOne(
      "USERS",
      "Username",
      "jdoe"
  );

  if(user){
      Logger.log("✅ PASS");
      Logger.log("User Found : " + user["First Name"]);
  }else{
      Logger.log("❌ FAIL");
  }

}
function testFirstUser() {

  Logger.log("===== TEST : First User =====");

  const users = DatabaseService.readAllRows("USERS");

  Logger.log(JSON.stringify(users[0]));

}
function testInsertRow() {

  Logger.log("===== TEST : insertRow =====");

 const record = {
    "Employee ID": "EMP999",

    "First Name": "GPT",
    "Last Name": "Tester",
    "Email Address": "gpt@test.com",

    "Username": "gpttester",
    "Password Hash": "hash123",

    "Role": "Coordinator",
    "Status": "Active"
};

  const result = DatabaseService.insertRow("USERS", record);

  if (result) {
    Logger.log("✅ PASS");
    Logger.log(JSON.stringify(result));
  } else {
    Logger.log("❌ FAIL");
  }


}
function testUpdateRow() {

  Logger.log("===== TEST : updateRow =====");

  try {

    const result = DatabaseService.updateRow(
      "USERS",           // Logical Sheet
      "User ID",         // Search Column
      "USR0007",         // User created in previous test
      {
        "First Name": "GPT Updated",
        "Last Name": "Tester Updated",
        "Status": "Inactive"
      }
    );

    if (result) {
      Logger.log("✅ PASS");
      Logger.log(JSON.stringify(result));
    } else {
      Logger.log("❌ FAIL");
    }

  } catch (e) {

    Logger.log("❌ EXCEPTION");
    Logger.log(e.message);

  }

}
function testGetUpdatedUser() {

  Logger.log("===== TEST : Get Updated User =====");

  const user = DatabaseService.findOne(
      "USERS",
      "User ID",
      "USR0007"
  );

  Logger.log(JSON.stringify(user));

}
function testDeleteRow() {

  Logger.log("===== TEST : deleteRow =====");

  try {

    const result = DatabaseService.deleteRow(
      "USERS",
      "User ID",
      "USR0010"
    );

    if (result) {
      Logger.log("✅ PASS");
    } else {
      Logger.log("❌ FAIL");
    }

    // Verify deletion
    const user = DatabaseService.findOne(
      "USERS",
      "User ID",
      "USR0010"
    );

    if (!user) {
      Logger.log("✅ Record successfully deleted.");
    } else {
      Logger.log("❌ Record still exists.");
    }

  } catch (e) {
    Logger.log("❌ EXCEPTION");
    Logger.log(e.message);
  }

}
function testDeletedUser() {

  Logger.log("===== TEST : Deleted User =====");

  const user = DatabaseService.findOne(
    "USERS",
    "User ID",
    "USR0009  "
  );

  Logger.log(JSON.stringify(user));

}
function testGenerateNextId(){

  Logger.log("===== TEST : generateNextId =====");

  const id = DatabaseService.generateNextId("USERS");

  Logger.log("Generated ID : " + id);

}
function testCache(){

  Logger.log("===== TEST : Cache =====");

  const start = new Date().getTime();

  DatabaseService.readAllRows("USERS");
  DatabaseService.readAllRows("USERS");

  const end = new Date().getTime();

  Logger.log("Execution Time : " + (end-start) + " ms");

}

function runDatabaseServiceUnitTests() {
  Logger.log('--- Running DatabaseServiceUnitTests ---');
  testGetSheet();
  testGetHeaderRow();
  testReadAllRows();
  testFindOne();
  testGenerateNextId();
  testCache();
  Logger.log('--- DatabaseServiceUnitTests Completed ---');
}