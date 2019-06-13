/*
 * Auth stuff.
 */

const jwt = require('jsonwebtoken');
const { getUserById } = require('../models/user');
const secretKey = process.env.JWT_SECRET_KEY;

exports.generateAuthToken = function (userId) {
  const payload = {
    sub: userId
  };
  const token = jwt.sign(payload, secretKey, { expiresIn: '24h' });
  return token;
};

exports.requireAuthentication = function (req, res, next) {
  const authHeader = req.get('Authorization') || '';
  const authHeaderParts = authHeader.split(' ');
  const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;

  try {
    const payload = jwt.verify(token, secretKey);
<<<<<<< HEAD
    req.user = payload.sub;
    console.log(req.user)
=======
    req.authenticatedUserId = payload.sub;
>>>>>>> origin/master
    next();
  } catch (err) {
    console.error("  -- error:", err);
    res.status(401).send({
      error: "Invalid authentication token provided."
    });
  }
};

exports.isAdmin = async (req, res, next) => {
  const authHeader = req.get('Authorization') || '';
  const authHeaderParts = authHeader.split(' ');
  const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;

  try {
    const payload = jwt.verify(token, secretKey);
    req.user = payload.sub;
    const user = await getUserById(req.user)
    console.log(user)
    if (user.role !== "admin"){
      console.error("  -- error: user role is not admin");
      return false;
    }
    return true;
  } catch (err) {
    console.error("  -- error:", err);
    return false;
  }
};
