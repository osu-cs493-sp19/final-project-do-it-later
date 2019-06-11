/*
 * API sub-router for assignments collection endpoints.
 */

const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const { requireAuthentication } = require('../lib/auth');

const {
  AssignmentSchema,
  AssignmentPatchSchema,
  getAssignmentById,
  insertNewAssignment,
  replaceAssignmentById,
  deleteAssignmentById
} = require('../models/assignment');

// const {
//   getUserById
// } = require('../models/user');

// const {
//   getCourseById
// } = require('../models/course');

const {
  deleteSubmissionByAssignmentId
} = require('../models/submission');

/*
 * Route to fetch info about a specific review.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const review = await getAssignmentById(parseInt(req.params.id));
    if (review) {
      res.status(200).send(review);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to fetch review.  Please try again later."
    });
    return;
  }
});

/*
 *  Create and store a new Assignment with specified data and adds it to the application's database.
    Only an authenticated User with 'admin' role or an authenticated 'instructor' User
    whose ID matches the instructorId of the Course corresponding to the Assignment's courseId
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

  const user = await getUserById(req.authenticated_userid);
  // pseudo data for testing only
  // const user = {
  //   id: '5',
  //   role: 'student'
  // };
  // const user = {
  //   id: '3',
  //   role: 'instructor'
  // };
  // Does this user has 'admin' or 'instructor' role?
  if (user.role != 'admin' && user.role != 'instructor') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource (not admin nor instructor)"
    });
    return;
  }

  const course = await getCourseById(req.body.course_id);
  // pseudo data for testing only
  //   id: '2',
  //   instructorId: '4'
  // };
  // const course = {
  //   id: '1',
  //   instructor_id: '3'
  // };
  // Does this user'id match the `instructorId` of the Course that owns this assignment?
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
router.patch('/:id', async (req, res) => {
//router.patch('/:id', requireAuthentication, async (req, res) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Is this PATCH request has valid body?
  // Note that we use `AssignmentPatchSchema` instead of `AssignmentSchema`
  //    to make all schema fields optional appearance.
  //    If it has no field, it will not pass either since then req.body is empty
  //    , which is also checked in the validateAgainstSchema() function
  if (!validateAgainstSchema(req.body, AssignmentPatchSchema)) {
    res.status(400).send({
      error: "Request body is not a valid"
    });
    return;
  }

  // Does this user has 'admin' or 'instructor' role?
  const user = await getUserById(req.authenticated_userid);
  // pseudo data for testing only
  // const user = { // Doesn' own anything. Expect 403
  //   id: '5',
  //   role: 'student'
  // };
  // const user = { // owns course 1. Expect no error
  //   id: '3',
  //   role: 'instructor'
  // };
  if (user.role != 'admin' && user.role != 'instructor') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are neither admin nor instructor"
    });
    return;
  }

  // Does this user'id match the `instructorId` of the Course that owns this assignment?
  const course = await getCourseById(req.body.course_id);
  // pseudo data for testing only
  // const course = { // Expect 403
  //   // req.params.id = 5 (in during manual test)
  //   id: '2', // assignment 5 belongs to course 2, which is owned by user 4
  //   instructor_id: '4' // Julianne Schutfort
  // };
  // const course = { // Expect no error
  //   //req.params.id = 2 (in during manual test)
  //   id: '1', // assignment 2 belongs to course 1, which is owned by user 3
  //   instructor_id: '3' // Rob Hess
  // };
  if (user.id != course.instructor_id) {
    // req.params.id = 5 (in during manual test)
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
router.delete('/:id', async (req, res) => {
//router.delete('/:id', requireAuthentication, async (req, res) => {
  // Does this assignment even exist?
  const assignment_id = parseInt(req.params.id);
  const assignment = await getAssignmentById(assignment_id);
  if (assignment == undefined) {
    next();
  }

  // Does this user has 'admin' or 'instructor' role?
  const user = getUserById(req.authenticated_userid);
  // pseudo data for testing only
  // const user = {
  //   id: '5',
  //   role: 'student'
  // };
  // const user = { // owns course 1. Expect no error
  //   id: '3',
  //   role: 'instructor'
  // };
  if (user.role != 'admin' && user.role != 'instructor') {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are neither admin nor instructor"
    });
    return;
  }

  // Does this user'id match the `instructorId` of the Course that owns this assignment?
  const course = await getCourseById(req.body.course_id);
  // pseudo data for testing only
  // const course = { // Expect 403
  //   //req.params.id = 6
  //   id: '3', // assignment #6 belongs to course 3, which is owned by user 10 (Ben Brewster)
  //   instructor_id: '10'
  // };
  // const course = { // Expect no error
  //   // req.params.id = 1
  //   id: '1', // Assignment #1 belongs to course 1, which is owned by user 3 (Rob Hess)
  //   instructor_id: '3'
  // };
  if (user.id != course.instructor_id) {
    res.status(403).send({
      error: "Unauthorized to access the specified resource: You are not instructor of this course"
    });
    return;
  }

  // (1) Remove this assignment from db
  let deleteAssignmentSuccessful = undefined;
  let deleteSubmissionSuccessful = undefined;
  try {
    deleteAssignmentSuccessful = await deleteAssignmentById(assignment_id);
    if (!deleteAssignmentSuccessful) {
      console.error(err);
      res.status(500).send({
        error: "Unable to delete review. Please try again later."
      });
      return;
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to delete review. Please try again later."
    });
    return;
  }

  // (2) Remove all connected submissions from db
  // try {
  //   deleteSubmissionSuccessful = await deleteSubmissionByAssignmentId(assignment_id);
  //   if (!deleteSubmissionSuccessful) {
  //     console.error(err);
  //     res.status(500).send({
  //       error: "Error(s) removing connected submission(s) of this assignment.  Please try again later."
  //     });
  //     return;
  //   }
  // } catch (err) {
  //   console.error(err);
  //   res.status(500).send({
  //     error: "Error(s) removing connected submission(s) of this assignment.  Please try again later."
  //   });
  //   return;
  // }

  // if reach this point, both deleteAssignmentSuccessful and deleteSubmissionSuccessful must be true
  res.status(204).end();
});

module.exports = router;
