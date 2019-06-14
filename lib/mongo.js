/*
 * Module for working with a MongoDB connection.
 */

const { MongoClient } = require('mongodb');

const mongoHost = process.env.MONGO_HOST;
const mongoPort = process.env.MONGO_PORT || 27017;
const mongoUser = process.env.MONGO_USER;
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoDBName = process.env.MONGO_DATABASE;

const mongoUrl = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDBName}`;
//console.log('== mongoUrl:', mongoUrl);
let db = null;

exports.connectToDB = function (callback) {
  MongoClient.connect(mongoUrl, { useNewUrlParser: true }, (err, client) => {
    if (err) {
      throw err;
    }
    //console.log('== connectToDB: mongoDBName:', mongoDBName);
    db = client.db(mongoDBName);
    //console.log('== connectToDB: db:', db);
    callback();
  });
};

exports.getDBReference = function () {
  //console.log('== getDBReference: db:', db);
  return db;
};
