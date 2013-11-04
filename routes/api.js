
var config = require('../lib/config')
  , request = require('superagent')
  , util = require('util')

  , oauth = require('./oauth')
  , getDb = require('../lib/db')
  , debug = require('debug')('familyfound:api')
  , fs = require('familysearch').single();

function HError(code, message) {
  Error.call(this, message)
  this.code = code
}

util.inherits(HError, Error)

module.exports = {
  getPersonRelations: getPersonRelations,
  getPersonPhoto: getPersonPhoto,
  getPersonData: getPersonData,
  setStatus: setStatus,
  addRoutes: addRoutes,
  checkLogin: oauth.checkLogin
}

function killCache(endpoint, post, done) {
  var db = getDb()
  db.collection('fs-endpoints').remove({
    endpoint: endpoint,
    post: post
  }, done)
}

function fscached(endpoint, post, token, done) {
  var db = getDb()
  function gotten(err, data, res) {
    if (err) return done(err, data)
    db.collection('fs-endpoints').update({
      endpoint: endpoint,
      post: post
    }, {
      endpoint: endpoint,
      post: post,
      data: data,
      etag: res.header.etag,
      time: new Date()
    }, {upsert: true}, function () {
      done(err, data, res)
    })
  }
  
  db.collection('fs-endpoints').findOne({
    endpoint: endpoint,
    post: post
  }, function (err, cached) {
    if (err) {
      console.error('Error getting cached')
      return fs.get(endpoint, post, token, gotten)
    }
    if (!cached) return fs.get(endpoint, post, token, gotten)
    fs.get(endpoint, post, token, cached.etag, function (err, data, res) {
      if (err) return done(err)
      if (res.status === 304) {
        return done(null, cached.data, res)
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

function getSources(id, access_token, done) {
  if (!id) return done(new HError(400, 'No person id'))
  fscached('person-source-references-template', {pid: id}, access_token, function (err, data, resp) {
    if (err) {
      console.log('error getting sources', err, resp && resp.header, resp && resp.text)
      return done(new HError(401, 'Not logged in'))
    }
    // console.log('sources for', req.params.id, resp.header, resp.text)
    done(null, data.persons && data.persons[0].sources || [])
  })
}

function getPersonRelations(id, access_token, userId, line, done) {
  if (!id) return done(new HError(400, 'no person id'))
  fscached('person-with-relationships-query',
         {person: id},
         access_token,
         function (err, data, resp) {
    if (err) {
      console.error('error getting relations.', err)
      return done(new HError(401, 'Not logged in'))
    }
    if (!data.persons) {
      if (arguments[5] === true) {
        throw new HError(400, 'Loop! Looks like youre request is wrong.' + id)
      }
      console.error(id, data)
      if (resp) console.error(resp.header, resp.status, resp)
      console.error('Invalid relations data - probs from cache')
      return killCache('person-with-relationships-query',
         {person: id},
         function (err, data, resp) {
           return getPersonRelations(id, access_token, userId, line, done, true)
         })
    }
    var person = parseRelations(data);
    getPersonData(id, userId, line, function (err, data) {
      if (err) return done(new HError(500, 'Failed to get person data'))
      person.status = data.status;
      person.todos = data.todos;
      person.line = data.line;
      person.id = data.id;
      done(null, person);
    })
  })
}

function getPersonData(person, user, line, next) {
  if (arguments.length === 3) {
    next = line
    line = null
  }
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

function getPersonPhoto(id, access_token, done) {
  request.get('https://familysearch.org/artifactmanager/persons/personsByTreePersonId/' + id + '/summary')
    .set('Authorization', 'Bearer ' + access_token)
    .end(function (err, response) {
      if (err) return done(err)
      done(null, response.body)
    })
}

function setStatus(id, userId, status, done) {
  var db = getDb();
  db.collection('status').update({
    person: id,
    user: userId
  }, {
    $set: {
      person: id,
      user: userId,
      status: status,
      modified: new Date()
    }
  }, {upsert: true}, function (err, doc) {
    done(err)
  });
}

function addRoutes(app) {
  app.get('/api/person/photo/:id', oauth.checkLogin, function (req, res) {
    getPersonPhoto(req.params.id, req.session.oauth.access_token, function (err, data) {
      if (err) return res.send(err.code || 500, err.message)
      res.send(data)
    })
  });
  app.post('/api/person/status', oauth.checkLogin, function (req, res) {
    setStatus(req.body.id, req.session.userId, req.body.status, function (err) {
      if (err) return res.send(err.code || 500, err.message)
      res.send(204)
    })
  });
  app.get('/api/person/:id', oauth.checkLogin, function (req, res) {
    getPersonData(req.params.id, req.session.userId, function (err, data) {
      if (err) return res.send(err.code || 500, err.message)
      res.send(data);
    });
  });
  app.get('/api/person/sources/:id', oauth.checkLogin, function (req, res) {
    getSources(req.params.id, req.session.oauth.access_token, function (err, data) {
      if (err) return res.send(err.code || 500, err.message)
      res.send(data)
    })
  });
  app.get('/api/person/relations/:id', oauth.checkLogin, function (req, res) {
    getPersonRelations(req.params.id, req.session.oauth.access_token, req.session.userId, null, function (err, person) {
      if (err) return res.send(err.code || 500, err.message)
      res.send(person)
    })
  });
  app.post('/api/person/relations/:id', oauth.checkLogin, function (req, res) {
    getPersonRelations(req.params.id, req.session.oauth.access_token, req.session.userId, req.body.line, function (err, person) {
      if (err) return res.send(err.code || 500, err.message)
      res.send(person)
    })
  });
};
