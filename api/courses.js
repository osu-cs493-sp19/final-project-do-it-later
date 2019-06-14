/*
 * API route middleware functions for the Course entity.
 */

const router = require('express').Router();
const json2csv = require('json2csv');
const fs = require('fs');

const {
  validateAgainstSchema,
  validatePatchAgainstSchema
} = require('../lib/validation');
const {
  requireAuthentication
} = require('../lib/auth');
const {
  CourseSchema,
  getCoursePage,
  addCourse,
  getCourseById,
  updateCourseById,
  deleteCourseById,
  getCourseStudentIds,
  validateEnrollmentUpdateBody,
  updateCourseEnrollment,
  getCourseRoster,
  getCourseAssignmentIds
} = require('../models/course');

/*
 * GET /courses
 *
 * Fetches the paginated list of all Courses. The Courses returned do not
 * contain the list of students in the Course or the Assignments for the Course.
 */
router.get('/', async (req, res) => {
  try {
    // collect URL parameters
    const currentPage = parseInt(req.query.page) || 1;
    const subject = req.query.subject || '';
    const number = req.query.number || '';
    const term = req.query.term || '';

    // fetch current page's info and generate HATEOAS links of surrounding pages
    const coursePage = await getCoursePage(currentPage, subject, number, term);
    coursePage.links = {};
    const subjectQuery = subject ? `&subject=${subject}` : '';
    const numberQuery = number ? `&number=${number}` : '';
    const termQuery = term ? `&term=${term}` : '';
    // if not last page, provide links to next and last pages
    if (coursePage.currentPage < coursePage.totalPages) {
      coursePage.links.nextPage =
        `/courses?page=${coursePage.currentPage + 1}` +
          subjectQuery + numberQuery + termQuery;
      coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}` +
          subjectQuery + numberQuery + termQuery;
    }
    // if not first page, provide links to previous and first pages
    if (coursePage.currentPage > 1) {
      coursePage.links.prevPage =
        `/courses?page=${coursePage.currentPage - 1}` +
          subjectQuery + numberQuery + termQuery;
      coursePage.links.firstPage = `/courses?page=1` +
          subjectQuery + numberQuery + termQuery;
    }

    res.status(200).send(coursePage);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to fetch Courses. Please try again later.'
    });
  }
});

/*
 * POST /courses
 *
 * Creates a new Course with specified data and adds it to the database. Only
 * authenticated User with admin role can create a new Course.
 */
router.post('/', requireAuthentication, async (req, res) => {
  if (!validateAgainstSchema(req.body, CourseSchema)) {
    res.status(400).send({
      error: 'The request body was not a valid Course object.'
    });
    return;
  }

  if (req.authenticatedUserRole !== 'admin') {
    res.status(403).send({
      error: 'Only admins can create new Courses.'
    });
    return;
  }

  try {
    const insertId = await addCourse(req.body);
    res.status(201).send({ id: insertId });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_DATA_TOO_LONG') {
      res.status(400).send({
        error: 'Some fields in the request body exceed the limits.'
      });
    } else {
      console.error(err);
      res.status(500).send({
        error: 'Unable to insert the Course. Please try again later.'
      });
    }
  }
});

/*
 * GET /courses/{id}
 *
 * Fetches data about a specific Course, excluding the list of students enrolled
 * in the course and the list of Assignments for the courses.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const course = await getCourseById(parseInt(req.params.id));
    if (!course) {
      next();
      return;
    }

    res.status(200).send(course);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to fetch the Course. Please try again later.'
    });
  }
});

/*
 * PATCH /courses/{id}
 *
 * Performs a partial update on the data for the Course. Enrolled students and
 * Assignments for the Course will not be modified via this endpoint.
 *
 * Only an authenticated admin User or an authenticated instructor User whose
 * ID matches the `instructor_id` of the Course can update Course information.
 */
router.patch('/:id', requireAuthentication, async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (!validatePatchAgainstSchema(req.body, CourseSchema)) {
    res.status(400).send({
      error: 'The request body did not contain any valid Course field.'
    });
    return;
  }

  try {
    // ensure the Course exists
    const course = await getCourseById(id);
    if (!course) {
      next();
      return;
    }

    // only admins and instructor of the Course can proceed
    const authenticated = req.authenticatedUserRole === 'admin' ||
      (req.authenticatedUserRole === 'instructor' &&
        req.authenticatedUserId === course.instructor_id);
    if (!authenticated) {
      res.status(403).send({
        error: 'Only admins and instructor of the Course can update the Course.'
      });
      return;
    }

    const updateSuccess = await updateCourseById(id, req.body);
    if (!updateSuccess) {
      next();
      return;
    }

    res.status(200).send();
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to update the Course. Please try again later.'
    });
  }
});

/*
 * DELETE /courses/{id}
 *
 * Completely removes the data for the specified Course, including all enrolled
 * students, all Assignments, etc.
 *
 * Only an authenticated admin User can remove a Course.
 */
router.delete('/:id', requireAuthentication, async (req, res, next) => {
  if (req.authenticatedUserRole !== 'admin') {
    res.status(403).send({
      error: 'Only admins can remove the Course.'
    });
    return;
  }

  try {
    const deleteSuccess = await deleteCourseById(parseInt(req.params.id));
    if (!deleteSuccess) {
      next();
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to delete the Course. Please try again later.'
    });
  }
});

/*
 * GET /courses/{id}/students
 *
 * Fetches a list of the students enrolled in the Course.
 *
 * Only an authenticated admin or an instructor who teaches this Course can
 * fetch the student list.
 */
router.get('/:id/students', requireAuthentication, async (req, res, next) => {
  const id = parseInt(req.params.id);

  try {
    // ensure the Course exists
    const course = await getCourseById(id);
    if (!course) {
      next();
      return;
    }

    // only admins and instructor of the Course can proceed
    const authenticated = req.authenticatedUserRole === 'admin' ||
      (req.authenticatedUserRole === 'instructor' &&
        req.authenticatedUserId === course.instructor_id);
    if (!authenticated) {
      res.status(403).send({
        error: 'Only admins and instructor of the Course can fetch ' +
               'the student list of the Course.'
      });
      return;
    }

    const studentIds = await getCourseStudentIds(id);

    // for each element, omit the field and keep the values only
    for (let i = 0, len = studentIds.length; i < len; i++)  {
      studentIds[i] = studentIds[i].student_id;
    }

    res.status(200).send({ students: studentIds });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to fetch the Course students. Please try again later.'
    });
  }
});

/*
 * POST /courses/{id}/students
 *
 * Enrolls and un-enrolls students from the Course.
 *
 * Only an authenticated admin or an instructor who teaches this Course can
 * update enrollment for this Course.
 */
router.post('/:id/students', requireAuthentication, async (req, res, next) => {
  const courseId = parseInt(req.params.id);

  if (!validateEnrollmentUpdateBody(req.body)) {
    res.status(400).send({
      error: 'The provided body was not a valid enrollment update object.'
    });
    return;
  }

  try {
    // ensure the Course exists
    const course = await getCourseById(courseId);
    if (!course) {
      next();
      return;
    }

    // only admins and instructor of the Course can proceed
    const authenticated = req.authenticatedUserRole === 'admin' ||
      (req.authenticatedUserRole === 'instructor' &&
        req.authenticatedUserId === course.instructor_id);
    if (!authenticated) {
      res.status(403).send({
        error: 'Only admins and instructor of the Course can update ' +
               'the enrollment of the Course.'
      });
      return;
    }

    const updateResult = await updateCourseEnrollment(courseId, req.body);
    res.status(200).send(updateResult);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to update the Course enrollment. Please try again later.'
    });
  }
});

/*
 * GET /courses/{id}/roster
 *
 * Fetches a CSV file containing a list of the students enrolled in the Course.
 * The results will both be saved to a CSV file on the /roster directory of the
 * server and be sent back to the client via the response.
 *
 * Only an authenticated admin or the instructor of the Course can fetch the
 * roster.
 */
router.get('/:id/roster', requireAuthentication, async (req, res, next) => {
  const id = parseInt(req.params.id);

  try {
    // ensure the Course exists
    const course = await getCourseById(id);
    if (!course) {
      next();
      return;
    }

    // only admins and instructor of the Course can proceed
    const authenticated = req.authenticatedUserRole === 'admin' ||
      (req.authenticatedUserRole === 'instructor' &&
        req.authenticatedUserId === course.instructor_id);
    if (!authenticated) {
      res.status(403).send({
        error: 'Only admins and instructor of the Course can fetch ' +
               'the Course roster.'
      });
      return;
    }

    const roster = await getCourseRoster(id);
    if (!roster.length) {
      res.status(404).send({
        error: 'Course does not have any student enrolled.'
      });
      return;
    }

    try {
      const csvData = json2csv.parse(roster);
      const csvPath = `${__dirname}/../rosters/course${req.params.id}.csv`;
      fs.writeFile(csvPath, csvData, (err) => {
        if (err) throw(err);

        res.status(200).type('text/csv').send(csvData);
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: 'Unable to export to CSV. Please try again later.'
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to fetch the Course roster. Please try again later.'
    });
  }
});

/*
 * GET /courses/{id}/assignments
 *
 * Fetches a list of the Assignments for the Course.
 */
router.get('/:id/assignments', async (req, res) => {
  try {
    const assignmentIds = await getCourseAssignmentIds(parseInt(req.params.id));

    // for each element, omit the field and keep the values only
    for (let i = 0, len = assignmentIds.length; i < len; i++) {
      assignmentIds[i] = assignmentIds[i].id;
    }

    res.status(200).send({ assignments: assignmentIds });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to fetch the Course Assignments. Please try again later.'
    });
  }
});

module.exports = router;
