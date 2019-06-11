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