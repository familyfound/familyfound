
var config = require('../lib/config')
  , request = require('superagent')

  , oauth = require('./oauth')
  , getDb = require('../lib/db')
  , debug = require('debug')('familyfound:api')
  , fs = require('familysearch').single();

function fscached(endpoint, data, token, done) {
  var db = getDb()
    , body = JSON.stringify(data)
  function gotten(err, data, res) {
    if (err) return done(err, data)
    db.collection('fs-endpoints').update({
      endpoint: endpoint,
      post: body
    }, {
      endpoint: endpoint,
      post: body,
      data: data,
      etag: res.header.etag,
      time: new Date()
    }, {upsert: true}, function () {
      done(err, data)
    })
  }
  
  db.collection('fs-endpoints').findOne({
    endpoint: endpoint,
    post: body
  }, function (err, cached) {
    if (err) {
      console.error('Error getting cached')
      return fs.get(endpoint, data, token, gotten)
    }
    if (!cached) return fs.get(endpoint, data, token, gotten)
    fs.get(endpoint, data, token, cached.etag, function (err, data, res) {
      if (res.status === 304) {
        return done(null, cached.data)
      }
      gotten(err, data, res)
    })
  })
      
}

function agespan(lifespan) {
  var parts = lifespan.split('-')
    , born = parseInt(parts[0], 10)
    , died = parseInt(parts[1], 10)
  if (isNaN(born) || isNaN(died)) return undefined
  return died - born
}

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
  if (person.display.lifespan) {
    person.display.age = agespan(person.display.lifespan)
  }
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
  fscached('person-with-relationships-query',
         {person: req.params.id},
         req.session.oauth.access_token,
         function (err, data) {
    if (err) {
      return res.send(401, {error: 'Not logged in'});
    }
    var person = parseRelations(data);
    getPersonData(req.params.id, req.session.userId, (req.body && req.body.line) ? req.body.line : null, function (err, data) {
      if (err) return res.send({error: 'Failed to get person data'});
      person.status = data.status;
      person.todos = data.todos;
      person.line = data.line;
      person.id = data.id;
      return res.send(person);
    });
  });
}

function getPersonData(person, user, line, next) {
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
      var data = {
        status: status ? status.status : 'inactive',
        line: status && status.line ? status.line : null,
        todos: todos,
        id: person
      }
      if (!line) return next(null, data);
      if (status) {
        return db.collection('status').update({_id: status._id}, {$set: {line: line}}, function (err, num) {
          if (err) console.error('failed to update status with line', err)
          if (!num) console.error('no docs updated: update status with line')
          next(null, data)
        })
      }
      db.collection('status').insert({
        user: user,
        person: person,
        status: 'inactive',
        line: line
      }, function (err) {
        if (err) console.error('failed to insert status with line', err)
        next(null, data)
      })
    });
  });
}

function getPerson(req, res) {
  getPersonData(req.params.id, req.session.userId, function (err, data) {
    if (err) return res.send({error: 'Failed to get person', details: err});
    res.send(data);
  });
}

function getPersonPhoto(req, res) {
  request.get('https://familysearch.org/artifactmanager/persons/personsByTreePersonId/' + req.params.id + '/summary')
    .set('Authorization', 'Bearer ' + req.session.oauth.access_token)
    .end(function (err, response) {
      if (err) return res.send({error: 'Failed to get photo', details: err});
      res.send(response.body);
    });
}

function setStatus(req, res) {
  var db = getDb();
  db.collection('status').update({
    person: req.body.id,
    user: req.session.userId
  }, {
    $set: {
      person: req.body.id,
      user: req.session.userId,
      status: req.body.status,
      modified: new Date()
    }
  }, {upsert: true}, function (err, doc) {
    if (err) return res.send({error: 'failed to save'});
    res.send({success: true});
  });
}

exports.addRoutes = function (app) {
  app.get('/api/person/photo/:id', oauth.checkLogin, getPersonPhoto);
  app.get('/api/person/relations/:id', oauth.checkLogin, getPersonRelations);
  app.post('/api/person/relations/:id', oauth.checkLogin, getPersonRelations);
  app.get('/api/person/:id', oauth.checkLogin, getPerson);
  app.post('/api/person/status', oauth.checkLogin, setStatus);
};
exports.checkLogin = oauth.checkLogin;
