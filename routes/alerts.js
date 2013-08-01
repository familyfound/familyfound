var config = require('../lib/config')
  , request = require('superagent')
  , ObjectID = require('mongodb').ObjectID

  , api = require('./api')
  , getDb = require('../lib/db')
  , debugs = require('debug')
  , debug = debugs('familyfound:alerts')
  , error = debugs('familyfound:alerts:error')
  , fs = require('familysearch').single();

var posts = {
  remove: function (req, res) {
    var db = getDb();
    db.collection('todos').remove({
      _id: new ObjectID(req.body.id),
      user: req.session.userId
    }, function (err, doc) {
      if (err) {
        error('Alert not found', err);
        return res.send({error: 'alert not found'});
      }
      return res.send({success: true});
    });
  }
};

var gets = {
  list: function (req, res) {
    var db = getDb();
    db.collection('alerts').find({
      user: req.session.userId
    }).toArray(function (err, alerts) {
      if (err) {
        error('Error listing alerts', err);
        return res.send({error: 'Failed to list alers'});
      }
      res.send(alerts);
    });
  }
};
 
module.exports.addRoutes = function (app) {
  var name;
  for (name in posts) {
    if (!posts.hasOwnProperty(name)) continue;
    app.post('/api/alerts/' + name, api.checkLogin, posts[name]);
  }
  for (name in gets) {
    if (!gets.hasOwnProperty(name)) continue;
    app.get('/api/alerts/' + name, api.checkLogin, gets[name]);
  }
};
