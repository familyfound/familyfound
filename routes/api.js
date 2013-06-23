
var config = require('../config.yaml')
  , request = require('superagent')

  , debug = require('debug')('familyfound:api')
  , fs = require('familysearch').single();

var token = 'USYS0BE68484DB1264D7DD3146E6EDCC1358_naci-045-033.d.usys.fsglobal.net'

function getPerson(req, res) {
  if (!req.params.id) return {error: 'no person id'};
  fs.get('persons-with-relationships', function (err, data) {
    debug('got', data);
    res.send({success: true});
  });
}

exports.addRoutes = function (app) {
  app.get('/api/person/:id', getPerson);
};
