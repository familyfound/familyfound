
var mdb = require('mongodb')
  , MongoClient = mdb.MongoClient
  , Server = mdb.Server
  , debugs = require('debug')
  , debug = debugs('familyfound:db')
  , error = debugs('familyfound:db:error')
  , config = require('../config.yaml')
  , _db = null;

module.exports = function () {
  if (!_db) {
    throw new Error('Mongo connection not yet initialized');
  }
  return _db;
};

module.exports.onload = function (next) {
  MongoClient.connect(config.MONGO, function (err, db) {
    if (err) {
      return error('Unable to connect to db');
    }
    debug('Connected to db');
    _db = db;
    return next(db);
  });
};
