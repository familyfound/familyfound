
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

app.directive('personVitals', function () {
  return {
    replace: true,
    restrict: 'A',
    scope: {
      person: '=personVitals'
    },
    templateUrl: 'person-vitals.html'
  };
});

app.directive('personDetails', function () {
  return {
    replace: true,
    restrict: 'A',
    scope: {
      person: '=personDetails'
    },
    templateUrl: 'person-details.html',
    link: function (scope, el, attrs) {
      function numChildren(families) {
        var num = 0;
        for (var spouse in families) {
          num += families[spouse].length - 1;
        }
        return num;
      }
      scope.childClass = function (families) {
        var num = numChildren(families);
        if (num <= 1) return 'one-child';
        if (num < 4) return 'few-children';
        return '';
      };
      scope.numChildren = function (families) {
        return numChildren(families);
      };
    }
  };
});

