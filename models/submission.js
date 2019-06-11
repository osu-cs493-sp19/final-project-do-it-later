const mysqlPool = require('../lib/mysqlPool');
const { extractValidFields } = require('../lib/validation');

const SubmissionSchema = {
  assignment_id: { required: true },
  student_id: { required: true },
  timestamp: { required: true },
  file: { required: true },
}
exports.SubmissionSchema = SubmissionSchema;

function getSubmissionById(id) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM submissions WHERE id = ?',
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
exports.getSubmissionById = getSubmissionById;

function insertNewSubmission(submission) {
  return new Promise((resolve, reject) => {
    submission = extractValidFields(submission, SubmissionSchema);
    submission.id = null;
    mysqlPool.query(
      'INSERT INTO submissions SET ?',
      submission,
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
exports.insertNewSubmission = insertNewSubmission;

function deleteSubmissionByAssignmentId(assignment_id) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'DELETE FROM submissions WHERE assignment_id = ?',
      [ assignment_id ],
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
exports.deleteSubmissionByAssignmentId = deleteSubmissionByAssignmentId;
