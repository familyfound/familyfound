
var config = require('../config.yaml')
  , request = require('superagent')

  , getDb = require('../lib/db')
  , debug = require('debug')('familyfound:api')
  , fs = require('familysearch').single();

function checkLogin(req, res, next) {
  if (!req.session.oauth || !req.session.oauth.access_token) {
    return res.send(401, {error: 'Not logged in'});
  }
  return next();
}

function getPerson(req, res) {
  if (!req.params.id) return {error: 'no person id'};
  fs.get('person-with-relationships-query',
         {person: req.params.id},
         req.session.oauth.access_token,
         function (err, data) {
    debug('got', data);
    res.send(data);
  });
}

/*
function addTodo(req, res) {
  var db = getDb();
  db.collection('todos').insert(
  */

exports.addRoutes = function (app) {
  app.get('/api/person/:id', checkLogin, getPerson);
};
