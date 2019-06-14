/*
 * Performs data validation on an object by verifying that it contains
 * all **required** fields specified in a given schema.
 *
 * Returns true if the object is valid against the schema and false otherwise.
 *
 * Notes:
 * - If a field is _not_ required by the schema, then it doesn't matter if the
 * object has that field or not---it will be a valid case.
 * - If a field is required by the schema, then the object must "have" it for
 * this case to be valid.
 * - The definition of an object "having" a field is defined by the
 * `objHasField()` helper function below.
 * - This function won't care if the provided object has extra fields that are
 * not in the schema, as filtering out those field is the job of the
 * `extractValidFields()` function.
 *
 * It is strongly recommended to use this function to validate a request body
 * **before** extracting valid fields out of it.
 */
function validateAgainstSchema(obj, schema) {
  return obj && Object.keys(schema).every(field =>
    !schema[field].required || objectHasField(obj, field)
  );
}
exports.validateAgainstSchema = validateAgainstSchema;

/*
 * Performs data validation on an object by verifying that it contains
 * **at least one** field specified in a given schema.
 *
 * Returns true if the object is valid against the schema and false otherwise.
 *
 * Notes:
 * - It does not matter if the field is required by the schema or not. If the
 * object and the schema both "have" that field, then it is a valid case.
 * - The definition of an object "having" a field is defined by the
 * `objHasField()` helper function below.
 * - This function won't care if the provided object has extra fields that are
 * not in the schema, as filtering out those field is the job of the
 * `extractValidFields()` function.
 *
 * It is strongly recommended to use this function to validate a PATCH request
 * body **before** extracting valid fields out of it.
 */
function validatePatchAgainstSchema(patchObj, schema) {
  return (
    patchObj &&
    Object.keys(patchObj).some(field =>
      schema[field] && objectHasField(patchObj, field)
    )
  );
}
exports.validatePatchAgainstSchema = validatePatchAgainstSchema;

/*
 * Extracts all fields from an object that are valid according to a specified
 * schema. Extracted fields can be either required or optional.
 * Simply put, this function will intersect the provided object with the schema.
 *
 * Returns a new object containing all valid fields extracted from the original
 * object.
 */
function extractValidFields(obj, schema) {
  let validObj = {};
  if (obj) {
    Object.keys(schema).forEach(field => {
      if (objectHasField(obj, field)) {
        validObj[field] = obj[field];
      }
    });
  }
  return validObj;
}
exports.extractValidFields = extractValidFields;

/*
 * If an object has a truthy field, then it is considered to "have" that field.
 * If an object has a falsy field that is in the following set:
 * - false
 * - 0
 * then it is considered to "have" that field.
 *
 * Returns true if the object has the field and false otherwise.
 */
function objectHasField(obj, field) {
  return obj[field] || obj[field] === false || obj[field] === 0;
}
