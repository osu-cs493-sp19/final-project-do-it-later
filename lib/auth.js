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
    req.authenticatedUserId = payload.sub;
    next();
  } catch (err) {
    console.error('-- Authentication error:', err);
    res.status(401).send({
      error: 'The provided authentication token was invalid.'
    });
  }
};

exports.isAdmin = async (req) => {
  const authHeader = req.get('Authorization') || '';
  const authHeaderParts = authHeader.split(' ');
  const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;

  try {
    const payload = jwt.verify(token, secretKey);
    req.authenticatedUserId = payload.sub;
    const authenticatedUser = await getUserById(req.authenticatedUserId);
    if (authenticatedUser.role !== 'admin') {
      console.error('-- Admin authentication error: User is not an admin.');
      return false;
    }
    return true;
  } catch (err) {
    console.error('-- Admin authentication error:', err);
    return false;
  }
};
