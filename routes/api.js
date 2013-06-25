
var config = require('../config.yaml')
  , request = require('superagent')

  , debug = require('debug')('familyfound:api')
  , fs = require('familysearch').single();

var token = 'USYS0BE68484DB1264D7DD3146E6EDCC1358_naci-045-033.d.usys.fsglobal.net'

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
    return res.send(data);
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
