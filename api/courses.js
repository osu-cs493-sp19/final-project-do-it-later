/*
 * API route middleware functions for the Course entity.
 */

const router = require('express').Router();

const {
  CourseSchema,
  getCoursePage,
} = require('../models/course');

/*
 * GET /courses
 * GET /courses?page=3
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
      coursePage.links.nextPage = `/courses?page=${coursePage.currentPage + 1}` +
          subjectQuery + numberQuery + termQuery;
      coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}` +
          subjectQuery + numberQuery + termQuery;
    }
    // if not first page, provide links to previous and first pages
    if (coursePage.currentPage > 1) {
      coursePage.links.prevPage = `/courses?page=${coursePage.currentPage - 1}` +
          subjectQuery + numberQuery + termQuery;
      coursePage.links.firstPage = `/courses?page=1` +
          subjectQuery + numberQuery + termQuery;
    }

    res.status(200).send(coursePage);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
