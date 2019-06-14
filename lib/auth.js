/*
 * Auth stuff.
 */

const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET_KEY;

exports.generateAuthToken = function (userId, userRole) {
  const payload = {
    sub: userId,
    role: userRole
  };
  const token = jwt.sign(payload, secretKey, { expiresIn: '24h' });
  return token;
};

/* Jumps to the next middleware function if and only if there is a JWT provided
 * and this provided token is valid. Otherwise, responds with 401.
 *
 * Put this function before the middleware handler of any route that needs
 * user authentication.
 */
exports.requireAuthentication = function (req, res, next) {
  const authHeader = req.get('Authorization') || '';
  const authHeaderParts = authHeader.split(' ');
  const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;

  try {
    const payload = jwt.verify(token, secretKey);
    req.authenticatedUserId = payload.sub;
    req.authenticatedUserRole = payload.role;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(401).send({
      error: 'The provided authentication token was invalid.'
    });
  }
};

/*
 * Returns true if current user is logged in and has the required role.
 * Returns false otherwise.
 *
 * Use this function when initial authentication isn't required for the route
 * but a part of the function of the route requires certain roles.For instance,
 * creating a user does not require authentication, but creating an admin or
 * an instructor requires admin privileges.
 *
 * Most of the time, the route already has `requireAuthentication` put before
 * its route handler. So, don't use this function; instead, perform this check:
 *     req.authenticatedUserRole === 'WHATEVER_ROLE'
 * to quickly validate the role of the logged in user.
 */
exports.validateRole = (req, requiredRole) => {
  const authHeader = req.get('Authorization') || '';
  const authHeaderParts = authHeader.split(' ');
  const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;

  try {
    const payload = jwt.verify(token, secretKey);
    req.authenticatedUserId = payload.sub;
    req.authenticatedUserRole = payload.role;
    if (payload.role !== requiredRole) {
      console.error(`Role validation error: User is not a(n) ${requiredRole}.`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Role validation error:', err);
    return false;
  }
};
