
var config = require('../lib/config')
  , getDb = require('../lib/db')
  , api = require('./api')
  , Finder = require('../lib/relationship').Finder

  , async = require('async')

  , debug = require('debug')('familyfound:sockets')

module.exports = {
  attach: attach
}

function attach(io) {
  io.on('connection', function (socket) {
    new Sock(socket)
    // socket.on('find-related', findRelated.bind(socket))
  })
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
    'find-related': function (sid, myid, person) {
      this.sid = sid
      var finder = new Finder(api.fscached, sid, myid, person)
        , sock = this.sock
      finder.on('finished', function (line) {
        sock.emit('related-finished', line)
      })
      finder.on('cancelled', function (reason) {
        sock.emit('related-cancelled', reason)
      })
      finder.on('update', function (num, gens) {
        sock.emit('related-update', num, gens)
      })
      finder.on('error', function (error) {
        console.error('ERROR while finding relationship...')
      })
      finder.start()
    }
  }
}

