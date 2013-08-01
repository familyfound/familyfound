
var config = require('../lib/config')
  , request = require('superagent')

  , oauth = require('./oauth')
  , getDb = require('../lib/db')
  , debug = require('debug')('familyfound:api')
  , fs = require('familysearch').single();

function parseRelations(data) {
  var person = {
    display: data.persons[0].display,
    id: data.persons[0].id,
    mother: null,
    father: null,
    motherId: null,
    fatherId: null,
    multipleParents: false,
    families: {},
    familyIds: {}
  };
  var families = {};
  if (data.childAndParentsRelationships) {
    data.childAndParentsRelationships.forEach(function (rel) {
      if (rel.child && rel.child.resourceId === person.id) {
        if (rel.father && rel.father.resourceId) {
          if (person.fatherId) person.multipleParents = true;
          person.fatherId = rel.father.resourceId;
        }
        if (rel.mother && rel.mother.resourceId) {
          if (person.motherId) person.multipleParents = true;
          person.motherId = rel.mother.resourceId;
        }
        return;
      }
      var spouseId;
      if (rel.father && rel.father.resourceId !== person.id) {
        spouseId = rel.father.resourceId;
      } else if (rel.mother && rel.mother.resourceId !== person.id) {
        spouseId = rel.mother.resourceId;
      }
      if (!families[spouseId]) families[spouseId] = [spouseId];
      if (rel.child) {
        families[spouseId].push(rel.child.resourceId);
      }
    });
  }
  person.familyIds = families;
  return person;
}

function getPersonRelations(req, res) {
  if (!req.params.id) return {error: 'no person id'};
  fs.get('person-with-relationships-query',
         {person: req.params.id},
         req.session.oauth.access_token,
         function (err, data) {
    if (err) {
      return res.send(401, {error: 'Not logged in'});
    }
    var person = parseRelations(data);
    getPersonData(req.params.id, req.session.userId, function (err, data) {
      if (err) return res.send({error: 'Failed to get person data'});
      person.status = data.status;
      person.todos = data.todos;
      person.id = data.id;
      return res.send(person);
    });
  });
}

function getPersonData(person, user, next) {
  var db = getDb();
  db.collection('status').findOne({
    person: person,
    user: user
  }, function (err, status) {
    if (err) next(err);
    db.collection('todos').find({
      person: person
    }).toArray(function (err, todos) {
      if (err) return next(err);
      todos.forEach(function (todo) {
        todo.owned = todo.user === user;
        todo.watching = todo.watchers.indexOf(user) !== -1;
        todo.done = !!todo.completed;
        delete todo.watchers;
      });
      if (status && status.status === 'working') {
        status.status = 'inactive';
      }
      return next(null, {
        status: status ? status.status : 'inactive',
        todos: todos,
        id: person
      });
    });
  });
}

function getPerson(req, res) {
  getPersonData(req.params.id, req.session.userId, function (err, data) {
    if (err) return res.send({error: 'Failed to get person', details: err});
    res.send(data);
  });
}

function setStatus(req, res) {
  var db = getDb();
  db.collection('status').update({
    person: req.body.id,
    user: req.session.userId
  }, {
    person: req.body.id,
    user: req.session.userId,
    status: req.body.status,
    modified: new Date()
  }, {upsert: true}, function (err, doc) {
    if (err) return res.send({error: 'failed to save'});
    res.send({success: true});
  });
}

exports.addRoutes = function (app) {
  app.get('/api/person/relations/:id', oauth.checkLogin, getPersonRelations);
  app.get('/api/person/:id', oauth.checkLogin, getPerson);
  app.post('/api/person/status', oauth.checkLogin, setStatus);
};
exports.checkLogin = oauth.checkLogin;
