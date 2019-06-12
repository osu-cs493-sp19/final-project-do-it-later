const mysqlPool = require('../lib/mysqlPool');
const { extractValidFields } = require('../lib/validation');

const fs = require('fs');
const { ObjectId, GridFSBucket } = require('mongodb');
const { getDBReference } = require('../lib/mongo');

const SubmissionSchema = {
  assignment_id: { required: true },
  student_id: { required: true },
  timestamp: { required: true },
  file: { required: true },
}
exports.SubmissionSchema = SubmissionSchema;

function getSubmissionsCount() {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT COUNT(*) AS count FROM submissions',
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results[0].count);
        }
      }
    );
  });
}

function getSubmissionsPage(page) {
  return new Promise(async (resolve, reject) => {
    /*
     * Compute last page number and make sure page is within allowed bounds.
     * Compute offset into collection.
     */
    const count = await getSubmissionsCount();
    const pageSize = 10; // TODO: Refactor to taking value from a environment variable
    const lastPage = Math.ceil(count / pageSize);
    page = page > lastPage ? lastPage : page;
    page = page < 1 ? 1 : page;
    const offset = (page - 1) * pageSize;

    mysqlPool.query(
      'SELECT * FROM submissions ORDER BY id LIMIT ?,?',
      [ offset, pageSize ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            submissions: results,
            page: page,
            totalPages: lastPage,
            pageSize: pageSize,
            count: count
          });
        }
      }
    );
  });
}
exports.getSubmissionsPage = getSubmissionsPage;

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

/*
 * Executes a DB query to insert a new submission file into the database.  Returns
 * a Promise that resolves to the ID of the newly-created submission file entry.
 */

exports.saveSubmissionFile = function (file) {
  return new Promise((resolve, reject) => {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    const metadata = {
      contentType: file.contentType,
    };

    const uploadStream = bucket.openUploadStream(
      file.filename,
      { metadata: metadata }
    );

    fs.createReadStream(file.path)
      .pipe(uploadStream)
      .on('error', (err) => {
        reject(err);
      })
      .on('finish', (result) => {
        resolve(result._id);
      });
  });
};

exports.getDownloadStreamByFilename = function (filename) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'files' });
  return bucket.openDownloadStreamByName(filename);
};

// function removeFileByFilename(filename) {
//   const db = getDBReference();
//   const bucket = new GridFSBucket(db, { bucketName: 'files' });
//   return new Promise((resolve, reject) => {
//     bucket.delete(filename, (err) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(true);
//         }
//       }
//     );
//   });
// }
// exports.removeFileByFilename = removeFileByFilename;
