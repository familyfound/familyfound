
var EventEmitter = require('events').EventEmitter
  , _ = require('lodash')
  , debug = require('debug')('familyfound:relationship')
  , util = require('util')

module.exports = {
  Finder: Finder,
  getRelationships: getRelationships
}

// find relationships
function Finder(fscached, token, person) {
  this.fs = fscached
  this.token = token
  this.base = person
  this.cancelled = false
  this.crawled = 0
  this.ancestors = {}
  this.freshAncestors = []
  // these are picked up, but not crawled further
  this.spousesAndChildren = {}
}

util.inherits(Finder, EventEmitter)

_.extend(Finder.prototype, {
  start: function () {
    j
  },
  getPerson: function (id, from, gotten) {
    this.fs('person-with-relationships-query', {person: id}, this.token, function (err, data, resp) {
      if (err) {
        debug('Error getting person', id, from, err.message, err.stack)
        return gotten(err)
      }
      if (!data.persons) {
        debug('No persons...', id, from)
        return gotten()
      }
    })
  },
  has: function (id) {
    return this.ancestors[id] || this.spousesAndChildren[id]
  },
  parseData: function (data) {
    var self = this
    /*
    var base = data.persons[0].id
    if (data.childAndParentsRelationships) {
      data.childAndParentsRelationships.forEach(function (rel) {
        // I'm the child
        if (rel.child && rel.child.resourceId === base) {
          if (rel.father && rel.father.resourceId && !self.has(rel.father.resourceId)) {
            self.freshAncestors.push({
      })
      */
  }
})

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
