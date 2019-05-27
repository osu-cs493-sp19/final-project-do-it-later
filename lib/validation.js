/*
 * If an object has a truthy field, then it is considered to have that field.
 * If an object has a falsy field that is in the following set:
 * - false
 * - 0
 * then it is considered to have that field.
 *
 * Returns true if  obj  is considered to have  field .
 * Returns false otherwise.
 *
 * Assume that  obj  is a valid JavaScript object.
 */
function objHasField(obj, field) {
  return obj[field] || obj[field] === false || obj[field] === 0;
}

/*
 * Performs data validation on an object by verifying that it contains
 * all required fields specified in a given schema.
 *
 * Returns true if the object is valid agianst the schema and false otherwise.
 */
exports.validateAgainstSchema = function (obj, schema) {
  return obj && Object.keys(schema).every(
    field => !schema[field].required || objHasField(obj, field)
  );
};

/*
 * Extracts all fields from an object that are valid according to a specified
 * schema.  Extracted fields can be either required or optional.
 *
 * Returns a new object containing all valid fields extracted from the
 * original object.
 */
exports.extractValidFields = function (obj, schema) {
  let validObj = {};

  if (obj) {
    Object.keys(schema).forEach((field) => {
      if (objHasField(obj, field)) {
        validObj[field] = obj[field];
      }
    });
  }

  return validObj;
};
