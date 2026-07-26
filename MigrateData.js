/**
 * MigrateData.js
 * Utility functions to migrate existing data from Google Sheets to Supabase tables.
 * Run these functions directly from the Apps Script Editor.
 */

const MigrateData = {
  
  /**
   * Reads data from a specific sheet and returns an array of objects mapped by header names.
   */
  readSheetData: function(logicalKey) {
    var sheet = DatabaseService.getSheet(logicalKey);
    if (!sheet) {
      Logger.log("❌ Sheet not found for logical key: " + logicalKey);
      return [];
    }
    
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      Logger.log("⚠️ No data rows found in sheet: " + logicalKey);
      return [];
    }
    
    var headers = values[0];
    var records = [];
    
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var record = {};
      var isEmpty = true;
      
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        if (header) {
          var val = row[j];
          record[header] = val;
          if (val !== "" && val !== null && val !== undefined) {
            isEmpty = false;
          }
        }
      }
      
      if (!isEmpty) {
        records.push(record);
      }
    }
    
    return records;
  },

  /**
   * Migrates a specific sheet table to Supabase.
   */
  migrateTable: function(logicalKey) {
    Logger.log("⏳ Starting migration for table: " + logicalKey);
    
    try {
      var records = this.readSheetData(logicalKey);
      Logger.log("📋 Read " + records.length + " records from Google Sheets for " + logicalKey);
      
      if (records.length === 0) {
        Logger.log("⏭️ Skipping " + logicalKey + " (no data)");
        return { success: true, count: 0 };
      }
      
      // Clean target table first or handle duplicate prevention?
      // Since we map IDs, postgREST POST requests will perform insert.
      // We can insert in batches of 100 to avoid request size limits.
      var batchSize = 100;
      var totalInserted = 0;
      
      for (var i = 0; i < records.length; i += batchSize) {
        var batch = records.slice(i, i + batchSize);
        var result = DatabaseService.insertRows(logicalKey, batch);
        totalInserted += result.length;
        Logger.log("  Uploaded batch " + (Math.floor(i / batchSize) + 1) + ": " + result.length + " rows inserted.");
      }
      
      Logger.log("✅ Successfully migrated " + totalInserted + " records to " + logicalKey);
      return { success: true, count: totalInserted };
    } catch (e) {
      Logger.log("❌ Error migrating table " + logicalKey + ": " + e.message + "\n" + e.stack);
      return { success: false, error: e.message };
    }
  },

  /**
   * Migrate departments first, followed by users/coordinators and students.
   */
  runFullMigration: function() {
    Logger.log("🚀 Starting Full Google Sheets -> Supabase Migration");
    
    var tablesToMigrate = [
      "DEPARTMENTS",
      "USERS",
      "STUDENTS",
      "EVENTS",
      "EVENT_PARTICIPANTS",
      "EVENT_COORDINATORS",
      "ATTENDANCE"
    ];
    
    var results = {};
    
    for (var i = 0; i < tablesToMigrate.length; i++) {
      var table = tablesToMigrate[i];
      results[table] = this.migrateTable(table);
    }
    
    Logger.log("=== Migration Summary ===");
    for (var table in results) {
      var res = results[table];
      if (res.success) {
        Logger.log("✅ " + table + ": " + res.count + " records migrated.");
      } else {
        Logger.log("❌ " + table + " FAILED: " + res.error);
      }
    }
    
    return results;
  }
};

/**
 * Global entry point function to execute the migration from Apps Script Editor.
 */
function runDataMigration() {
  return MigrateData.runFullMigration();
}
