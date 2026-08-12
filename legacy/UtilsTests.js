/**
 * ==========================================================
 * UtilsTests.gs
 * ==========================================================
 * Tests Utils helper functions (No DB Calls)
 */

var UtilsTests = {

  run: function () {

    var results = [];

    TestLogger.section("UTILS TESTS");

    results.push(this.testPadNumber());
    results.push(this.testIsEmpty());
    results.push(this.testTrimText());
    results.push(this.testCapitalizeWords());
    results.push(this.testToUpper());
    results.push(this.testToLower());
    results.push(this.testNormalizeWhitespace());
    results.push(this.testGenerateUUID());
    results.push(this.testGenerateUsername());
    results.push(this.testHashString());
    results.push(this.testCompareHash());
    results.push(this.testGenerateOTP());
    results.push(this.testMaskEmail());
    results.push(this.testMaskPhone());
    results.push(this.testDeepClone());
    results.push(this.testIsObject());
    results.push(this.testIsArray());
    results.push(this.testMergeObjects());
    results.push(this.testSafeParseJSON());
    results.push(this.testSafeStringify());
    results.push(this.testRemoveEmptyProperties());
    results.push(this.testUniqueArray());
    results.push(this.testBuildResponse());
    results.push(this.testBuildSuccessResponse());
    results.push(this.testBuildErrorResponse());
    results.push(this.testFormatCurrency());
    results.push(this.testFormatPercentage());

    return results;
  },

  testPadNumber: function () {
    TestAssertions.assertEquals("005", Utils.padNumber(5,3));
    return "padNumber()";
  },

  testIsEmpty: function () {
    TestAssertions.assertTrue(Utils.isEmpty(""));
    TestAssertions.assertFalse(Utils.isEmpty("ABC"));
    return "isEmpty()";
  },

  testTrimText: function () {
    TestAssertions.assertEquals("hello", Utils.trimText(" hello "));
    return "trimText()";
  },

  testCapitalizeWords: function () {
    TestAssertions.assertEquals("Hello World", Utils.capitalizeWords("hello world"));
    return "capitalizeWords()";
  },

  testToUpper: function () {
    TestAssertions.assertEquals("HELLO", Utils.toUpper("hello"));
    return "toUpper()";
  },

  testToLower: function () {
    TestAssertions.assertEquals("hello", Utils.toLower("HELLO"));
    return "toLower()";
  },

  testNormalizeWhitespace: function () {
    TestAssertions.assertEquals("Hello World", Utils.normalizeWhitespace("Hello     World"));
    return "normalizeWhitespace()";
  },

  testGenerateUUID: function () {
    TestAssertions.assertTrue(Utils.generateUUID().length > 10);
    return "generateUUID()";
  },

  testGenerateUsername: function () {
    TestAssertions.assertEquals("malladisatyabalaji", Utils.generateUsername("Malladi Satya Balaji"));
    return "generateUsername()";
  },

  testHashString: function () {
    TestAssertions.assertTrue(Utils.hashString("abc").length > 20);
    return "hashString()";
  },

  testCompareHash: function () {
    var hash = Utils.hashString("admin123");
    TestAssertions.assertTrue(Utils.compareHash("admin123", hash));
    return "compareHash()";
  },

  testGenerateOTP: function () {
    TestAssertions.assertEquals(6, Utils.generateOTP().length);
    return "generateOTP()";
  },

  testMaskEmail: function () {
    TestAssertions.assertTrue(Utils.maskEmail("abc@gmail.com").indexOf("*") > -1);
    return "maskEmail()";
  },

  testMaskPhone: function () {
    TestAssertions.assertTrue(Utils.maskPhone("9876543210").indexOf("*") > -1);
    return "maskPhone()";
  },

  testDeepClone: function () {
    var obj = {a:1};
    var copy = Utils.deepClone(obj);
    TestAssertions.assertEquals(1, copy.a);
    return "deepClone()";
  },

  testIsObject: function () {
    TestAssertions.assertTrue(Utils.isObject({}));
    return "isObject()";
  },

  testIsArray: function () {
    TestAssertions.assertTrue(Utils.isArray([]));
    return "isArray()";
  },

  testMergeObjects: function () {
    var obj = Utils.mergeObjects({a:1},{b:2});
    TestAssertions.assertEquals(2,obj.b);
    return "mergeObjects()";
  },

  testSafeParseJSON: function () {
    var obj = Utils.safeParseJSON('{"a":1}');
    TestAssertions.assertEquals(1,obj.a);
    return "safeParseJSON()";
  },

  testSafeStringify: function () {
    var str = Utils.safeStringify({a:1});
    TestAssertions.assertTrue(str.indexOf("a")>-1);
    return "safeStringify()";
  },

  testRemoveEmptyProperties: function () {
    var obj = Utils.removeEmptyProperties({
      a:1,
      b:"",
      c:null
    });

    TestAssertions.assertTrue(obj.a===1);
    TestAssertions.assertTrue(obj.b===undefined);
    return "removeEmptyProperties()";
  },

  testUniqueArray: function () {
    var arr = Utils.uniqueArray([1,1,2,2,3]);
    TestAssertions.assertEquals(3,arr.length);
    return "uniqueArray()";
  },

  testBuildResponse: function () {
    var r = Utils.buildResponse(true,"OK");
    TestAssertions.assertTrue(r.success);
    return "buildResponse()";
  },

  testBuildSuccessResponse: function () {
    var r = Utils.buildSuccessResponse("Done");
    TestAssertions.assertTrue(r.success);
    return "buildSuccessResponse()";
  },

  testBuildErrorResponse: function () {
    var r = Utils.buildErrorResponse("Error");
    TestAssertions.assertFalse(r.success);
    return "buildErrorResponse()";
  },

  testFormatCurrency: function () {
    TestAssertions.assertEquals("₹100.00", Utils.formatCurrency(100));
    return "formatCurrency()";
  },

  testFormatPercentage: function () {
    TestAssertions.assertEquals("10.00%", Utils.formatPercentage(10));
    return "formatPercentage()";
  }

};