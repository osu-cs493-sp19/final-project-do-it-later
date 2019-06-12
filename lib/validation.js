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
 * Performs data validation on an object by verifying that it contains at least
 * one field specified in a given schema. It does not matter if that field is
 * required or not. As long as this "patch" object has a field which the schema
 * also has, then this object is valid.
 *
 * Returns true if the object is valid against the schema and false otherwise.
 */
exports.validatePatchAgainstSchema = (patchObj, schema) => {
  return patchObj &&
      Object.keys(patchObj).some(field =>
        objHasField(patchObj, field) && schema[field]
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
