const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const {
  generateAuthToken,
  requireAuthentication,
  validateRole
} = require('../lib/auth');
const {
  UserSchema,
  insertNewUser,
  validateUser,
  getUserById,
  getUserByEmail,
  getInstructorCoursesById,
  getStudentCoursesById
} = require('../models/user');

router.post('/', async (req, res) => {
  if (validateAgainstSchema(req.body, UserSchema)) {
    if (req.body.role === 'admin' || req.body.role === 'instructor') {
      // must be an admin to create new admins and instructors
      const isAdmin = validateRole(req, 'admin');
      if (!isAdmin) {
        res.status(401).send({
          error: 'Only admins can create new admins and instructors.'
        });
        return;
      }
    }

    try {
      const id = await insertNewUser(req.body);
      res.status(201).send({
        id: id
      });
    } catch (err) {
      console.error(err);
      if (err && err.code === 'ER_DUP_ENTRY') {
        res.status(409).send({
          error: 'Email already exists.'
        });
      } else if (err && err.code === 'ER_DATA_TOO_LONG') {
        res.status(400).send({
          error: 'Some fields in the request body exceed the limits.'
        });
      } else {
        console.error(err);
        res.status(500).send({
          error: 'Error inserting user into DB. Please try again later.'
        });
      }
    }
  } else {
    res.status(400).send({
      error: 'Request body is not a valid User object.'
    });
  }
});

router.post('/login', async (req, res) => {
  if (req.body && req.body.email && req.body.password) {
    try {
      const authenticated = await validateUser(req.body.email, req.body.password);
      if (authenticated) {
        const user = await getUserByEmail(req.body.email);
        const token = generateAuthToken(user.id, user.role);
        res.status(200).send({
          token: token
        });
      } else {
        res.status(401).send({
          error: 'The provided credentials were invalid.'
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: 'Error validating user. Please try again later.'
      });
    }
  } else {
    res.status(400).send({
      error: 'Please provide an email and a password.'
    });
  }
});

/*
 * Route to list all of a user's info excluding password
 */
router.get('/:id', requireAuthentication, async (req, res, next) => {
  const id = parseInt(req.params.id);

  try {
    // name these two objects differently to avoid confusion
    const requestedUser = await getUserById(id);

    // check existence of the requested user before checking authorization
    if (requestedUser) {
      // admins can see everything. Current logged in user can only see data
      // of themselves
      if (id === req.authenticatedUserId ||
          req.authenticatedUserRole === 'admin') {
        if (requestedUser.role === 'instructor') {
          // instructors can see the courses they teach
          const instructorCourseIds = await getInstructorCoursesById(id);
          requestedUser.courses = instructorCourseIds;
        } else if (requestedUser.role === 'student') {
          // students can see the courses they enroll in
          const studentCourseIds = await getStudentCoursesById(id);
          requestedUser.courses = studentCourseIds;
        }
        res.status(200).send(requestedUser);
      } else {
        res.status(403).send({
          error: 'Unauthorized to access the specified resource.'
        });
      }
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to fetch users. Please try again later.'
    });
  }
});

module.exports = router;
