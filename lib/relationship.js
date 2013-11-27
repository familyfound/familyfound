
var EventEmitter = require('events').EventEmitter
  , _ = require('lodash')
  , debug = require('debug')('familyfound:relationship')
  , util = require('util')

module.exports = {
  Finder: Finder,
  getRelationships: getRelationships
}

// TODO fiddle with these
var DEFAULT_LIFESPAN = 30
var DEFAULT_PARENT_DIFF = 50
var MAX_PROCESSING = 20
var MAX_ERRORS = 10
var MAX_CRAWLED = 5000

// find relationships
function Finder(fscached, token, myid, person) {
  this.fs = fscached
  this.token = token
  this.base = person
  this.cancelled = false
  this.done = false
  this.crawled = 0
  this.gensCrawled = 0
  this.ancestors = {}
  this.queue = []
  // these are picked up, but not crawled further
  this.spousesAndChildren = {}
  this.ancestors[myid] = {
    id: myid,
    from: null,
    rel: null,
    side: 'me',
    fromYear: null,
    depth: 0,
    state: 'queued'
  }
  this.ancestors[person] = {
    id: person,
    from: null,
    rel: null,
    side: 'them',
    fromYear: null,
    depth: 0,
    state: 'queued'
  }
  this.processing = 0
  this.max = MAX_PROCESSING
  this.maxCrawled = MAX_CRAWLED
  this.errors = 0
  this.maxErrors = MAX_ERRORS
  this.myid = myid
  this.otherid = person
}

util.inherits(Finder, EventEmitter)

_.extend(Finder.prototype, {
  start: function () {
    this.enqueue(this.myid)
    this.enqueue(this.otherid)
  },
  // mostly good
  enqueue: function (id) {
    var person = this.ancestors[id]
    if (this.processing < this.max) {
      debug('queue: straight', this.processing, this.max, id, person)
      return this.process(person)
    }
    debug('queue: wait', this.processing, this.max, id, person)
    this.queue.push(person)
    this.queue.sort(function (a, b) {
      return b.fromYear - a.fromYear
    })
    // TODO sort the queue by fromYear
  },
  // good
  process: function (person) {
    if (this.cancelled || this.done) return
    this.processing += 1
    var self = this
    this.getPerson(person, function (err) {
      debug('got', person.id, person)
      if (self.cancelled || self.done) return
      if (err) {
        console.error('ERROR while getting', person, err)
        self.emit('error', err)
        self.errors += 1
        if (self.errors > self.maxErrors) {
          self.cancelled = true
          self.emit('cancelled', 'too many errors')
          return
        }
      }
      if (self.crawled >= self.maxCrawled) {
        self.cancelled = true
        self.emit('cancelled', 'Reach crawl limit: ' + self.maxCrawled)
        return
      }
      self.processing -= 1
      if (self.processing < self.max && self.queue.length) {
        debug('reprocess', self.processing, self.max, self.queue.length)
        self.process(self.queue.shift())
      } else if (!self.queue.length && !self.processing) {
        self.cancelled = true
        self.emit('cancelled', 'All relationships exhausted')
      }
    })
  },
  getPerson: function (person, done) {
    if (this.cancelled || this.done) return
    var self = this
    person.state = 'processing'
    this.fs('person-with-relationships-query', {person: person.id}, this.token, function (err, data, resp) {
      if (self.cancelled || self.done) return
      if (err) {
        if (err.code === 401) {
          self.cancelled = true
          debug('Not Authorized', person.id, this.token, err, resp)
          self.emit('cancelled', 'Not authorized')
          return
        }
        debug('Error getting person', person.id, person.from, err.message, err.stack, err)
        person.error = err.message
        return done(err)
      }
      self.emit('update', self.crawled, self.gensCrawled)
      person.state = 'done'
      if (!data.persons || !data.persons.length) {
        debug('No persons...', person.id, person.from)
        person.error = 'No persons'
        return done()
      }
      person.display = data.persons[0].display
      // TODO should I not save rels? and let them just be collected...
      person.rels = getRelationships(data)
      person.year = getYear(data) || person.fromYear + DEFAULT_PARENT_DIFF
      person.rels.forEach(function (rel) {
        if (self.cancelled || self.done) return
        self.handleRel(person, rel)
      })
      done()
    })
  },
  // returns a side
  has: function (id) {
    return this.ancestors[id] || this.spousesAndChildren[id] 
  },
  handleRel: function (person, rel) {
    var has = this.has(rel.id)
    if (has) {
      if (has.side !== person.side) {
        debug('CONNECTION')
        this.done = true
        return this.finishIt(person, rel)
      }
      return
    }
    this.crawled += 1
    if (['father', 'mother', 'parent'].indexOf(rel.type) === -1 && (person.depth || ['wife', 'husband', 'spouse'].indexOf(rel.type) === -1)) {
      this.spousesAndChildren[rel.id] = {
        id: rel.id,
        from: person.id,
        rel: rel.type,
        side: person.side,
        depth: person.depth
      }
      return
    }
    if (person.depth + 1 > this.gensCrawled) {
      this.gensCrawled = person.depth + 1
    }
    this.ancestors[rel.id] = {
      id: rel.id,
      from: person.id,
      rel: rel.type,
      side: person.side,
      depth: person.depth + 1,
      fromYear: person.year,
      state: 'queued'
    }
    this.enqueue(rel.id)
  },
  getDisplay: function (id, done) {
    if (this.ancestors[id] && this.ancestors[id].display) return done(this.ancestors[id].display)
    this.fs('person-with-relationships-query', {person: id}, this.token, function (err, data, resp) {
      done(data.persons[0].display)
    })
  },
  finishIt: function (person, rel) {
    var has = this.has(rel.id)
      , self = this
    this.done = true
    this.getDisplay(rel.id, function (display) {
      var line = {
        up: [],
        down: [],
        link: {rel: has.rel, id: rel.id, display: display, link: rel.type}
      }
      if (person.side != 'me') {
        var th = person
        person = has
        has = th
      }

      // line.down.push({rel: has.rel, id: rel.id, display: display, link: rel.type})
      while (has.rel !== null) {
        has = self.ancestors[has.from]
        line.down.push({rel: has.rel, id: has.id, display: has.display})
      }

      if (person.display) {
        line.up.push({rel: person.rel, id: person.id, display: person.display})
      }
      while (person.rel !== null) {
        person = self.ancestors[person.from]
        line.up.push({rel: person.rel, id: person.id, display: person.display})
      }
      self.emit('finished', line)
    })
  }
})

function getYear(data) {
  if (!data.persons.length) return
  var display = data.persons[0].display
    , year
  if (!display) return
  if (display.birthDate && (year = display.birthDate.match(/\d{4}/))) {
    return parseInt(year, 10)
  }
  if (display.deathDate && (year = display.deathDate.match(/\d{4}/))) {
    return parseInt(year, 10) - DEFAULT_LIFESPAN
  }
}

function getRelationships(data) {
  var base = data.persons[0].id
    , ids = {}
    , rels = []
  function add(type, id) {
    if (ids[id]) return
    ids[id] = true
    rels.push({type: type, id: id})
  }
  if (data.childAndParentsRelationships) {
    data.childAndParentsRelationships.forEach(function (rel) {
      // I'm the child
      if (rel.child && rel.child.resourceId === base) {
        if (rel.father && rel.father.resourceId) {
          add('father', rel.father.resourceId)
        }
        if (rel.mother && rel.mother.resourceId) {
          add('mother', rel.mother.resourceId)
        }
        return
      }
      // I'm a parent
      if (rel.father && rel.father.resourceId !== base) {
        add('husband', rel.father.resourceId)
      } else if (rel.mother && rel.mother.resourceId !== base) {
        add('wife', rel.mother.resourceId)
      }
      if (rel.child && rel.child.resourceId) {
        add('child', rel.child.resourceId)
      }
    })
  }
  if (data.relationships) {
    data.relationships.forEach(function (rel) {
      if (rel.type === "http://gedcomx.org/Couple") {
        if (rel.person1.resourceId !== base) {
          add('spouse', rel.person1.resourceId)
        } else {
          add('spouse', rel.person2.resourceId)
        }
      } else if (rel.type === "http://gedcomx.org/ParentChild") {
        if (rel.person1.resourceId !== base) {
          add('parent', rel.person1.resourceId)
        } else {
          add('child', rel.person2.resourceId)
        }
      }
    })
  }
  return rels
}
