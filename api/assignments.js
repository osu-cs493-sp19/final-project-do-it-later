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

const {
  getCourseById,
  getCourseStudentIds,
} = require('../models/course');

const {
  SubmissionSchema,
  getSubmissionsPage,
  getSubmissionById,
  insertSubmission,
  getDownloadStreamByFilename,
  deleteSubmissionByAssignmentId
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
router.post('/', requireAuthentication, async (req, res) => {
  // Does this POST request had valid body
  if (!validateAgainstSchema(req.body, AssignmentSchema)) {
    res.status(400).send({
      error: "Request body is not a valid assignment object."
    });
    return;
  }

  // Does this course exist?
  const course = await getCourseById(parseInt(req.body.course_id));
  if (!course) {
    next();
    return;
  }

  // only admins and instructor of the Course can proceed
  const authorized = req.authenticatedUserRole === 'admin' ||
                    (req.authenticatedUserRole === 'instructor' &&
                    req.authenticatedUserId === course.instructor_id);
  if (!authorized) {
    res.status(403).send({
      error: 'Only admins and instructor of the Course can update the Course.'
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

  // Does this course exist?
  const course = await getCourseById(parseInt(assignment.course_id));
  if (!course) {
    next();
    return;
  }

  // only admins and instructor of the Course can proceed
  const authorized = req.authenticatedUserRole === 'admin' ||
                    (req.authenticatedUserRole === 'instructor' &&
                    req.authenticatedUserId === course.instructor_id);
  if (!authorized) {
    res.status(403).send({
      error: 'Only admins and instructor of the Course can update the Course.'
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
router.delete('/:id', requireAuthentication, async (req, res) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Does this course exist?
  const course = await getCourseById(parseInt(assignment.course_id));
  if (!course) {
    next();
    return;
  }

  // only admins and instructor of the Course can proceed
  const authorized = req.authenticatedUserRole === 'admin' ||
                    (req.authenticatedUserRole === 'instructor' &&
                    req.authenticatedUserId === course.instructor_id);
  if (!authorized) {
    res.status(403).send({
      error: 'You are not authorized to delete this resource.'
    });
    return;
  }

  // (1) Remove this assignment from db
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
  try {
    await deleteSubmissionByAssignmentId(assignment_id);
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
    return;
  }

  // Does this course exist?
  const course = await getCourseById(parseInt(assignment.course_id));
  if (!course) {
    next();
    return;
  }

  // only admins and instructor of the Course can proceed
  const authorized = req.authenticatedUserRole === 'admin' ||
                    (req.authenticatedUserRole === 'instructor' &&
                    req.authenticatedUserId === course.instructor_id);
  if (!authorized) {
    res.status(403).send({
      error: 'You are not authorized to access this resource.'
    });
    return;
  }

  try {
    /*
     * Fetch page info, generate HATEOAS links for surrounding pages and then
     * send response.
     */
    const currentPage = parseInt(req.query.page) || 1;
    const student_id = parseInt(req.query.student_id) || 0;

    //console.log('== currentPage:', currentPage);
    const submissionPage = await getSubmissionsPage(assignment_id, currentPage, student_id);
    // console.log('== submissionPage:', submissionPage);

    submissionPage.links = {};
    const studentIdQuery = student_id > 0 ? `&student_id=${student_id}` : '';
    if (submissionPage.page < submissionPage.totalPages) {
      submissionPage.links.nextPage =
        `/assignments/${assignment_id}/submissions?page=${submissionPage.page + 1}` +
        studentIdQuery;
      submissionPage.links.lastPage =
        `/assignments/${assignment_id}/submissions?page=${submissionPage.totalPages}` +
        studentIdQuery;
    }
    if (submissionPage.page > 1) {
      submissionPage.links.prevPage =
        `/assignments/${assignment_id}/submissions?page=${submissionPage.page - 1}` +
        studentIdQuery;
      submissionPage.links.firstPage =
        `/assignments/${assignment_id}/submissions?page=1` +
        studentIdQuery;
    }
    res.status(200).send(submissionPage);

    // const result = await getAllSubmissions();
    // res.status(200).send(result);


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
      //req.body.file = file.buffer;
      callback(null, `${basename}${extension}`);
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

  // Does this course exist?
  const course = await getCourseById(parseInt(assignment.course_id));
  if (!course) {
    next();
    return;
  }

  // Fetch a list of student ids who are enrolled in this course
  const studentIds = await getCourseStudentIds(parseInt(course.id));
  if (!studentIds.length) {
    res.status(403).send({
      error: 'You are not authorized to create this resource.'
    });
    return;
  }
  // Simplify the json object got from getCourseStudentIds
  // so we can easily compare with req.authenticatedUserId later
  for (let i = 0, len = studentIds.length; i < len; i++) {
    studentIds[i] = studentIds[i].student_id;
  }
  // only enrolled students of the Course can proceed
  const authorized = req.authenticatedUserRole === 'student' && // is a student
                      studentIds.includes(req.authenticatedUserId); // enrolled in this course
  if (!authorized) {
    res.status(403).send({
      error: 'You are not authorized to create this resource.'
    });
    return;
  }

  // save both submission data and uploaded file to MongoDB
  try {
    //console.log("== req.file:", req.file);
    //console.log("== req.file.filename:", req.file.filename);
    const submission = {
      // file metadata
      path: req.file.path,
      filename: req.file.filename,
      contentType: req.file.mimetype,
      // submission metadata
      assignment_id: req.body.assignment_id,
      student_id: req.authenticatedUserId,
      timestamp: req.body.timestamp,
    };
    //console.log("== submission: ", submission);
    const inserted_submission_id = await insertSubmission(submission);
    await removeUploadedFile(req.file.path);
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
    return;
  }

});

// Get a submission detail by id
router.get('/:assignment_id/submissions/:submission_id', requireAuthentication, async (req, res, next) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.assignment_id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Does this submission even exist?
  //const submission_id = parseInt(req.params.submission_id);
  const submission_id = req.params.submission_id;
  const submission = await getSubmissionById(submission_id);
  if (submission == undefined) {
    next();
  }

  // Does this course exist?
  const course = await getCourseById(parseInt(assignment.course_id));
  if (!course) {
    next();
    return;
  }

  let authorized = false;
  if (req.authenticatedUserRole === 'student') {
    // Fetch a list of student ids who are enrolled in this course
    const studentIds = await getCourseStudentIds(parseInt(course.id));
    if (!studentIds.length) {
      res.status(403).send({
        error: 'You are not authorized to create this resource.'
      });
      return;
    }
    // Simplify the json object got from getCourseStudentIds
    // so we can easily compare with req.authenticatedUserId later
    for (let i = 0, len = studentIds.length; i < len; i++) {
      studentIds[i] = studentIds[i].student_id;
    }
    authorized = studentIds.includes(req.authenticatedUserId) && // is enrolled in this course
                  submission.metadata.student_id == req.authenticatedUserId; // owns this submission
  } else {
    authorized = req.authenticatedUserRole === 'admin' ||
                    (req.authenticatedUserRole === 'instructor' &&
                    req.authenticatedUserId === course.instructor_id);
  }

  if (!authorized) {
    res.status(403).send({
      error: 'You are not authorized to access this resource.'
    });
    return;
  }

  try {
    const responseBody = {
      assignment_id: submission.metadata.assignment_id,
      student_id: submission.metadata.student_id,
      timestamp: submission.metadata.timestamp,
      file: submission.filename, // filename
      links: {
        submission_file: `/assignments/${submission.metadata.assignment_id}/submissions/${submission._id}/file/${submission.filename}`,
        assignment: `/assignments/${submission.metadata.assignment_id}`,
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
  //const submission_id = parseInt(req.params.submission_id);
  const submission_id = req.params.submission_id;
  const submission = await getSubmissionById(submission_id);
  if (submission == undefined) {
    next();
  }

  // Does this course exist?
  const course = await getCourseById(parseInt(assignment.course_id));
  if (!course) {
    next();
    return;
  }

  let authorized = false;
  if (req.authenticatedUserRole === 'student') {
    // Fetch a list of student ids who are enrolled in this course
    const studentIds = await getCourseStudentIds(parseInt(course.id));
    if (!studentIds.length) {
      res.status(403).send({
        error: 'You are not authorized to create this resource.'
      });
      return;
    }
    // Simplify the json object got from getCourseStudentIds
    // so we can easily compare with req.authenticatedUserId later
    for (let i = 0, len = studentIds.length; i < len; i++) {
      studentIds[i] = studentIds[i].student_id;
    }
    authorized = studentIds.includes(req.authenticatedUserId) && // is enrolled in this course
                  submission.metadata.student_id == req.authenticatedUserId; // owns this submission
  } else {
    authorized = req.authenticatedUserRole === 'admin' ||
                    (req.authenticatedUserRole === 'instructor' &&
                    req.authenticatedUserId === course.instructor_id);
  }

  if (!authorized) {
    res.status(403).send({
      error: 'You are not authorized to access this resource.'
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
