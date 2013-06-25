
var routes = {}
  , request = require('superagent')
  , oauth = require('./oauth');

var app = module.exports = angular.module('familyfound', ['ngResource', 'settings'])
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

function promise(getter, next) {
  var item = null, waiting = [];
  getter(function (err, res) {
    if (err) return next(err);
    item = res;
    waiting.forEach(function (fn) {
      fn(item);
    });
    next(null, item);
  });
  return function (fn) {
    if (item !== null) return fn(item);
    waiting.push(fn);
  };
}

app.factory('user', function() {
  return promise(oauth.check, function (err, data) {
    if (err) {
      return console.error('Failed to get user');
    }
    console.log('Got user!', data);
  });
});

