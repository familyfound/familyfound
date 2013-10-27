
module.exports = {
  tip: tip
}

function tip(person) {
  var message = '<span class="name">' + person.display.name + '</span> ' +
    '<span class="life">' + person.display.lifespan + '</span>';
  if (person.display.birthPlace &&
      person.display.deathPlace &&
      person.display.birthPlace.toLowerCase() === person.display.deathPlace.toLowerCase()) {
    message += '<br><span class="born-died"><span class="title">Born and Died:</span> ' +
      person.display.birthPlace + '</span>';
  } else {
    if (person.display.birthPlace) {
      message += '<br><span class="born"><span class="title">Born:</span> ' +
        person.display.birthPlace + '</span>';
    }
    if (person.display.deathPlace) {
      message += '<br><span class="died"><span class="title">Died:</span> ' +
        person.display.deathPlace + '</span>';
    }
  }
  var kids = 0;
  for (var spouse in person.familyIds) {
    // list starts w/ the id of the spouse
    kids += person.familyIds[spouse].length - 1;
  }
  message += '<br><span class="children">' + kids + ' ' + (kids === 1 ? 'child' : 'children') + '</span>';
  if (person.sources) {
    message += '<br><span class="title">Sources:</span> ' + (person.sources.length || 0)
  }
  if (person.status !== 'complete') message += diagsInfo(person.diagnostics)
  return message;
}

function diagsInfo(diags) {
  if (!diags) return ''
  function mp(info) {
    return '<span class="' + [null, 'minor', 'major'][info.level] + '">' + info.text + '</span>'
  }
  var text = ''
  if (diags.data && diags.data.info.length) text += '<br>' + diags.data.info.map(mp).join('<br>')
  if (diags.research && diags.research.info.length) text += '<br>' + diags.research.info.map(mp).join('<br>')
  return  text
}
