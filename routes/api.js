
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
  
function parsePerson(data) {
  var person = {
    display: data.persons[0].display,
    id: data.persons[0].id,
    mother: null,
    father: null,
    motherId: null,
    fatherId: null
  };
  data.childAndParentsRelationships.every(function (rel) {
    if (person.motherId && person.fatherId) return false;
    if (rel.child.resourceId !== person.id) return true;
    if (rel.father && rel.father.resourceId) {
      person.fatherId = rel.father.resourceId;
    }
    if (rel.mother && rel.mother.resourceId) {
      person.motherId = rel.mother.resourceId;
    }
  });
  return person;
};

function getPerson(req, res) {
  if (!req.params.id) return {error: 'no person id'};
  fs.get('person-with-relationships-query',
         {person: req.params.id},
         req.session.oauth.access_token,
         function (err, data) {
    if (err) {
      return res.send(401, {error: 'Not logged in'});
    }
    debug('got', data);
    return res.send(parsePerson(data));
  });
}

function checkToken(req, res, next) {
  if (!req.session.oauth || !req.session.oauth.access_token) {
    return res.send(401, {error: 'Not logged in'});
  }
  next();
}

exports.addRoutes = function (app) {
  app.get('/api/person/:id', checkToken, getPerson);
};
