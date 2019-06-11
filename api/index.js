const router = require('express').Router();

router.use('/courses', require('./courses'));

module.exports = router;
