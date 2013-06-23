
var request = require('superagent')
  , angular = require('angularjs')
  , settings = require('settings')
  , angularSettings = require('angular-settings')
  , dialog = require('dialog')
  // , debug = require('debug')('familyfound:main')

  , oauth = require('./oauth');

function showError(err) {
  console.error(err);
  dialog('Page Error', 'Sorry, an error occurred on the page. Please refresh.')
    .addClass('error-modal')
    .modal()
    .show();
}

var app = angular.module('familyfound', ['settings']);

app.run(function () {
  oauth.check(function (err, data) {
    if (err) return showError(err);
    console.log('Logged in! Awesome', data);
  });
});
