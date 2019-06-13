/*
 * API route middleware functions for the Course entity.
 */

const router = require('express').Router();

const {
  validateAgainstSchema,
  validatePatchAgainstSchema
} = require('../lib/validation');
const {
  CourseSchema,
  getCoursePage,
  addCourse,
  getCourseById,
  updateCourseById,
  deleteCourseById,
  getCourseStudents,
  validateEnrollmentUpdateBody,
  updateCourseEnrollment
} = require('../models/course');

/*
 * GET /courses
 *
 * Fetches the paginated list of all Courses. The Courses returned do not
 * contain the list of Students in the Course or the Assignments for the Course.
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
router.post('/', async (req, res) => {
  if (!validateAgainstSchema(req.body, CourseSchema)) {
    res.status(400).send({
      error: 'The request body was not a valid Course object.'
    });
    return;
  }

  try {
    const insertId = await addCourse(req.body);
    res.status(201).send({ id: insertId });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to insert the Course. Please try again later.'
    });
  }
});

/*
 * GET /courses/{id}
 *
 * Fetches data about a specific Course, excluding the list of Students enrolled
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
 * Performs a partial update on the data for the Course. Enrolled Students and
 * Assignments for the Course will not be modified via this endpoint.
 *
 * Only an authenticated admin User or an authenticated instructor User whose
 * ID matches the `instructor_id` of the Course can update Course information.
 */
router.patch('/:id', async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (!validatePatchAgainstSchema(req.body, CourseSchema)) {
    res.status(400).send({
      error: 'The request body did not contain any valid Course field.'
    });
    return;
  }

  try {
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
 * Students, all Assignments, etc.
 *
 * Only an authenticated admin User can remove a Course.
 */
router.delete('/:id', async (req, res, next) => {
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
router.get('/:id/students', async (req, res, next) => {
  try {
    const students = await getCourseStudents(parseInt(req.params.id));
    if (!students || !students.length) {
      next();
      return;
    }

    for (var i = 0, len = students.length; i < len; i++)  {
      students[i] = students[i].student_id;
    }
    res.status(200).send({ students: students });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to fetch the Course's students. Please try again later."
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
router.post('/:id/students', async (req, res, next) => {
  const courseId = parseInt(req.params.id);

  try {
    if (!validateEnrollmentUpdateBody(req.body)) {
      res.status(400).send({
        error: 'The provided body was not a valid enrollment update object.'
      });
      return;
    }

    // make sure the course exists before updating its students
    const course = await getCourseById(courseId);
    if (!course) {
      next();
      return;
    }

    const updateResult = await updateCourseEnrollment(courseId, req.body);
    res.status(200).send(updateResult);
  } catch (err) {
    res.status(500).send({
      error: "Unable to update the Course's students. Please try again later."
    });
  }
});


module.exports = router;
