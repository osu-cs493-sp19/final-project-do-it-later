/*
 * API route middleware functions for the Course entity.
 */

const router = require('express').Router();

const {
  getCoursePage
} = require('../models/course');

/*
 * GET /courses
 * GET /courses?page=3
 *
 * Fetches a paginated list of all Courses.
 * The URL parameter  page  is optional; if not specified, displays page 1.
 */
router.get('/', async (req, res, next) => {
  try {
    const currentPage = parseInt(req.query.page) || 1;

    // fetch current page's info and generate HATEOAS links of surrounding pages
    const coursePage = await getCoursePage(currentPage);
    coursePage.links = {};
    // if not last page, provide links to next and last pages
    if (coursePage.currentPage < coursePage.totalPages) {
      coursePage.links.nextPage = `/courses?page=${coursePage.currentPage + 1}`;
      coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}`;
    }
    // if not first page, provide links to previous and first pages
    if (coursePage.currentPage > 1) {
      coursePage.links.prevPage = `/courses?page=${coursePage.currentPage - 1}`;
      coursePage.links.firstPage = `/courses?page=1`;
    }

    res.status(200).send(coursePage);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
