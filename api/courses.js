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
router.get('/', async (req, res, next) => {
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
    next(err);
  }
});

/*
 * POST /courses
 *
 * Creates a new Course with specified data and adds it to the database. Only
 * authenticated User with admin role can create a new Course.
 */
router.post('/', async (req, res, next) => {
  if (validateAgainstSchema(req.body, CourseSchema)) {
    try {
      const insertId = await addCourse(req.body);

      res.status(201).send({ id: insertId });
    } catch (err) {
      next(err);
    }
  } else {
    res.status(400).send({
      error: 'The request body was not a valid Course object.'
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
    if (course) {
      res.status(200).send(course);
    } else {
      next();
    }
  } catch (err) { next(err);
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

  if (validatePatchAgainstSchema(req.body, CourseSchema)) {
    try {
      const updateSuccess = await updateCourseById(id, req.body);
      if (updateSuccess) {
        res.status(200).send();
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
  } else {
    res.status(400).send({
      error: 'The request body did not contain any valid Course field.'
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
  const deleteSuccess = await deleteCourseById(parseInt(req.params.id));
  if (deleteSuccess) {
    res.status(204).send();
  } else {
    next();
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
    if (students && students.length > 0) {
      for (var i = 0, len = students.length; i < len; i++)  {
        students[i] = students[i].student_id;
      }
      res.status(200).send({ students: students });
    } else {
      res.status(404).send({
        error: 'The specified Course was not found, or the Course does not ' +
               'have any students enrolled.'
      });
    }
  } catch (err) {
    next(err);
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
    if (validateEnrollmentUpdateBody(req.body)) {
      const updateResult = await updateCourseEnrollment(courseId, req.body);
      res.status(200).send(updateResult);
    } else {
      res.status(400).send({
        error: 'The provided body was not a valid enrollment update object.'
      });
    }
  } catch (err) {
    next(err);
  }
});


module.exports = router;
