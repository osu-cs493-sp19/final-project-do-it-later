const bcrypt = require('bcryptjs');
const mysqlPool = require('../lib/mysqlPool');
const { extractValidFields } = require('../lib/validation');

// `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
// `name` VARCHAR(255) NOT NULL,
// `email` VARCHAR(255) NOT NULL,
// `password` VARCHAR(255) NOT NULL,
// `role` VARCHAR(10) NOT NULL,

const userSchema = {
  id: { required: true },
  name: { required: true },
  email: { required: true },
  password: { required: true },
  role: {required: true}
};
exports.userSchema = userSchema

exports.insertNewUser = async (user) => {
    user = extractValidFields(user, userSchema);
    user.password = await bcrypt.hash(user.password, 8);
  
    return new Promise((resolve, reject) => {
        mysqlPool.query(
          'INSERT INTO users SET ?',
          user,
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result.insertId);
            }
          }
        );
      });
    }
/*
 * Fetch a user from the DB based on user ID.
 */
exports.getUserById = async (id) => {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM users WHERE id = ?',
      [ id ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results[0]);
        }
      }
    );
  });
};

exports.getInstructorCoursesById = async (id) => {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT id FROM courses WHERE instructor_id = ?',
      [ id ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
};

exports.getStudentCoursesById = async (id) => {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT course_id FROM courses_students WHERE student_id = ?',
      [ id ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
};


function getUserByEmail (email) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM users WHERE email = ?',
      [ email ],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results[0]);
        }
      }
    );
  });
};
exports.getUserByEmail = getUserByEmail;

exports.validateUser = async (email, password) => {
  const user = await getUserByEmail(email);
  const authenticated = user && await bcrypt.compare(password, user.password);
  return authenticated;
};