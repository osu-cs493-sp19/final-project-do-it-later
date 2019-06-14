const fs = require('fs');
const { ObjectId, GridFSBucket } = require('mongodb');
const { getDBReference } = require('../lib/mongo');

const SubmissionSchema = {
  assignment_id: { required: true },
  student_id: { required: true },
  timestamp: { required: true },
}
exports.SubmissionSchema = SubmissionSchema;

async function getAllSubmissions() {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'files' });
  const results = await bucket.find({}).toArray();;
  //console.log('====== getAllSubmissions: results: ', results);
  return {
    submissions: results
  };
}
exports.getAllSubmissions = getAllSubmissions;

function countSubmissions() {
  return Promise
}

async function getSubmissionsPage(page) {
  //console.log('====== getSubmissionsPage: input page: ', page);
  const db = getDBReference();

  const bucket = new GridFSBucket(db, { bucketName: 'files' });
  //console.log('====== getSubmissionsPage: bucket: ', bucket);
  const count = await bucket.find({}).count();
  //console.log('====== getSubmissionsPage: count: ', count);

  /*
   * Compute last page number and make sure page is within allowed bounds.
   * Compute offset into collection.
   */
  const pageSize = parseInt(process.env.PAGINATION_PAGE_SIZE) || 3;
  const lastPage = Math.ceil(count / pageSize);
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  // console.log('====== getSubmissionsPage: lastPage: ', lastPage);
  // console.log('====== getSubmissionsPage: page: ', page);
  // console.log('====== getSubmissionsPage: offset: ', offset);

  const results = await bucket.find({})
    .sort({ _id: 1 })
    .skip(offset)
    .limit(pageSize)
    .toArray();

  return {
    submissions: results,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    count: count
  };
}
exports.getSubmissionsPage = getSubmissionsPage;

/*
 * Executes a DB query to insert a new submission file into the database.  Returns
 * a Promise that resolves to the ID of the newly-created submission file entry.
 */

exports.insertSubmission = function (file) {
  return new Promise((resolve, reject) => {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    const metadata = {
      // file metadata
      contentType: file.contentType,
      // submission metadata
      assignment_id: file.assignment_id,
      student_id: file.student_id,
      timestamp: file.timestamp,
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

async function getSubmissionById(id) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'files' });
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket
      .find({ _id: new ObjectId(id) })
      .toArray();
    return results[0];
  }
}
exports.getSubmissionById = getSubmissionById;

async function getSubmissionByAssignmentId(assignment_id) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'files' });

  const results = await bucket
    .find({ "metadata.assignment_id": assignment_id })
    .toArray();
  return results;
}

async function deleteSubmissionByAssignmentId(assignment_id) {
  submissions = await getSubmissionByAssignmentId(assignment_id);
  //console.log('== deleting the following submissions: ');
  //console.log('== ', submissions);
  submissions.forEach(a_submission => {
    console.log('== deleting a_submission._id:', a_submission._id);
    bucket.delete(a_submission._id, (error) => {
      if (err) {
        throw err;
      }
    });
  });
}
exports.deleteSubmissionByAssignmentId = deleteSubmissionByAssignmentId;
