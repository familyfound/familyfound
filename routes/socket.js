
var config = require('../lib/config')
  , getDb = require('../lib/db')
  , api = require('./api')

  , async = require('async')

  , debug = require('debug')('familyfound:sockets')

module.exports = {
  attach: attach
}

function attach(io) {
  io.on('connection', function (socket) {
    socket.on('find-related', findRelated.bind(socket))
  })
}

function findRelated(sid, person) {
}

