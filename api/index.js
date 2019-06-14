const router = require('express').Router();

router.use('/users', require('./users'));
router.use('/courses', require('./courses'));
// router.use('/assignments', require('./assignments'));
// router.use('/submissions', require('./submissions'));

module.exports = router;
