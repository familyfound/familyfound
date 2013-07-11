
var routes = {}
  , request = require('superagent')
  , fan = require('fan')
  , promise = require('promise')
  , todo = require('todo')
  , breadcrumb = require('breadcrumb')
  , oauth = require('./oauth');

var app = module.exports = angular.module('familyfound', ['ngResource', 'settings', 'fan', 'todo', 'breadcrumb'])
  .config(['$routeProvider', '$locationProvider', function(route, location) {
    Object.keys(routes).forEach(function (path) {
      route.when(path, routes[path]);
    });
    route.otherwise({redirectTo: '/'});
    location.html5Mode(true);
  }]).run(function($location) {
    if (location.pathname !== '/')
      $location.path(location.pathname);
  });

app.addRoute = function (path, tpl, ctrl) {
  routes[path] = {
    templateUrl: tpl,
    controller: ctrl
  };
};

require('angular-resource');

app.factory('user', function() {
  return promise(oauth.check, function (err, data) {
    if (err) {
      return console.error('Failed to get user');
    }
    console.log('Got user!', data);
  });
});

