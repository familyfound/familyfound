var config = require('../config.yaml')
  , request = require('superagent')
  , ObjectID = require('mongodb').ObjectID

  , api = require('./api')
  , getDb = require('../lib/db')
  , debugs = require('debug')
  , debug = debugs('familyfound:todos')
  , error = debugs('familyfound:todos:error')
  , fs = require('familysearch').single();

function upTodo(id, update, res) {
  var db = getDb();
  db.collection('todos').update({_id: new ObjectID(id)}, update, function (err, doc) {
    if (err) return res.send({error: 'error finding todo'});
    if (!doc) return res.send({error: 'todo not found'});
    res.send({success: true});
  });
}

function fireCompleted(db, todo, next) {
  return fireAlerts(db, todo, 'completed', next);
}

function fireAlerts(db, todo, message, next) {
  db.collection('alerts').insert(todo.watchers.map(function (uid) {
    return {
      user: uid,
      todo: todo._id,
      person: todo.person,
      message: message,
      created: new Date()
    };
  }), next);
}

var items = {
  watch: function (req, res) {
    upTodo(req.body.id, { $push: { watchers: req.session.userId } }, res);
  },
  unwatch: function (req, res) {
    upTodo(req.body.id, { $pull: { watchers: req.session.userId } }, res);
  },
  done: function (req, res) {
    var db = getDb();
    db.collection('todos').update({
      _id: new ObjectID(req.body.id)
    }, {
      $set: {
        completed: new Date(),
        completedBy: req.session.userId
      }
    }, function (err, doc) {
      if (err) return res.send({error: 'error finding todo'});
      if (!doc) return res.send({error: 'todo not found'});
      // send out alerts
      if (!doc.watchers || !doc.watchers.length) return res.send({success: true});
      fireCompleted(db, doc, function (err) {
        if (err) {
          error('failed to create alerts', err);
          return res.send({error: 'failed to create alerts'});
        }
        res.send({success: true});
      });
    });
  },
  undone: function (req, res) {
    upTodo(req.body.id, { $set: { completed: false, completedBy: null } }, res);
  },
  remove: function (req, res) {
    var db = getDb();
    db.collection('todos').remove({
      _id: new ObjectID(req.body.id),
      user: req.session.userId
    }, function (err, doc) {
      if (err) return res.send({error: 'could not delete'});
      return res.send({success: true});
    });
  },
  add: function (req, res) {
    var db = getDb()
      , todo = req.body;
    todo.user = req.session.userId;
    todo.watchers = [];
    db.collection('todos').insert(todo, function (err, items) {
      if (err) return res.send({error: 'failed to insert'});
      res.send({id: items[0]._id.toString()});
    });
  }
}

function personalize(uid, todos) {
  todos.forEach(function (todo) {
    uid.done = !!uid.completed;
    uid.watching = todo.watchers.indexOf(uid) !== -1;
  });
}

var gets = {
  list: function (req, res) {
    var db = getDb();
    db.collection('todos').find({
      user: req.session.userId
    }).toArray(function (err, owned) {
      if (err) {
        error('Error listing todos', err);
        return res.send({error: 'Failed to list todos'});
      }
      db.collection('todos').find({
        user: { $ne: req.session.userId },
        watchers: req.session.userId
      }).toArray(function (err, watching) {
        if (err) {
          error('Error getting watches', err);
          return res.send({error: 'Failed to get watching'});
        }
        res.send({
          owned: owned,
          watching: watching
        });
      });
    });
  }
};
 
module.exports.addRoutes = function (app) {
  for (var name in items) {
    if (!items.hasOwnProperty(name)) continue;
    app.post('/api/todos/' + name, api.checkLogin, items[name]);
  }
  for (var name in gets) {
    if (!gets.hasOwnProperty(name)) continue;
    app.get('/api/todos/' + name, api.checkLogin, gets[name]);
  }
};
