
var expect = require('expect.js')
  , rel = require('../../lib/relationship')

describe('rel.getRelationships', function () {
  it('should get childAndParentsRelationships', function () {
    expect(rel.getRelationships({
      persons: [{id: 'one'}],
      childAndParentsRelationships: [{
        child: {resourceId: 'one'},
        father: {resourceId: 'two'},
        mother: {resourceId: 'three'}
      }, {
        child: {resourceId: 'four'},
        father: {resourceId: 'one'}
      }, {
        child: {resourceId: 'five'},
        mother: {resourceId: 'one'}
      }, {
        child: {resourceId: 'one'},
        mother: {resourceId: 'six'}
      }, {
        child: {resourceId: 'seven'},
        father: {resourceId: 'eight'},
        mother: {resourceId: 'one'}
      }]
    })).to.eql([
      {type: 'father', id: 'two'},
      {type: 'mother', id: 'three'},
      {type: 'child', id: 'four'},
      {type: 'child', id: 'five'},
      {type: 'mother', id: 'six'},
      {type: 'husband', id: 'eight'},
      {type: 'child', id: 'seven'}
    ])
  })
  it('should get relationships:parent', function () {
    expect(rel.getRelationships({
      persons: [{id: 'one'}],
      relationships: [{
        type: "http://gedcomx.org/ParentChild",
        person1: {resourceId: 'two'},
        person2: {resourceId: 'one'}
      }, {
        type: "http://gedcomx.org/ParentChild",
        person1: {resourceId: 'three'},
        person2: {resourceId: 'one'}
      }]
    })).to.eql([{type: 'parent', id: 'two'}, {type:'parent', id: 'three'}])
  })
  it('should get relationships:child', function () {
    expect(rel.getRelationships({
      persons: [{id: 'one'}],
      relationships: [{
        type: "http://gedcomx.org/ParentChild",
        person2: {resourceId: 'two'},
        person1: {resourceId: 'one'}
      }, {
        type: "http://gedcomx.org/ParentChild",
        person2: {resourceId: 'three'},
        person1: {resourceId: 'one'}
      }]
    })).to.eql([{type: 'child', id: 'two'}, {type:'child', id: 'three'}])
  })
  it('should get relationships:spouse', function () {
    expect(rel.getRelationships({
      persons: [{id: 'one'}],
      relationships: [{
        type: "http://gedcomx.org/Couple",
        person1: {resourceId: 'two'},
        person2: {resourceId: 'one'}
      }, {
        type: "http://gedcomx.org/Couple",
        person1: {resourceId: 'one'},
        person2: {resourceId: 'three'}
      }]
    })).to.eql([{type: 'spouse', id: 'two'}, {type:'spouse', id: 'three'}])
  })
  it('should get relationships:all', function () {
    expect(rel.getRelationships({
      persons: [{id: 'one'}],
      relationships: [{
        type: "http://gedcomx.org/Couple",
        person1: {resourceId: 'two'},
        person2: {resourceId: 'one'}
      }, {
        type: "http://gedcomx.org/ParentChild",
        person1: {resourceId: 'one'},
        person2: {resourceId: 'three'}
      }, {
        type: "http://gedcomx.org/ParentChild",
        person1: {resourceId: 'four'},
        person2: {resourceId: 'one'}
      }, {
        type: "http://gedcomx.org/Couple",
        person1: {resourceId: 'one'},
        person2: {resourceId: 'five'}
      }]
    })).to.eql([
     {type: 'spouse', id: 'two'},
     {type: 'child', id: 'three'},
     {type: 'parent', id: 'four'},
     {type:'spouse', id: 'five'}
    ])
  })
})


