/*
 * Data-access functions for the Course entity.
 */

const mysqlPool = require('../lib/mysqlPool');
const { extractValidFields } = require('../lib/validation');

/*
 * This schema is used for validating the content of the request body before
 * inserting it to the database.
 */
const CourseSchema = {
  subject: { required: true },
  number: { required: true },
  title: { required: true },
  term: { required: true },
  instructor_id: { required: true }
};
exports.CourseSchema = CourseSchema;

/*
 * Returns a Promise that
 * - resolves to an object containing info of a page of existing courses, or
 * - rejects with an error on failure.
 *
 * Params:
 *   page     Page of Courses to fetch. Default to 1 if not specified.
 *   subject  Fetch only Courses with the specified subject code.
 *   number   Fetch only Courses with the specified course number.
 *   term     Fetch only Courses with the specified academic term.
 */
function getCoursePage(page, subject, number, term) {
  return new Promise((resolve, reject) => {
    // filter Course's subject, number, and term if provided
    // otherwise, `LIKE %%` will be used to match all patterns
    const sql =
      `SELECT *
      FROM (
        SELECT *
        FROM courses
        WHERE
          LOWER(subject) ${subject ? '= ?' : 'LIKE ?'}
          AND LOWER(number) ${number ? '= ?' : 'LIKE ?'}
          AND LOWER(term) ${term ? '= ?' : 'LIKE ?'}
      ) AS t
      ORDER BY id ASC`;
    mysqlPool.query(
      sql,
      [
        subject ? subject : '%%',
        number ? number : '%%',
        term ? term : '%%',
      ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          // pagination must come after filtering
          const numCourses = results.length;
          const pageSize = 10;  // Courses per page

          // e.g. if 31 Courses in total, then
          // page 1 (1-10), page 2 (11-20), page 3 (21-30), page 4 (31)
          const lastPage = Math.ceil(numCourses / pageSize);

          // force the current page to be within [1..lastPage]
          page = (page > lastPage) ? lastPage : page;
          page = (page < 1) ? 1 : page;

          // e.g. if on page 2, the offset will be 10 courses
          const offset = (page - 1) * pageSize;

          // array indices start at 0,
          // so the page starts at offset and stops before offset + pageSize
          results = results.slice(offset, offset + pageSize);

          resolve({
            courses: results,
            currentPage: page,
            totalPages: lastPage,
            pageSize: pageSize,
            totalCourses: numCourses
          });
        }
      }
    );
  });
}
exports.getCoursePage = getCoursePage;

/*
 * Inserts a Course into the database and returns a Promise that
 * - resolves to the ID of the newly inserted object on success, or
 * - rejects with an error on failure.
 */
function addCourse(course) {
  return new Promise((resolve, reject) => {
    // use only the fields specified in the schema
    course = extractValidFields(course, CourseSchema);

    const sql = 'INSERT INTO courses SET ?';
    mysqlPool.query(sql, course, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.insertId);
      }
    });
  });
}
exports.addCourse = addCourse;
