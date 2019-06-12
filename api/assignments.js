/*
 * API sub-router for assignments collection endpoints.
 */

const router = require('express').Router();
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { validateAgainstSchema, validatePatchAgainstSchema } = require('../lib/validation');
const { requireAuthentication } = require('../lib/auth');

const {
  AssignmentSchema,
  getAssignmentById,
  insertNewAssignment,
  replaceAssignmentById,
  deleteAssignmentById,
} = require('../models/assignment');

// const {
//   getUserById
// } = require('../models/user');

// const {
//   getCourseById
// } = require('../models/course');

const {
  SubmissionSchema,
  getSubmissionById,
  deleteSubmissionByAssignmentId,
  getSubmissionsPage,
  saveSubmissionFile,
  insertNewSubmission,
  getDownloadStreamByFilename
} = require('../models/submission');

/*
 * Route to fetch info about a specific assignment.
 */
router.get('/:id', async (req, res, next) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  try {
    const assignment = await getAssignmentById(parseInt(req.params.id));
    if (assignment) {
      res.status(200).send(assignment);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to fetch assignment.  Please try again later."
    });
    return;
  }
});

/*
 *  Create and store a new Assignment with specified data and adds it to the application's database.
    Only an authenticated User with 'admin' role or an authenticated 'instructor' User
    whose ID matches the instructor_id of the Course corresponding to the Assignment's courseId
    can create an Assignment.
 */
//router.post('/', async (req, res) => {
router.post('/', requireAuthentication, async (req, res) => {
  // Does this POST request had valid body
  if (!validateAgainstSchema(req.body, AssignmentSchema)) {
    res.status(400).send({
      error: "Request body is not a valid assignment object."
    });
    return;
  }

  // Does this user has 'admin' or 'instructor' role?
  const user = await getUserById(req.authenticatedUserId);
  if (user.role != 'admin' && user.role != 'instructor') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource (not admin nor instructor)"
    });
    return;
  }

  // Does this user'id match the `instructor_id` of the Course that owns this assignment?
  const course = await getCourseById(req.body.course_id);
  if (user.id != course.instructor_id) {
    res.status(403).send({
      error: "Unauthorized to access the specified resource (you don't own this course)"
    });
    return;
  }

  // Authorized user
  try {
    const id = await insertNewAssignment(req.body);
    res.status(201).send({
      id: id,
      links: {
        assignment: `/assignments/${id}`,
        course: `/courses/${req.body.course_id}`
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error inserting assignment into DB. Please try again later."
    });
    return;
  }

});

/*  Performs a partial update on the data for the Assignment.
    - Submissions cannot be modified via this endpoint.
    - Only an authenticated User with 'admin' or 'instructor' role
      whose ID matches the `instructor_id` of the Course corresponding to the Assignment
      can update an Assignment.
*/
//router.patch('/:id', async (req, res) => {
router.patch('/:id', requireAuthentication, async (req, res) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Is this PATCH request has valid body?
  // Note that we use `validatePatchAgainstSchema` instead of `validateAgainstSchema`
  //    to make all schema fields optional appearance.
  //    If it has no field, it will not pass either since then req.body is empty
  //    , which is also checked in the validateAgainstSchema() function
  if (!validatePatchAgainstSchema(req.body, AssignmentSchema)) {
    res.status(400).send({
      error: "Request body is not a valid"
    });
    return;
  }

  // Does this user has 'admin' or 'instructor' role?
  const user = await getUserById(req.authenticatedUserId);
  if (user.role != 'admin' && user.role != 'instructor') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are neither admin nor instructor"
    });
    return;
  }

  // Does this user'id match the `instructor_id` of the Course that owns this assignment?
  const course = await getCourseById(assignment.course_id);
  if (user.id != course.instructor_id) {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are not instructor of this course"
    });
    return;
  }

  // Authorized user
  try {
    const id = await replaceAssignmentById(assignment_id, req.body);
    res.status(200).send({
      id: assignment_id,
      links: {
        assignment: `/assignments/${assignment_id}`
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error inserting assignment into DB. Please try again later."
    });
    return;
  }

});

/*  2 mandatory tasks:
    - (1) Completely removes the data for the specified Assignment,
    - (2) Completely removes all submissions.
    Only an authenticated User with 'admin' role or an authenticated 'instructor' User
    whose ID matches the instructor_id of the Course can delete an Assignment.
*/
//router.delete('/:id', async (req, res) => {
router.delete('/:id', requireAuthentication, async (req, res) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Does this user has 'admin' or 'instructor' role?
  const user = getUserById(req.authenticatedUserId);
  if (user.role != 'admin' && user.role != 'instructor') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are neither admin nor instructor"
    });
    return;
  }

  // Does this user'id match the `instructor_id` of the Course that owns this assignment?
  const course = await getCourseById(assignment.course_id);
  if (user.id != course.instructor_id) {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are not instructor of this course"
    });
    return;
  }

  // (1) Remove this assignment from db
  let deleteAssignmentSuccessful = undefined;
  let deleteSubmissionSuccessful = undefined;
  //let deleteSubmissionFileSuccessful = undefined;

  try {
    deleteAssignmentSuccessful = await deleteAssignmentById(assignment_id);
    if (!deleteAssignmentSuccessful) {
      console.error(err);
      res.status(500).send({
        error: "Unable to delete assignment. Please try again later."
      });
      return;
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to delete assignment. Please try again later."
    });
    return;
  }

  // (2) Remove all connected submissions from db

  // -- (2.1) Delete it in MySQL database
  try {
    deleteSubmissionSuccessful = await deleteSubmissionByAssignmentId(assignment_id);
    if (!deleteSubmissionSuccessful) {
      console.error(err);
      res.status(500).send({
        error: "Error(s) removing connected submission(s) of this assignment.  Please try again later."
      });
      return;
    }
    // -- (2.2) Delete it in MongoDB database
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error(s) removing connected submission(s) of this assignment.  Please try again later."
    });
    return;
  }

  // if reach this point, all deletions must have been successful
  res.status(204).end();
});

/*
 * SUBMISSION
 */

/*  Returns the list of all Submissions for an Assignment.
 *  This list should be paginated.
 *  Only an authenticated User with 'admin' role or an 'instructor' role
 *    whose ID matches the instructor_id of the Course corresponding
 *    to the Assignment's courseId can fetch the Submissions for an Assignment.
 */
router.get('/:id/submissions', requireAuthentication, async (req, res, next) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Does this user has 'admin' or 'instructor' role?
  const user = getUserById(req.authenticatedUserId);
  if (user.role != 'admin' && user.role != 'instructor') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are neither admin nor instructor"
    });
    return;
  }

  // Does this user'id match the `instructor_id` of the Course that owns this assignment?
  const course = await getCourseById(assignment.course_id);
  if (user.id != course.instructor_id) {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are not instructor of this course"
    });
    return;
  }

  try {
    /*
     * Fetch page info, generate HATEOAS links for surrounding pages and then
     * send response.
     */
    const submissionPage = await getSubmissionsPage(parseInt(req.query.page) || 1);
    submissionPage.links = {};
    if (submissionPage.page < submissionPage.totalPages) {
      submissionPage.links.nextPage = `/assignments/${assignment_id}/submissions?page=${submissionPage.page + 1}`;
      submissionPage.links.lastPage = `/assignments/${assignment_id}/submissions?page=${submissionPage.totalPages}`;
    }
    if (submissionPage.page > 1) {
      submissionPage.links.prevPage = `/assignments/${assignment_id}/submissions?page=${submissionPage.page - 1}`;
      submissionPage.links.firstPage = '/assignments/${assignment_id}/submissions?page=1';
    }
    res.status(200).send(submissionPage);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error fetching submissions list. Please try again later."
    });
  }
});

/*
 *  Helper functions for uploading submission
 */

const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      const basename = crypto.pseudoRandomBytes(16).toString('hex');
      const extension = path.extname(file.originalname);
      callback(null, `${basename}.${extension}`);
    }
  }),
  // No file type filter. All extensions are allowed
  // fileFilter: (req, file, callback) => {
  //   callback(null, !!imageTypes[file.mimetype])
  // }
});

function removeUploadedFile(file_path) {
  return new Promise((resolve, reject) => {
    fs.unlink(file_path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/*  Create and store a new Submission data to MySQL database
 *    and save its binary data to a separated MongoDB database.
 *  Only an authenticated User with 'student' role who is enrolled in the Course
 *    corresponding to the Assignment's courseId can create a Submission.
 *  Note:
 *    - The actual submissions file are stored in a seperated database
 *      powered by MongoDB while its submission data is stored in the same MySQL database
 *      that we have been using for Users, Courses, and Assignments
 */
router.post('/:id/submissions', requireAuthentication, upload.single('file'), async (req, res, next) => {
  // console.log("== req.file:", req.file);
  // console.log("== req.body:", req.body);

  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Does this POST request had valid body
  if (!req.file || !validateAgainstSchema(req.body, SubmissionSchema)) {
    res.status(400).send({
      error: "Request body is not a valid assignment object."
    });
    return;
  }

  // Is this user a 'student'?
  const user = getUserById(req.authenticatedUserId);
  if (user.role != 'student') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are not a student"
    });
    return;
  }

  // Is this student enrolled in the course that this assignment belongs to?
  const course = getCourseById(assignment.course_id);
  // TODO
  // Check if a student is enrolled in the course that owns this assignment

  // save the actual file to Mongodb
  try {
    const file = {
      path: req.file.path,
      filename: req.file.filename,
      contentType: req.file.mimetype
    };
    const inserted_file_id = await saveSubmissionFile(file);
    await removeUploadedFile(req.file.path);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error inserting submission into DB.  Please try again later."
    });
  }

  // save submission data to MySQL
  try {
    const submission = {
      assignment_id: req.body.assignment_id,
      student_id: req.body.student_id,
      timestamp: req.body.timestamp,
      file: req.file.filename
    }
    const inserted_submission_id = await insertNewSubmission(submission);
    res.status(201).send({
      id: inserted_submission_id,
      links: {
        submission: `/assignments/${assignment_id}/submissions/${inserted_submission_id}`,
        submission_file: `/assignments/${assignment_id}/submissions/${inserted_submission_id}/file/${req.file.filename}`,
        assignment: `/assignments/${assignment_id}`,
        course: `/courses/${course.id}`
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error inserting submission into DB.  Please try again later."
    });
  }

});

// Get submission by id
router.get('/:assignment_id/submissions/:submission_id',
            requireAuthentication,
            async (req, res, next) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.assignment_id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Does this submission even exist?
  const submission_id = parseInt(req.params.submission_id);
  const submission = await getSubmissionById(submission_id);
  if (submission == undefined) {
    next();
  }

  // Is this user a 'student'?
  const user = getUserById(req.authenticatedUserId);
  if (user.role != 'student') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are not a student"
    });
    return;
  }

  // Is this student enrolled in the course that this assignment belongs to?
  const course = getCourseById(assignment.course_id);
  // TODO
  // Check if a student is enrolled in the course that owns this assignment

  // Does this student own this assignment?
  if (submission.student_id != user.id) {
    res.status(403).send({
      error: "Unauthorized to access the specified resource. You don't own this assignment"
    });
    return;
  }

  try {
    const responseBody = {
      assignment_id: submission.assignment_id,
      student_id: submission.student_id,
      timestamp: submission.timestamp,
      file: submission.file, // filename
      links: {
        submission_file: `/assignments/${submission.assignment_id}/submissions/${submission.id}/file/${submission.file}`,
        assignment: `/assignments/${submission.assignment_id}`,
        course: `/courses/${course.id}`
      }
    };
    res.status(200).send(responseBody);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to fetch submission. Please try again later."
    });
  }
});

// Get submission file by id
router.get('/:assignment_id/submissions/:submission_id/file/:filename',
            requireAuthentication,
            async (req, res, next) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.assignment_id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Does this submission even exist?
  const submission_id = parseInt(req.params.submission_id);
  const submission = await getSubmissionById(submission_id);
  if (submission == undefined) {
    next();
  }

  // Is this user a 'student'?
  const user = getUserById(req.authenticatedUserId);
  if (user.role != 'student') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are not a student"
    });
    return;
  }

  // Is this student enrolled in the course that this assignment belongs to?
  const course = getCourseById(assignment.course_id);
  // TODO
  // Check if a student is enrolled in the course that owns this assignment

  // Does this student own this assignment?
  if (submission.student_id != user.id) {
    res.status(403).send({
      error: "Unauthorized to access the specified resource. You don't own this assignment"
    });
    return;
  }

  const filename = req.params.filename;
  try {
    getDownloadStreamByFilename(filename)
      .on('error', (err) => {
        if (err.code === 'ENOENT') {
          next();
        } else {
          next(err);
        }
      })
      .on('file', (file) => {
        res.status(200).type(file.metadata.contentType);
      })
      .pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to fetch submission. Please try again later."
    });
  }
});

module.exports = router;
