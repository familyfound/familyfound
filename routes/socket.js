
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

function Sock(sock) {
  this.sock = sock
  this.closed = false
  this.sid = null
  for (var name in this.events) {
    this.sock.on(name, this.events[name].bind(this))
  }
}

Sock.prototype = {
  events: {
    close: function () {
      this.closed = true
    },
    'find-related': function (sid, person) {
      this.sid = sid
  
    }

  }
}

