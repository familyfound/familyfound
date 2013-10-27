
var diagnostics = [
      generalChecks,
      checkFamily,
      checkMoreFamily,
      multipleParents,
      sharedChildren
    ]
  , classes = {
      data: ['poor-data', 'bad-data'],
      research: ['possible-research', 'probable-research']
    }

module.exports = {
  diagnose: diagnose,
  classify: classify,
  classes: classes,
  diagnostics: diagnostics
}

function classify(datai, researchi, diags) {
  var i
  if (datai) {
    for (i=0; i<classes.data.length; i++) {
      datai.classed(classes.data[i], false)
    }
    if (diags.data.level) {
      datai.classed(classes.data[diags.data.level - 1], true)
    }
    datai.classed('shown', diags.data.level > 0)
  }
  if (!researchi) return
  for (i=0; i<classes.research.length; i++) {
    researchi.classed(classes.research[i], false)
  }
  if (diags.research.level) {
    researchi.classed(classes.research[diags.research.level - 1], true)
  }
  researchi.classed('shown', diags.research.level > 0)
}

function update(one, two) {
  if (!two) return
  if (!one.info) one.info = []
  if (!one.level) one.level = NONE
  one.info = one.info.concat(two.info || [])
  if (two.level > one.level) one.level = two.level
}

function upboth(one, two) {
  if (!two) return
  if (two.data) update(one.data, two.data)
  if (two.research) update(one.research, two.research)
}

var NONE = 0
  , MINOR = 1
  , MAJOR = 2

function diagnose(person) {
  var diags = {data: {}, research: {}}
    , tmp
  for (var i=0; i<diagnostics.length; i++) {
    tmp = diagnostics[i](person)
    if (!tmp) continue;
    upboth(diags, tmp)
  }
  return diags
}

function generalChecks(person) {
  var rage = ageRange(person.display.lifespan)
    , data = {}
  if (rage[0] && rage[1] && rage[0] > rage[1]) {
    update(data, {
      level: MAJOR,
      info: {level: MAJOR, text: 'Death date before birth date'}
    })
  }
  return {data: data}
}
  

function multipleParents(person) {
  if (!person.multipleParents) return
  return {
    data: {
      level: MAJOR,
      info: {level: MAJOR, text: 'Multiple sets of parents'}
    }
  }
}

function sharedChildren(person) {
  var seen = {}
    , shared = false
    , id
  outer : for (var spouse in person.familyIds) {
    for (var i=1; i<person.familyIds[spouse].length; i++) {
      id = person.familyIds[spouse][i]
      if (seen[id]) {
        shared = true
        break outer
      }
      seen[id] = true
    }
  }
  if (!shared) return
  return {
    data: {
      level: MAJOR,
      info: {level: MAJOR, text: 'A child is associated with multiple spouses'}
    }
  }
}

function ageRange(range) {
  var parts = range.split('-')
  return parts.map(function (p) {
    return parseInt(p, 10) || false
  })
}

function compareSpouse(person, spouse) {
  if (!spouse) return
  var gender = person.display && person.display.gender || 'Male'
    , man = gender === 'Male' ? person : spouse
    , woman = gender === 'Male' ? spouse : person
    , mage = ageRange(man.display.lifespan)
    , wage = ageRange(woman.display.lifespan)
    , data = {}
    , l
  if (wage[0] && mage[0]) {
    if (wage[0] - mage[0] > 10) {
      l = wage[0] - mage[0] > 20 ? MAJOR : MINOR
      update(data, {
        level: l,
        info: {level: l, text: l === MAJOR ? 'Wife is significantly older' : 'Wife is much older'}
      })
    }
    if (mage[0] - wage[0] > 30) {
      l = mage[0] - wage[0] > 50 ? MAJOR : MINOR
      update(data, {
        level: l,
        info: {level: l, text: l === MAJOR ? 'Husband is significantly older' : 'Husband is >50 years older'}
      })
    }
  }
  if (mage[1] && wage[0] && mage[1] < wage[0] + 15) {
    update(data, {
      level: MAJOR,
      info: {level: MAJOR, text: 'Husband died before wife ' + (mage[1] < wage[0] ? 'was born' : 'was 15')}
    })
  }
  if (mage[0] && wage[1] && wage[1] < mage[0] + 15) {
    update(data, {
      level: MAJOR,
      info: {level: MAJOR, text: 'Wife died before husband ' + (mage[1] < wage[0] ? 'was born' : 'was 15')}
    })
  }
  return {
    data: data
  }
}

function compareChild(person, child) {
  if (!child) return
  var page = ageRange(person.display.lifespan)
    , cage = ageRange(child.display.lifespan)
    , data = {}
    , l
  if (cage[0] && page[0] && cage[0] < page[0] + 15) {
    update(data, {
      level: MAJOR,
      info: {level: MAJOR, text: 'Child was born before this person ' + (cage[1] < page[0] ? 'was born' : 'was 15')}
    })
  }
  if (page[1] && cage[0] && page[1] < cage[0]) {
    update(data, {
      level: MAJOR,
      info: {level: MAJOR, text: 'Person died before child was born'}
    })
  }
  if (cage[0] - page[0] > 40) {
    l = cage[0] - page[0] > 50 ? MAJOR : MINOR
    update(data, {
      level: l,
      info: {level: l, text: 'Child born when person was over ' + (l === MAJOR ? '50' : '40')}
    })
  }
  return {data: data}
}

function checkMoreFamily(person) {
  if (!person.families) return
  var diags = {data: {}, research: {}}
  for (var spouse in person.families) {
    upboth(diags, compareSpouse(person, person.families[spouse][0]))
    for (var i=1; i<person.families[spouse].length; i++) {
      upboth(diags, compareChild(person, person.families[spouse][i]))
    }
  }
}

function checkFamily(person) {
  var kids = 0
    , spouses = 0
  for (var spouse in person.familyIds) {
    spouses += 1
    kids += person.familyIds[spouse].length - 1
  }
  var data = {}
    , research = {}
  if (kids > ((person.display && person.display.gender === 'Female') ? 15 : 30)) {
    update(data, {
      level: MINOR,
      info: {level: MINOR, text: 'Abnormally large number of children'}
    })
  }
  if (spouses > ((person.display && person.display.gender === 'Female') ? 5 : 10)) {
    update(data, {
      level: MINOR,
      info: {level: MINOR, text: 'Abnormally many marriages'}
    })
  }
  if (spouses > 0 && kids < 3 && (!person.display.age || person.display.age > 20)) {
    update(research, {
      level: kids > 0 ? MINOR : MAJOR,
      info: kids === 0 ? {level: MAJOR, text: 'No recorded children'} : {level: MINOR, text: 'Few recorded children'}
    })
  }
  if (person.display.age && person.display.age < 17 && kids) {
    update(data, {
      level: MAJOR,
      info: {level: MAJOR, text: 'Died too early to have children'}
    })
  }
  return {
    data: data,
    research: research
  }
}

