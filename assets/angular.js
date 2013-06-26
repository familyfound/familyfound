
var routes = {}
  , request = require('superagent')
  , boxes = require('boxes')
  , promise = require('promise')
  , todo = require('todo')
  , oauth = require('./oauth');

var app = module.exports = angular.module('familyfound', ['ngResource', 'settings', 'boxes', 'todo'])
  .config(['$routeProvider', '$locationProvider', function(route, location) {
    Object.keys(routes).forEach(function (path) {
      route.when(path, routes[path]);
    });
    route.otherwise({redirectTo: '/'});
    location.html5Mode(true);
  }]).run(function($location) {
    if (window.client_route)
      $location.path('/' + window.client_route);
    console.log('run1');
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

