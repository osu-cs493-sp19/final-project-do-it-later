/*
 * Data-access functions for the Course entity.
 */

const mysqlPool = require('../lib/mysqlPool');

/*
 * This schema is used for validating the content of the request body before
 * inserting it to the database.
 */
const courseSchema = {
  subject: { required: true },
  number: { required: true },
  title: { required: true },
  term: { required: true },
  instructor_id: { required: true }
};
exports.courseSchema = courseSchema;

/*
 * Returns a Promise that
 * - resolves to the number of existing courses on success, or
 * - rejects with an error on failure.
 */
function countCourses() {
  return new Promise((resolve, reject) => {
    const mysqlQuery = 'SELECT COUNT(id) AS count FROM courses';
    mysqlPool.query(mysqlQuery, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].count);
      }
    });
  });
}

/*
 * Returns a Promise that
 * - resolves to an object containing info of a page of existing courses, or
 * - rejects with an error on failure.
 */
function getCoursePage(currentPage) {
  return new Promise(async (resolve, reject) => {
    const numCourses = await countCourses();
    const pageSize = 10;  // courses per page

    // e.g. if 29 courses in total,
    //   then page 1 (1-10), page 2 (11-20), page 3 (21-29)
    // e.g. if 30 courses in total,
    //   then page 1 (1-10), page 2 (11-20), page 3 (21-30)
    // e.g. if 31 courses in total,
    //   then page 1 (1-10), page 2 (11-20), page 3 (21-30), page 4 (31)
    const lastPage = Math.ceil(numCourses / pageSize);

    // make sure the current page is within [1..lastPage]
    currentPage = (currentPage > lastPage) ? lastPage : currentPage;
    currentPage = (currentPage < 1) ? 1 : currentPage;

    // e.g. if on page 2, the offset will be 10 courses
    const offset = (currentPage - 1) * pageSize;

    const mysqlQuery = 'SELECT * FROM courses ORDER BY id LIMIT ?, ?';
    mysqlPool.query(mysqlQuery, [offset, pageSize], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          courses: results,
          currentPage: currentPage,
          totalPages: lastPage,
          pageSize: pageSize,
          totalCourses: numCourses
        });
      }
    });
  });
}
exports.getCoursePage = getCoursePage;
