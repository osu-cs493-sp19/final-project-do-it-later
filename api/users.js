const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const { generateAuthToken, requireAuthentication, isAdmin } = require('../lib/auth');

const { userSchema, insertNewUser, validateUser, getUserById, getUserByEmail, getInstructorCoursesById, getStudentCoursesById } = require('../models/user');

router.post('/', async (req, res) => {
  if (validateAgainstSchema(req.body, userSchema)) {
    if (req.body.role == "admin"){
      const status = await isAdmin(req)
      if (status == false){
        res.status(401).send({
          error: "Invalid authentication token provided."
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
      res.status(500).send({
        error: "Error inserting user into DB.  Please try again later."
      });
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid user object"
    });
  }    
});

router.post('/login', async (req, res) => {
  if (req.body && req.body.email && req.body.password) {
    try {
      const authenticated = await validateUser(req.body.email, req.body.password);
      if (authenticated) {
        const user = await getUserByEmail(req.body.email);
        const token = generateAuthToken(user.id);
        res.status(200).send({
          token: token
        });
      } else {
        res.status(401).send({
          error: "Invalid credentials"
        });
      }
    } catch (err) {
      res.status(500).send({
        error: "Error validating user.  Try again later."
      });
    }
  } else {
    res.status(400).send({
      error: "Request body was invalid"
    });
  }
});

/*
  * Route to list all of a user's info excluding password
  */
router.get('/:id', requireAuthentication, async (req, res, next) => {
  const reqUser = await getUserById(req.authenticatedUserId)
  if (req.params.id == req.authenticatedUserId || reqUser.role == "admin") {
    try {
      var user = await getUserById(parseInt(req.params.id));
      if (user) {
        delete user.password
        if (user.role == "instructor"){
          const instructorCourseIds = await getInstructorCoursesById(parseInt(req.params.id));
          user.courses = instructorCourseIds;
        }
        else if (user.role == "student"){
          const studentCourseIds = await getStudentCoursesById(parseInt(req.params.id));
          user.courses = studentCourseIds
        }
        res.status(200).send({ user });
      } else {
        next();
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Unable to fetch users.  Please try again later."
      });
    }
  } else {
    res.status(403).send({
      error: "Unauthorized to access the specified resource"
    });
  }
});

module.exports = router;