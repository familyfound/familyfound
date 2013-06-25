var config = require('../config.yaml')
  , request = require('superagent')
  , ObjectID = require('mongodb').ObjectID

  , api = require('./api')
  , getDb = require('../lib/db')
  , debug = require('debug')('familyfound:api')
  , fs = require('familysearch').single();

function upTodo(id, update, res) {
  var db = getDb();
  db.collection('todos').update({_id: new ObjectID(id)}, update, function (err, doc) {
    if (err) return res.send({error: 'error finding todo'});
    if (!doc) return res.send({error: 'todo not found'});
    res.send({success: true});
  });
}

var items = {
  watch: function (req, res) {
    upTodo(req.body.id, { $push: { watchers: req.session.userId } }, res);
  },
  unwatch: function (req, res) {
    upTodo(req.body.id, { $pull: { watchers: req.session.userId } }, res);
  },
  done: function (req, res) {
    upTodo(req.body.id, { $set: { completed: new Date(),
                                  completedBy: req.session.userId } }, res);
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
    todo.watchers = [todo.user];
    db.collection('todos').insert(todo, function (err, items) {
      if (err) return res.send({error: 'failed to insert'});
      res.send({id: items[0]._id.toString()});
    });
  }
};
 
module.exports.addRoutes = function (app) {
  for (var name in items) {
    if (!items.hasOwnProperty(name)) continue;
    app.post('/api/todos/' + name, api.checkLogin, items[name]);
  }
};
