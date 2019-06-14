/*
 * Data-access functions for the Course entity.
 */

const mysqlPool = require('../lib/mysqlPool');
const { extractValidFields } = require('../lib/validation');
const { getUserById } = require('../models/user');

/*
 * This schema is used for validating the required content of the request body
 * before inserting it to the database.
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
 * Fetches a paginated list of all Courses.
 *
 * Params:
 *   page     Page of Courses to fetch. Default to 1 if not specified.
 *   subject  Fetch only Courses with the specified subject code.
 *   number   Fetch only Courses with the specified course number.
 *   term     Fetch only Courses with the specified academic term.
 *
 * Returns a Promise that
 * - resolves to an object that contains info of a page of existing courses, or
 * - rejects with an error on failure.
 */
function getCoursePage(page, subject, number, term) {
  return new Promise((resolve, reject) => {
    // filter Course's subject, number, and term if they are provided
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
          return;
        }

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
    );
  });
}
exports.getCoursePage = getCoursePage;

/*
 * Inserts a Course into the database.
 *
 * Returns a Promise that
 * - resolves to the ID of the newly inserted object on success, or
 * - rejects with an error on failure.
 */
function addCourse(course) {
  return new Promise((resolve, reject) => {
    const newCourse = extractValidFields(course, CourseSchema);

    const sql = 'INSERT INTO courses SET ?';
    mysqlPool.query(sql, newCourse, (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results.insertId);
    });
  });
}
exports.addCourse = addCourse;

/*
 * Fetch data about a specific Course.
 *
 * Returns a Promise that
 * - resolves to a Course object with the specified ID on success, or
 * - reject with an error on failure.
 *
 * Notes:
 * Does not fetch students enrolled in the Course or Assignments for the Course.
 */
function getCourseById(id) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM courses WHERE id = ?';
    mysqlPool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results[0]);
    });
  });
}
exports.getCourseById = getCourseById;

/*
 * Updates data for a specific Course.
 *
 * Returns a Promise that
 * - resolves to true on successful update or false on non-update, or
 * - rejects with an error on failure.
 *
 * Notes:
 * Does not modify this Course's students and Assignments.
 */
function updateCourseById(id, course) {
  return new Promise((resolve, reject) => {
    const newCourse = extractValidFields(course, CourseSchema);
    const newCourseKeys = Object.keys(newCourse);

    let newCourseQuery = '';
    newCourseKeys.forEach((field, index) => {
      newCourseQuery += `${field} = ?`;
      if (index < newCourseKeys.length - 1) {
        newCourseQuery += ', ';
      }
    });

    // values to be escaped and put into the database query
    const queryValues = Object.values(newCourse);
    queryValues.push(id);

    const sql = `UPDATE courses SET ${newCourseQuery} WHERE id = ?`;
    mysqlPool.query(sql, queryValues, (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results.affectedRows > 0);
    });
  });
}
exports.updateCourseById = updateCourseById;

/*
 * Removes a specific Course from the database.
 *
 * Returns a Promise that
 * - resolves to true on successful removal or false on non-removal, or
 * - rejects with an error on failure.
 *
 * Notes:
 * All students enrolling in this Course and all Assignments for this Course
 * will also be removed.
 */
function deleteCourseById(id) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM courses WHERE id = ?';
    mysqlPool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results.affectedRows > 0);
    });
  });
}
exports.deleteCourseById = deleteCourseById;

/*
 * Fetches a list of IDs of students enrolled in the Course.
 *
 * Returns a Promise that
 * - resolves to a list that contains the User IDs of all students currently
 * enrolled in the Course on success.
 * - rejects with an error on failure.
 */
function getCourseStudentIds(courseId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT student_id FROM courses_students WHERE course_id = ?';
    mysqlPool.query(sql, [courseId], (err, results) => {
      if (err) {
        reject(err);
      }

      resolve(results);
    });
  });
}
exports.getCourseStudentIds = getCourseStudentIds;

/*
 * Validates the request body of POST /courses/{id}/students.
 *
 * Returns true if the request body is a valid update object---that is to have
 * at least one of the two fields `add` and `remove`, both of which are arrays.
 * Returns false otherwise.
 */
function validateEnrollmentUpdateBody(obj) {
  return obj && Array.isArray(obj.add) && obj.add.length > 0 &&
                Array.isArray(obj.remove) && obj.remove.length > 0;
}
exports.validateEnrollmentUpdateBody = validateEnrollmentUpdateBody;

/*
 * Enrolls a new student to a Course.
 *
 * Returns a Promise that
 * - resolves on success, or
 * - reject with an error on failure.
 */
function addStudentToCourse(courseId, studentId) {
  return new Promise((resolve, reject) => {
    const sql =
      'INSERT INTO courses_students (course_id, student_id) VALUES (?, ?)';
    mysqlPool.query(sql, [courseId, studentId], (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

/*
 * Removes an existing student from a Course.
 *
 * Returns a Promise that
 * - resolves to true on successful removal or false on non-removal, or
 * - reject with an error on failure.
 */
function deleteStudentFromCourse(courseId, studentId) {
  return new Promise((resolve, reject) => {
    const sql =
      'DELETE FROM courses_students WHERE course_id = ? AND student_id = ?';
    mysqlPool.query(sql, [courseId, studentId], (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results.affectedRows > 0);
    });
  });
}

/*
 * Updates enrollment for a Course.
 *
 * Returns a Promise that
 * - resolves to an object containing the list of added students and the list of
 * removed students.
 * - reject with an error on failure.
 */
function updateCourseEnrollment(courseId, updateObj) {
  return new Promise(async (resolve, reject) => {
    let addedStudents = [];
    let removedStudents = [];

    // if there is an `add` array field, enroll those Students
    if (updateObj.add) {
      for (let i = 0, len = updateObj.add.length; i < len; i++) {
        const userId = updateObj.add[i];
        try {
          // make sure these users are students, ignore if they're not
          const user = await getUserById(userId);
          if (!user || user.role !== 'student') {
            continue;
          }

          // insert this student to the Course
          await addStudentToCourse(courseId, userId);
          addedStudents.push(userId);
        } catch (err) {
          // only reject with errors that are not about duplicate entries
          if (!err || err.code !== 'ER_DUP_ENTRY') {
            reject(err);
            return;
          }
        }
      }
    }

    // if there is a `remove` array field, unenroll those Students
    if (updateObj.remove) {
      for (let i = 0, len = updateObj.remove.length; i < len; i++) {
        const userId = updateObj.remove[i];
        try {
          // no need to check for role, as the removal function will do nothing
          // if the pair (courseId, userId) doesn't match any row
          const deleteSuccess = await deleteStudentFromCourse(courseId, userId);
          if (deleteSuccess) {
            removedStudents.push(userId);
          }
        } catch (err) {
          reject(err);
          return;
        }
      }
    }

    resolve({
      added: addedStudents,
      removed: removedStudents
    });
  });
}
exports.updateCourseEnrollment = updateCourseEnrollment;

/*
 * Fetches the Course roster.
 *
 * Returns a Promise that
 * - resolves to a list of objects, each of which contains the info of a student
 * enrolled in the Course on success, or
 * - rejects with an error on failure.
 */
function getCourseRoster(courseId) {
  return new Promise((resolve, reject) => {
    const sql =
      `SELECT
        u.id,
        u.name,
        u.email
      FROM users AS u
      INNER JOIN courses_students AS cs
      ON u.id = cs.student_id
      WHERE cs.course_id = ?`;
    mysqlPool.query(sql, [courseId], (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results);
    });
  });
}
exports.getCourseRoster = getCourseRoster;
