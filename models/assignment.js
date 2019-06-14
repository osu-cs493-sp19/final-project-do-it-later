const mysqlPool = require('../lib/mysqlPool');
const { extractValidFields } = require('../lib/validation');

const AssignmentSchema = {
  course_id: { required: true },
  title: { required: true },
  points: { required: true },
  due: { required: true },
}
exports.AssignmentSchema = AssignmentSchema;

const AssignmentPatchSchema = {
  course_id: { required: false },
  title: { required: false },
  points: { required: false },
  due: { required: false },
}
exports.AssignmentPatchSchema = AssignmentPatchSchema;

/*
 * Executes a MySQL query to fetch a single specified assignment based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * assignment.  If no assignment with the specified ID exists, the returned Promise
 * will resolve to null.
 */
function getAssignmentById(id) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM assignments WHERE id = ?',
      [ id ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results[0]);
        }
      }
    );
  });
}
exports.getAssignmentById = getAssignmentById;

/*
 * Executes a MySQL query to insert a new assignment into the database.  Returns
 * a Promise that resolves to the ID of the newly-created assignment entry.
 */
function insertNewAssignment(assignment) {
  return new Promise((resolve, reject) => {
    assignment = extractValidFields(assignment, AssignmentSchema);
    assignment.id = null;
    mysqlPool.query(
      'INSERT INTO assignments SET ?',
      assignment,
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      }
    );
  });
}
exports.insertNewAssignment = insertNewAssignment;

/*
 * Executes a MySQL query to replace a specified assignment with new data.
 * Returns a Promise that resolves to true if the assignment specified by
 * `id` existed and was successfully updated or to false otherwise.
 */
function replaceAssignmentById(id, assignment) {
  return new Promise((resolve, reject) => {
    assignment = extractValidFields(assignment, AssignmentSchema);
    mysqlPool.query(
      'UPDATE assignments SET ? WHERE id = ?',
      [ assignment, id ],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.affectedRows > 0);
        }
      }
    );
  });
}
exports.replaceAssignmentById = replaceAssignmentById;

/*
 * Executes a MySQL query to delete a assignment specified by its ID.  Returns
 * a Promise that resolves to true if the assignment specified by `id`
 * existed and was successfully deleted or to false otherwise.
 */
function deleteAssignmentById(id) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'DELETE FROM assignments WHERE id = ?',
      [ id ],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.affectedRows > 0);
        }
      }
    );
  });
}
exports.deleteAssignmentById = deleteAssignmentById;
