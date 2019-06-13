const bcrypt = require('bcryptjs');
const mysqlPool = require('../lib/mysqlPool');
const { extractValidFields } = require('../lib/validation');

// `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
// `name` VARCHAR(255) NOT NULL,
// `email` VARCHAR(255) NOT NULL,
// `password` VARCHAR(255) NOT NULL,
// `role` VARCHAR(10) NOT NULL,
const UserSchema = {
  name: { required: true },
  email: { required: true },
  password: { required: true },
  role: { required: true }
};
exports.UserSchema = UserSchema;

exports.insertNewUser = (user) => {
  return new Promise((resolve, reject) => {
    user = extractValidFields(user, UserSchema);
    user.password = bcrypt.hashSync(user.password, 10);

    mysqlPool.query('INSERT INTO users SET ?', user, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.insertId);
      }
    });
  });
};

/*
 * Fetch a user from the DB based on user ID.
 */
exports.getUserById = (id, includePassword=false) => {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM users WHERE id = ?',
      [ id ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results[0] && !includePassword) {
            delete results[0].password;
          }
          resolve(results[0]);
        }
      }
    );
  });
};

exports.getInstructorCoursesById = (id) => {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT id FROM courses WHERE instructor_id = ?',
      [ id ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          // for each element, instead of `{ id: 123 }`, use `123`
          for (var i = 0, len = results.length; i < len; i++) {
            results[i] = results[i].id;
          }
          resolve(results);
        }
      }
    );
  });
};

exports.getStudentCoursesById = (id) => {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT course_id FROM courses_students WHERE student_id = ?',
      [ id ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          // for each element, instead of `{ course_id: 123 }`, use `123`
          for (var i = 0, len = results.length; i < len; i++) {
            results[i] = results[i].course_id;
          }
          resolve(results);
        }
      }
    );
  });
};

function getUserByEmail (email, includePassword=false) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM users WHERE email = ?',
      [ email ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results[0] && !includePassword) {
            delete results[0].password;
          }
          resolve(results[0]);
        }
      }
    );
  });
}
exports.getUserByEmail = getUserByEmail;

exports.validateUser = async (email, password) => {
  const user = await getUserByEmail(email, true);
  const authenticated = user && await bcrypt.compare(password, user.password);
  return authenticated;
};
