require('dotenv').config();  // load environment variables from .env
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const api = require('./api');
const { connectToDB } = require('./lib/mongo');
const { rateLimit } = require('./api/rate_limiting');

const app = express();
const port = process.env.PORT || 8000;

/*
 * Morgan is a popular logger.
 */
app.use(morgan('dev'));

app.use(bodyParser.json());
app.use(express.static('public'));

/*
 * Limit number of requests per minutes based on IP address and Timestamp
 */
const limit_requests_rate = parseInt(process.env.LIMIT_REQUEST_RATE) && 1;
if (limit_requests_rate) {
  app.use(rateLimit);
}

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use('/', api);

/*
 * To respond with 404 error in any route handler middleware function, call
 *     next();
 */
app.use('*', (req, res) => {
  res.status(404).json({
    error: `Requested resource ${req.originalUrl} does not exist.`
  });
});

/*
 * To respond with 500 error in any route handler middleware function, call
 *     next(err);
 */
// eslint-disable-next-line no-unused-vars
app.use('*', (err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'An error occurred. Try again later.'
  });
});

connectToDB(async () => {
  app.listen(port, () => {
    console.log("== Tarpaulin is running on port", port);
  });
});
